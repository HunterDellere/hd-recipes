#!/usr/bin/env node
/**
 * validate-safety.mjs — flags temperature calls that sit at or below USDA
 * published-safe instantaneous targets without a safety_notes[] annotation
 * pointing into content/safety/.
 *
 * Scope: recipe and technique pages. The scanner walks each page's source
 * markdown (frontmatter steps[].text + about/notes/modifications), looks
 * for a protein keyword within ~80 characters of an internal-temperature
 * reading (e.g. "chicken at 145°F", "pork tenderloin to 145°F"), and:
 *
 *   1. Compares the temperature to USDA_THRESHOLD_F for that protein.
 *   2. If the call is below the threshold AND the page has no safety_notes
 *      entry whose `for:` text references the same protein and temperature
 *      band, emit an ERROR finding.
 *   3. If the call sits AT the threshold, emit no finding (the recipe is
 *      published-safe).
 *
 * The validator also emits a WARN for any safety_notes[] ref pointing at a
 * content/safety/ slug that does not exist.
 *
 * Findings flow through lib/findings.mjs into the admin dashboard via
 * data/_admin/findings.json, same surface as relations/search/formatting.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createFinding, mergeFindings, reportFindings } from './lib/findings.mjs';
import { USDA_THRESHOLD_F, PROTEIN_KEYWORDS } from './lib/safety-thresholds.js';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const CONTENT = path.join(ROOT, 'content');

const findings = [];
function emit(level, file, msg, extra = {}) {
  findings.push(createFinding({ level, category: 'safety', file, msg, ...extra }));
}

function walkContent(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walkContent(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

// Collect every prose string from a recipe or technique frontmatter that
// could plausibly contain a temperature-and-protein pair. Step text is the
// dominant case; about, notes, modifications, and homemade_alternatives all
// occasionally carry temperature references.
function harvestProseStrings(fm) {
  const strs = [];
  if (typeof fm.about === 'string') strs.push(fm.about);
  if (typeof fm.notes === 'string') strs.push(fm.notes);
  if (typeof fm.desc === 'string') strs.push(fm.desc);
  for (const s of (fm.steps || [])) if (s && typeof s.text === 'string') strs.push(s.text);
  for (const m of (fm.modifications || [])) {
    if (m && typeof m.how === 'string') strs.push(m.how);
    if (m && typeof m.to === 'string')  strs.push(m.to);
  }
  for (const h of (fm.homemade_alternatives || [])) {
    if (h && typeof h.why === 'string') strs.push(h.why);
  }
  if (typeof fm.when_to_use === 'string') strs.push(fm.when_to_use);
  if (typeof fm.failure_modes === 'string') strs.push(fm.failure_modes);
  if (typeof fm.practice_notes === 'string') strs.push(fm.practice_notes);
  return strs;
}

// Match `145°F`, `145 °F`, `145F`, `145 F` (Celsius variants ignored — the
// USDA tables are F-native and most recipes in this library write °F first
// even when both units are given). Note: `\bF` does NOT trigger between a
// digit and `F` because both are word characters; we use an explicit-form
// alternation that allows the F to follow either a degree symbol or
// directly after digits, with a trailing non-word lookahead so we don't
// match the start of a longer word like "Fennel" or "FYI".
const TEMP_F_RE = /(\d{2,3})\s*°?\s*F(?![A-Za-z])/g;

// Build a single keyword-alternation regex. Phrases with spaces are escaped
// and joined with literal spaces; alphabetics get word boundaries via the
// surrounding lookups in scan().
const PROTEIN_PATTERN = (() => {
  const keys = Object.keys(PROTEIN_KEYWORDS).sort((a, b) => b.length - a.length);
  const escaped = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
})();

const NEAR_DISTANCE = 120; // chars between protein hit and temp hit (same paragraph window)

/**
 * "Internal-temperature" cue words — a temperature reading near one of these
 * is much more likely to be a meat-internal call than an oven, oil, or
 * water-bath temperature. Used to distinguish "pull at 145°F" (internal,
 * meaningful) from "350°F oven" (cooking environment, not the safety axis).
 */
const INTERNAL_CUES = [
  'internal', 'pull', 'pulls', 'pulled', 'doneness', 'carryover',
  'rest', 'rests', 'resting', 'thickest', 'reads', 'hits', 'register',
  'meat', 'breast', 'thigh', 'tenderloin', 'roast',
];
const INTERNAL_CUE_RE = new RegExp(`\\b(${INTERNAL_CUES.join('|')})\\b`, 'i');

/**
 * Determine the "page protein context" — the proteins this page is *about*
 * — by reading the frontmatter title, desc, tags, and cuisine. A recipe
 * tagged `chicken` is about chicken even if a step paragraph happens to
 * say "Cook to 145°F" without naming the protein in that paragraph.
 */
function pageProteinContext(fm) {
  const blob = [
    fm.title || '',
    fm.desc || '',
    (fm.tags || []).join(' '),
    fm.cuisine || '',
  ].join(' ').toLowerCase();
  const protSet = new Set();
  for (const m of blob.matchAll(PROTEIN_PATTERN)) {
    protSet.add(m[1].toLowerCase());
  }
  return protSet;
}

/**
 * For one prose string, find every (protein-keyword, °F number) pair where
 * the two hits sit within NEAR_DISTANCE characters. If the temp has an
 * internal-cue word nearby and there's a page-level protein context, also
 * flag bare temperature mentions even without a same-paragraph protein.
 */
