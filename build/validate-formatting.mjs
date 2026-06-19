#!/usr/bin/env node
/**
 * validate-formatting.mjs — formatting + structural quality checks for hd-recipes.
 *   - Recipe pages must have section-anchors for ingredients + execution
 *   - Verified entries should have a sources block
 *   - Recipes should declare servings and at least 2 steps
 *   - Content pieces must contain at most MAX_EMDASH em-dashes (style constraint).
 *     Code fences are skipped. Counts run against the source markdown so this
 *     reflects authoring intent, not post-build auto-link artifacts.
 */

const MAX_EMDASH = 2;

function countEmdashesOutsideCodeFences(raw) {
  let total = 0;
  let inFence = false;
  for (const line of raw.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    // Strip inline code spans before counting
    const stripped = line.replace(/`[^`]*`/g, '');
    const matches = stripped.match(/—/g);
    if (matches) total += matches.length;
  }
  return total;
}

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createFinding, mergeFindings, reportFindings } from './lib/findings.mjs';
import { ingredientGrams } from './lib/units.mjs';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const PAGES = path.join(ROOT, 'pages');
const findings = [];
function emit(level, file, msg, extra = {}) { findings.push(createFinding({ level, category: 'formatting', file, msg, ...extra })); }

function walkPages(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walkPages(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

for (const pageFull of walkPages(PAGES)) {
  const pageRel = path.relative(ROOT, pageFull);
  const contentRel = pageRel.replace(/^pages\//, 'content/').replace(/\.html$/, '.md');
  const contentFull = path.join(ROOT, contentRel);
  if (!fs.existsSync(contentFull)) continue;
  const html = fs.readFileSync(pageFull, 'utf8');
  const rawMd = fs.readFileSync(contentFull, 'utf8');
  const { data: fm } = matter(rawMd);
  if (fm.status !== 'complete') continue;

  // Em-dash style cap. Family/explore index pages are rendered shells, not
  // editorial prose; safety pages are clinical reference material with
  // structurally em-dash-heavy lists. Both exempt.
  if (fm.type !== 'family' && fm.type !== 'safety') {
    const emdashes = countEmdashesOutsideCodeFences(rawMd);
    if (emdashes > MAX_EMDASH) {
      emit('ERROR', contentRel, `${emdashes} em-dashes — limit is ${MAX_EMDASH}`, {
        fix: 'Replace surplus em-dashes with colons, commas, periods, or parentheticals — em-dash should be reserved for the strongest pauses.',
      });
    }
  }

  // Family/explore pages are rendered shells with no authored prose sections.
  if (fm.type !== 'family' && !html.includes('class="section-anchor"')) {
    emit('WARN', contentRel, 'no section-anchor elements — TOC scroll-spy disabled', { fix: 'Add section anchors with ids' });
  }

  if (fm.type === 'recipe') {
    if (!html.includes('id="ingredients"')) emit('WARN', contentRel, 'recipe missing ingredients section', {});
    if (!html.includes('id="execution"')) emit('WARN', contentRel, 'recipe missing execution section', {});
    if (!fm.steps || fm.steps.length < 2) emit('WARN', contentRel, `recipe has ${(fm.steps || []).length} step(s) — typically need 2+`, {});

    // Homemade-alternatives check: warn when an ingredient line reads like a
    // store-bought item that has a reasonable homemade version, but the recipe
    // doesn't surface a fm.homemade_alternatives entry pointing to one.
    // Author either fills the field or, deliberately, declares why not.
    const STORE_BOUGHT_PATTERNS = [
      /\bchicken\s*(stock|broth|bouillon)\b/i,
      /\bbeef\s*(stock|broth|bouillon)\b/i,
      /\bvegetable\s*(stock|broth|bouillon)\b/i,
      /\bfish\s*(stock|broth)\b/i,
      /\bmayonnaise\b/i, /\bmayo\b/i,
      /\bricotta\b/i,
      /\bketchup\b/i,
      // Prepared mustard the condiment, NOT raw mustard seeds or mustard greens.
      // Negative lookahead on "seeds" / "greens" so "yellow mustard seeds" and
      // "Chinese mustard greens" (the vegetable) don't trip the condiment rule.
      /\b(dijon|hot|whole.?grain|chinese)\s*mustard\b(?!\s*(seeds?|greens?))/i,
      /\byellow\s*mustard\b(?!\s*(seeds?|greens?))/i,
      /\bhot\s*sauce\b/i,
      /\bbbq\s*sauce\b/i, /\bbarbecue\s*sauce\b/i,
      /\bteriyaki\s*sauce\b/i,
      /\boyster\s*sauce\b/i,
      /\bhoisin\b/i,
      /\bgochujang\b/i,
      /\bsalsa\b/i,
      /\bpesto\b/i,
      /\bcurry\s*paste\b/i,
      /\bharissa\b/i,
      /\bgaram\s*masala\b/i,
      /\b(tomato|marinara|pasta)\s*sauce\b/i,
      /\bbreadcrumbs?\b/i, /\bpanko\b/i,
      /\bgranola\b/i,
      /\bwhipped\s*cream\b/i,
      /\b(vanilla|almond|oat|coconut)\s*milk\b/i,
      /\bnut\s*butter\b/i, /\bpeanut\s*butter\b/i, /\balmond\s*butter\b/i,
      /\b(yellow|red|green)\s*curry\s*paste\b/i,
      /\bchili\s*oil\b/i,                // we have this as ingredient; recipes still benefit
      /\btahini\b/i,
      /\bhummus\b/i,
      /\bpie\s*crust\b/i, /\bpuff\s*pastry\b/i, /\bphyllo\b/i,
      /\b(corn|flour)\s*tortillas?\b/i,
      /\bfresh\s*pasta\b/i,              // dried pasta is canonical; only flag fresh
      /\b(tonnarelli|fettuccine|tagliatelle|pappardelle|ravioli|tortellini|gnocchi)\b/i,
    ];
    const declaredAlts = new Set((fm.homemade_alternatives || []).map(h => String(h.for || '').toLowerCase()));
    const exemptions = new Set((fm.homemade_exempt || []).map(s => String(s).toLowerCase()));
    const flagged = new Set();
    for (const ing of (fm.ingredients || [])) {
      // Only the item field counts as the actual ingredient; notes/prep often
      // contain negations ("not tahini") or qualifiers that aren't the ingredient.
      const itemText = ing.item || '';
      for (const re of STORE_BOUGHT_PATTERNS) {
        const m = itemText.match(re);
        if (!m) continue;
        const matchedPhrase = m[0].toLowerCase();
        // Skip if the match is preceded by a negation in the note field
        const note = (ing.note || '').toLowerCase();
        if (new RegExp(`\\bnot\\s+${matchedPhrase.replace(/\s+/g, '\\s+')}\\b`).test(note)) continue;
        // Already covered by a homemade_alternatives entry whose `for` mentions this term
        const covered = [...declaredAlts].some(a => a.includes(matchedPhrase) || matchedPhrase.includes(a));
        // Or explicitly exempted by fm.homemade_exempt — for ingredients that
        // genuinely have no reasonable home version (canned coconut milk,
        // kosher salt, fish sauce).
        const exempt = [...exemptions].some(e => e.includes(matchedPhrase) || matchedPhrase.includes(e));
        if (!covered && !exempt) flagged.add(matchedPhrase);
      }
    }
    if (flagged.size) {
      emit('WARN', contentRel,
        `store-bought ingredient(s) without homemade_alternatives: ${[...flagged].join(', ')}`,
        { fix: 'Either add fm.homemade_alternatives entries linking to recipes/<slug> pages, or note in fm.notes why a homemade version is not appropriate here.' });
    }

    // Sanity-check: every homemade_alternatives entry must point to a recipe slug
    for (const h of (fm.homemade_alternatives || [])) {
      if (!h.recipe_slug) {
        emit('ERROR', contentRel, `homemade_alternatives entry for "${h.for}" missing recipe_slug`, {});
      } else if (!/^recipes\//.test(h.recipe_slug)) {
        emit('ERROR', contentRel, `homemade_alternatives recipe_slug "${h.recipe_slug}" must start with 'recipes/'`, {});
      }
    }

    // Step measurements: every step that names an ingredient by its `item:`
    // word should also include a measurement. Bake-in measurements (rather
    // than expecting the cook to scroll back to the ingredients list) are a
    // hand-soiled-on-the-counter accessibility issue. Authors who reference
    // an ingredient generically ("season with salt", "add the butter")
    // should specify "season with 6 g / 1 tsp salt", "add the 60 g / 4 tbsp
    // butter".
    //
    // Heuristic: tokenize each step. If the step text mentions an ingredient
    // (matched by the first word of its `item:` field, case-insensitive)
    // AND does NOT contain any number followed by a unit (g/kg/ml/l/oz/lb/
    // tsp/tbsp/cup) or unicode fraction + unit, flag it.
    const MEAS_TOKEN_STEP = /(?:\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(?:g|kg|mg|ml|l|oz|lb|tsp|tbsp|cups?|tablespoons?|teaspoons?|grams?|kilo(?:gram)?s?|ounces?|pounds?|sticks?|cans?|bottles?|cloves?|pods?|stalks?|sprigs?|bunch(?:es)?|leaves?|pinch(?:es)?)\b/i;
    // Drop preparation adjectives so "fresh ginger" → "ginger" and
    // "kosher salt" → "salt". "Baking" stays because "baking powder" /
    // "baking soda" need both words to land — we match by phrase below.
    const PREP_ADJ = new Set(['fresh', 'ground', 'dried', 'whole', 'crushed', 'minced', 'diced', 'chopped', 'sliced', 'grated', 'cracked', 'large', 'small', 'medium', 'thick', 'thin', 'unsalted', 'salted', 'cold', 'cooked', 'raw', 'extra', 'finely', 'coarsely', 'kosher', 'sea', 'fine', 'light', 'dark', 'hot', 'warm', 'room-temperature']);
    const stepIngTokens = [];
    for (const ing of (fm.ingredients || [])) {
      if (typeof ing.qty !== 'number') continue;  // "to taste" rows skip
      if (ing.derive_from) continue;              // covered by parent pack
      const item = (ing.item || '').toLowerCase();
      const tokens = item.split(/[\s,()]+/).filter(Boolean);
      const meaningful = tokens.filter(t => !PREP_ADJ.has(t));
      if (!meaningful.length) continue;
      // Match the 1-2 word phrase that uniquely identifies this ingredient.
      // Prefer 2 words for multi-noun foods ("soy sauce", "baking powder")
      // so a step talking about a generic "baking sheet" or "soy" doesn't
      // false-positive.
      const phrase = meaningful.slice(0, Math.min(2, meaningful.length)).join(' ');
      if (phrase.length < 3) continue;
      stepIngTokens.push({ phrase, item: ing.item, qty: ing.qty, unit: ing.unit });
    }
    // Piece-counted patterns: "12 eggs", "2 cinnamon sticks", "3 garlic
    // cloves" — a number + 0–3 modifying words + the ingredient's phrase —
    // also count as measurements. Without this the validator would flag
    // "Lay the 12 large eggs in a pan" because "eggs" alone isn't in the
    // standard unit list.
    const phrasePiecePat = stepIngTokens.length
      ? new RegExp(
          `\\b\\d+(?:\\s+[\\w-]+){0,4}\\s+(?:` +
          stepIngTokens.map(t => t.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
          `)\\b`, 'i')
      : null;
    for (let i = 0; i < (fm.steps || []).length; i++) {
      const step = fm.steps[i];
      const text = (step.text || '');
      const lower = text.toLowerCase();
      const hasMeas = MEAS_TOKEN_STEP.test(text) || (phrasePiecePat && phrasePiecePat.test(text));
      if (hasMeas) continue;
      const hit = stepIngTokens.find(t => {
        const escaped = t.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`).test(lower);
      });
      if (hit) {
        emit('WARN', contentRel,
          `step ${i + 1} names "${hit.phrase}" but has no measurement — bake the qty into the step text`,
          { fix: `Inline the quantity, e.g. "${hit.qty}${hit.unit ? ' ' + hit.unit : ''} ${hit.item}" or its imperial equivalent. Cooks shouldn't have to scroll back to the ingredient list mid-cook.` });
      }
    }

    // Scaling-coverage (INFO, report-only): the build wraps clean "N unit" and
    // "N metric / N imperial" prose quantities in <span data-step-qty> so they
    // rescale with servings. Two specific shapes it provably CANNOT wrap stay
    // frozen and then contradict the ingredient table at 2×. Rather than guess
    // a count delta (noisy), we report the exact offending substrings so a
    // future content pass can act on them precisely:
    //   (a) ranges — "60 to 80 g", "3 to 4 g cayenne" — the wrapper only claims
    //       single quantities, so the range endpoints never move.
    //   (b) yield-coupled splits — "divide into 4", "form into 12" — the count
    //       IS the serving math, so it must move with servings, but the wrapper
    //       can't touch a bare integer. (Generic "N <noun>" is left alone: most
    //       such counts — 2 bay leaves, a 3:1 ratio — are intentionally fixed.)
    {
      const proseBlocks = [
        ...(fm.steps || []).map(s => s.text || ''),
        ...(typeof fm.notes === 'string' ? fm.notes.split('\n\n') : []),
      ];
      const NUM = `(?:\\d+(?:\\.\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])`;
      const UNIT = `(?:g|kg|mg|ml|l|oz|lb|tsp|tbsp|cups?|tablespoons?|teaspoons?|sticks?|pounds?)`;
      // "60 to 80 g" / "3-4 g" / "15 to 20 ml" — a numeric range carrying a unit.
      const rangeRe = new RegExp(`(?<![\\w.])${NUM}\\s*(?:to|–|—|-)\\s*${NUM}\\s*${UNIT}\\b`, 'gi');
      // Yield-coupled split: "divide/portion/form/shape ... into N".
      const divideRe = /\b(?:divide|portion|form|shape|split|roll|scoop|pipe)\s+(?:it\s+|the\s+[\w-]+\s+|them\s+)*into\s+([2-9]|1\d|20)\b/gi;
      const ranges = new Set();
      const splits = new Set();
      for (const block of proseBlocks) {
        for (const m of block.matchAll(rangeRe)) ranges.add(m[0].trim().replace(/\s+/g, ' '));
        for (const m of block.matchAll(divideRe)) splits.add(`into ${m[1]}`);
      }
      if (ranges.size) {
        const sample = [...ranges].slice(0, 5).join('", "');
        emit('INFO', contentRel,
          `scaling: ${ranges.size} quantity range(s) in prose stay fixed when servings change — e.g. "${sample}"`,
          { fix: 'Ranges are not wrapped for scaling. If the range is a true measurement, pick a single scalable value ("70 g") and move the tolerance to a note; if it is guidance ("to taste, ~3 to 4 g"), leave it but know it will not move.' });
      }
      if (splits.size) {
        const sample = [...splits].slice(0, 5).join('", "');
        emit('INFO', contentRel,
          `scaling: ${splits.size} yield-coupled split(s) ("${sample}") use a fixed count that will not move with servings`,
          { fix: 'A "divide into N" count should track servings. Phrase it relative to yield ("one portion per serving") or accept that the piece count stays fixed while pieces get bigger/smaller when scaled.' });
      }
    }

    // Pack/derive accounting: every derive_from must reference an existing
    // pack id, and the sum of derived grams must not exceed the pack's total
    // grams (with a 5% tolerance for cling/loss). Catches math mistakes when
    // an author splits a can across phases by hand.
    const idMap = new Map();
    for (const ing of (fm.ingredients || [])) {
      if (ing.id) idMap.set(ing.id, ing);
    }
    const derivedByPack = new Map();
    for (const ing of (fm.ingredients || [])) {
      if (!ing.derive_from) continue;
      const parent = idMap.get(ing.derive_from);
      if (!parent) {
        emit('ERROR', contentRel,
          `ingredient "${ing.item}" derive_from: "${ing.derive_from}" — no ingredient with that id in this recipe`,
          { fix: 'Set the parent row\'s id field, or fix the derive_from spelling.' });
        continue;
      }
      if (!derivedByPack.has(ing.derive_from)) derivedByPack.set(ing.derive_from, []);
      derivedByPack.get(ing.derive_from).push(ing);
    }
    for (const [packId, derived] of derivedByPack) {
      const parent = idMap.get(packId);
      if (!parent) continue;
      // Use the same density resolution rule the build uses: per-line override
      // wins, then we'd consult the ingredient page (skipped here — close
      // enough for accounting). Density 1.0 default.
      const density = parent.density_g_per_ml ?? 1;
      const parentGrams = ingredientGrams(parent, density, parent.grams_per_unit ?? null);
      if (parentGrams == null) continue;
      let derivedTotal = 0;
      for (const d of derived) {
        const g = ingredientGrams(d, d.density_g_per_ml ?? density, d.grams_per_unit ?? null);
        if (g == null) continue;
        derivedTotal += g;
      }
      if (derivedTotal > parentGrams * 1.05) {
        emit('ERROR', contentRel,
          `pack "${packId}" overflow: derived rows total ${Math.round(derivedTotal)}g but pack holds only ${Math.round(parentGrams)}g`,
          { fix: 'Either bump the pack qty (buy another can/bottle) or trim the derived row quantities.' });
      } else if (derivedTotal < parentGrams * 0.6) {
        emit('WARN', contentRel,
          `pack "${packId}" under-used: derived rows total ${Math.round(derivedTotal)}g out of ${Math.round(parentGrams)}g — ${Math.round(parentGrams - derivedTotal)}g left unaccounted`,
          { fix: 'If the recipe really uses less than 60% of the pack, reduce pack qty so the cook does not buy more than they need.' });
      }
    }
  }

  if (fm.content_review === 'verified') {
    const hasSources = /class="sources"/.test(html) || (fm.content_sources && fm.content_sources.length) || (fm.source && fm.source.name);
    if (!hasSources) emit('WARN', contentRel, 'content_review:verified but no sources', { fix: 'Add fm.source or fm.content_sources' });
  }

  // Ingredient-page substitution framing: 2+ rows whose `for:` is a bare repeat
  // of the title (no parenthetical use case, no extra qualifiers) means each
  // row hangs on no scenario. The reader can't tell why one swap belongs in
  // row A and another in row B. Each `for:` should name a use case — heat
  // regime, application class, role in a dish. See templates/_drafting/INGREDIENT.md.
  // A row counts as use-case-framed if either it has a parenthetical
  // ("butter (browning)") or its non-parenthesized text differs from the title
  // by more than the bare ingredient name.
  if (fm.type === 'ingredient' && Array.isArray(fm.substitutions) && fm.substitutions.length >= 2) {
    const titleNorm = String(fm.title || '').trim().toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    const isBareRow = (s) => {
      const f = String(s.for || '').trim().toLowerCase();
      const hasParenthetical = /\(.+\)/.test(f);
      if (hasParenthetical) return false;
      return f === titleNorm;
    };
    const allBare = fm.substitutions.every(isBareRow);
    if (allBare && titleNorm) {
      emit('WARN', contentRel,
        `ingredient has ${fm.substitutions.length} substitution rows but every "for:" is just the ingredient name with no use case`,
        { fix: 'Frame each row by use case: heat regime, application (cooking vs finishing), role (whipping vs sauce). See templates/_drafting/INGREDIENT.md.' });
    }
  }
}

reportFindings('validate-formatting', findings);
mergeFindings(ROOT, findings, ['formatting']);
process.exit(findings.filter(f => f.level === 'ERROR').length > 0 ? 1 : 0);