function scan(str, pageProteins) {
  const proteinHits = [];
  for (const m of str.matchAll(PROTEIN_PATTERN)) {
    proteinHits.push({ index: m.index, word: m[1].toLowerCase() });
  }
  const tempHits = [];
  for (const m of str.matchAll(TEMP_F_RE)) {
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n) || n < 90 || n > 220) continue; // plausible meat-internal range
    tempHits.push({ index: m.index, tempF: n, matchLen: m[0].length });
  }
  if (!tempHits.length) return [];

  const out = [];
  for (const t of tempHits) {
    // Ignore the temperature if it doesn't have an internal-cue word in a
    // ±60-char window. This drops "350°F oven" and "190°F simmer" while
    // keeping "pull at 145°F internal" and "rest until 160°F."
    const ctx = str.slice(Math.max(0, t.index - 60), Math.min(str.length, t.index + 60));
    if (!INTERNAL_CUE_RE.test(ctx)) continue;

    // Prefer a protein keyword in the same window.
    let nearest = null;
    let nearestDist = Infinity;
    for (const p of proteinHits) {
      const d = Math.abs(p.index - t.index);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    let proteinWord = null;
    if (nearest && nearestDist <= NEAR_DISTANCE) {
      proteinWord = nearest.word;
    } else if (pageProteins && pageProteins.size) {
      // Fall back to page-level protein context — the page is about meat,
      // there's a "pull at <X>°F" call, treat it as that protein.
      proteinWord = [...pageProteins][0];
    } else {
      continue;
    }

    const thresholdKey = PROTEIN_KEYWORDS[proteinWord];
    const threshold = USDA_THRESHOLD_F[thresholdKey];
    if (threshold == null) continue;
    const start = Math.max(0, t.index - 40);
    const end = Math.min(str.length, t.index + 40);
    out.push({
      protein: proteinWord,
      thresholdKey,
      threshold,
      tempF: t.tempF,
      snippet: str.slice(start, end).replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

/**
 * Decide whether a safety_notes[] entry on the page covers a given hit.
 * Match heuristic: the note's `for:` field mentions either the protein
 * keyword OR the temperature number. This is generous on purpose — the
 * cook is the canonical authority on whether the safety_notes entry is
 * the right one; the validator just confirms one exists.
 */
function isCovered(hit, safetyNotes) {
  if (!Array.isArray(safetyNotes) || !safetyNotes.length) return false;
  for (const n of safetyNotes) {
    const forText = String(n && n.for || '').toLowerCase();
    if (!forText) continue;
    const proteinMatch = forText.includes(hit.protein) ||
                         forText.includes(hit.thresholdKey);
    const tempMatch = forText.includes(String(hit.tempF));
    if (proteinMatch || tempMatch) return true;
  }
  return false;
}

// Build the set of available safety page slugs so we can flag stale refs.
const safetySlugs = new Set();
for (const f of walkContent(path.join(CONTENT, 'safety'))) {
  safetySlugs.add(path.basename(f, '.md'));
}

const files = [
  ...walkContent(path.join(CONTENT, 'recipes')),
  ...walkContent(path.join(CONTENT, 'techniques')),
];

let scanned = 0;
let flagged = 0;

for (const filePath of files) {
  const rel = path.relative(ROOT, filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data: fm } = matter(raw);
  if (fm.status !== 'complete') continue;

  // Stale-ref check on safety_notes[].
  for (const n of (fm.safety_notes || [])) {
    if (!n || !n.ref) continue;
    const slugOnly = String(n.ref).split('#')[0].replace(/^safety\//, '');
    if (!safetySlugs.has(slugOnly)) {
      emit('ERROR', rel,
        `safety_notes ref "${n.ref}" — no such page in content/safety/`,
        { fix: `Create content/safety/${slugOnly}.md or update the ref to an existing safety slug.` });
    }
  }

  const safetyNotes = fm.safety_notes || [];
  scanned++;

  const pageProteins = pageProteinContext(fm);

  // Aggregate hits by (protein, tempF) so a recipe that mentions "chicken
  // at 145°F" four times in the same page produces one finding.
  const seen = new Map();
  for (const str of harvestProseStrings(fm)) {
    for (const hit of scan(str, pageProteins)) {
      // Only flag below-threshold calls. At-or-above is USDA-published-safe
      // and needs no annotation.
      if (hit.tempF >= hit.threshold) continue;
      if (isCovered(hit, safetyNotes)) continue;
      const key = `${hit.thresholdKey}:${hit.tempF}`;
      if (!seen.has(key)) seen.set(key, hit);
    }
  }
  for (const hit of seen.values()) {
    flagged++;
    emit('ERROR', rel,
      `${hit.protein} at ${hit.tempF}°F is below USDA published-safe (${hit.threshold}°F for ${hit.thresholdKey}) and has no safety_notes annotation`,
      {
        fix: `Add safety_notes[] with for: '<the call>', ref: 'safety/meat-doneness#${hit.thresholdKey}', why: '<pasteurization or technique justification>'. See content/safety/meat-doneness.md.`,
        context: hit.snippet,
      });
  }
}

mergeFindings(ROOT, findings, ['safety']);

reportFindings('validate-safety', findings);

const errorCount = findings.filter(f => f.level === 'ERROR').length;
console.log(`\nvalidate-safety: ${scanned} pages scanned, ${flagged} flagged.`);
process.exit(errorCount > 0 ? 1 : 0);
