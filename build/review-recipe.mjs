/**
 * review-recipe.mjs — assemble a culinary-review packet for a recipe.
 *
 * The validators in this repo catch structural defects (schema, links,
 * measurements, scaling). They cannot judge the thing Hunter actually cares
 * about: whether a recipe is *delicious and authentic* — seasoning levels,
 * the ideal technique for the dish, ingredient pairing, and whether "amazing"
 * has been made to feel "effortless" rather than over-engineered.
 *
 * That judgment needs a knowledgeable reader, not a regex. This script does the
 * deterministic half: it gathers everything that reader needs into one packet —
 * the recipe, the matching cuisine reference (its pantry / technique / Western-
 * drift sections), and a fixed rubric — and prints it. A reviewing agent (or a
 * human) reads the packet and returns a prioritized findings list.
 *
 * Usage:
 *   node build/review-recipe.mjs <slug>            # one recipe → packet on stdout
 *   node build/review-recipe.mjs <slug> --json     # machine-readable packet
 *   node build/review-recipe.mjs --list-uncovered  # recipes whose cuisine maps to no reference
 *
 * It never edits content and never hits the network.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECIPES = path.join(ROOT, 'content', 'recipes');
const REFS = path.join(ROOT, 'content', '_reference', 'cuisines');

// Map a recipe's free-text `cuisine:` to a continental reference file. Keys are
// matched as case-insensitive substrings of the cuisine string, longest first,
// so "Filipino-American" resolves to southeast-asian before "American" can grab
// it. Add a key here when a new cuisine label appears (see --list-uncovered).
const CUISINE_TO_REF = [
  // East Asian
  ['chinese', 'east-asian'], ['sichuan', 'east-asian'], ['cantonese', 'east-asian'],
  ['taiwanese', 'east-asian'], ['japanese', 'east-asian'], ['korean', 'east-asian'],
  ['hong kong', 'east-asian'],
  // Southeast Asian
  ['thai', 'southeast-asian'], ['vietnamese', 'southeast-asian'], ['filipino', 'southeast-asian'],
  ['indonesian', 'southeast-asian'], ['malaysian', 'southeast-asian'], ['singaporean', 'southeast-asian'],
  ['cambodian', 'southeast-asian'], ['lao', 'southeast-asian'], ['burmese', 'southeast-asian'],
  ['southeast asian', 'southeast-asian'],
  // South Asian
  ['indian', 'south-asian'], ['pakistani', 'south-asian'], ['bangladeshi', 'south-asian'],
  ['sri lankan', 'south-asian'], ['nepali', 'south-asian'],
  ['goan', 'south-asian'], ['kashmiri', 'south-asian'],
  // Mediterranean European
  ['italian', 'mediterranean-european'], ['sicilian', 'mediterranean-european'],
  ['spanish', 'mediterranean-european'], ['portuguese', 'mediterranean-european'],
  ['greek', 'mediterranean-european'], ['mediterranean', 'mediterranean-european'],
  ['catalan', 'mediterranean-european'],
  // Northern / Central European
  ['french', 'northern-central-european'], ['german', 'northern-central-european'],
  ['austrian', 'northern-central-european'], ['british', 'northern-central-european'],
  ['english', 'northern-central-european'], ['irish', 'northern-central-european'],
  ['nordic', 'northern-central-european'], ['polish', 'northern-central-european'],
  ['hungarian', 'northern-central-european'], ['scottish', 'northern-central-european'],
  // Latin American
  ['mexican', 'latin-american'], ['peruvian', 'latin-american'], ['cuban', 'latin-american'],
  ['brazilian', 'latin-american'], ['argentine', 'latin-american'], ['colombian', 'latin-american'],
  ['caribbean', 'latin-american'], ['puerto rican', 'latin-american'],
  ['jamaican', 'latin-american'], ['haitian', 'latin-american'],
  // Middle Eastern / North African
  ['levantine', 'middle-eastern-north-african'], ['lebanese', 'middle-eastern-north-african'],
  ['persian', 'middle-eastern-north-african'], ['iranian', 'middle-eastern-north-african'],
  ['turkish', 'middle-eastern-north-african'], ['moroccan', 'middle-eastern-north-african'],
  ['israeli', 'middle-eastern-north-african'], ['syrian', 'middle-eastern-north-african'],
  ['jordanian', 'middle-eastern-north-african'], ['tunisian', 'middle-eastern-north-african'],
  // Central Asian / Afghan (no dedicated ref yet; South Asian is closest for basmati rice cookery and warm-spice work)
  ['afghan', 'south-asian'], ['afghani', 'south-asian'],
  ['uzbek', 'south-asian'], ['tajik', 'south-asian'], ['central asian', 'south-asian'],
  ['hyderabadi', 'south-asian'], ['deccan', 'south-asian'],
  // West / Sub-Saharan African
  ['nigerian', 'west-and-sub-saharan-african'], ['ethiopian', 'west-and-sub-saharan-african'],
  ['senegalese', 'west-and-sub-saharan-african'], ['ghanaian', 'west-and-sub-saharan-african'],
  ['west african', 'west-and-sub-saharan-african'],
  // North American (use the dedicated note, then fall back)
  ['cajun', 'north-american'], ['creole', 'north-american'], ['southern', 'north-american'],
  ['american', 'north-american'],
].sort((a, b) => b[0].length - a[0].length);

function refForCuisine(cuisine) {
  const c = String(cuisine || '').toLowerCase();
  if (!c) return null;
  for (const [needle, ref] of CUISINE_TO_REF) {
    if (c.includes(needle)) return ref;
  }
  return null;
}

// Pull a named "## Section" (and its sub-sections) out of a reference doc. We
// only want the sections that bear on a culinary review — pantry, technique,
// and the Western-drift warnings — not the whole 200-line briefing.
function extractRefSections(refBody, headingNeedles) {
  const lines = refBody.split('\n');
  const out = [];
  let capturing = false;
  let captureLevel = 0;
  for (const line of lines) {
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const title = h[2].toLowerCase();
      if (capturing && level <= captureLevel) capturing = false;
      if (!capturing && headingNeedles.some(n => title.includes(n))) {
        capturing = true;
        captureLevel = level;
      }
    }
    if (capturing) out.push(line);
  }
  return out.join('\n').trim();
}

const RUBRIC = `## Review rubric — judge the recipe on these axes, hardest first

Goal: make the dish consistently delicious and *recognizably itself*, while
keeping the effort honest — amazing should feel effortless, not over-built.
Report ONLY concrete, actionable findings. No praise padding. For each finding
give: axis, severity (high/med/low), the specific line or quantity at fault,
and the fix.

1. SEASONING LEVELS — Is the salt in the right range for the weight of food
   (~1% by weight for most savory dishes, dry-brines lower)? Is there enough
   acid, and at the right moment (finishing vs cooking)? Enough umami depth?
   Is chili/spice heat plausible for the named dish, not timid or punishing?
   Flag specific quantities that read wrong.

2. IDEAL TECHNIQUE — Is the method the one that actually makes this dish great,
   or a generic substitute? (e.g. cracking coconut cream for Thai curry vs
   dumping everything in a pot; pounding a paste vs blending; dry-brine vs
   surface salt.) Cross-check against the cuisine reference's "defining
   techniques". Flag where a better-known technique is missing or a wrong one
   is used.

3. INGREDIENT PAIRING & AUTHENTICITY — Do the ingredients belong together for
   this dish? Cross-check the reference's "common Western drift" list for the
   classic substitution errors (galangal→ginger, palm→brown sugar, lite coconut
   milk, etc.). Flag drift and missing signature ingredients.

4. EFFORTLESS-AMAZING BALANCE — Is any step over-engineered for the payoff
   (sous-vide where a sear wins; four optional finishes with no canonical pick;
   a 4-hour cook that a 40-minute one matches)? Conversely, is it under-built
   in a way that costs the result? Recommend the simplest version that still
   tastes amazing.

5. COHERENCE — Do the steps and ingredient list agree (every ingredient used,
   every step has what it needs)? Is the yield/serving math sane?`;

function buildPacket(slug) {
  const file = path.join(RECIPES, `${slug}.md`);
  if (!fs.existsSync(file)) throw new Error(`No recipe at content/recipes/${slug}.md`);
  const raw = fs.readFileSync(file, 'utf8');
  const { data: fm } = matter(raw);
  const refKey = refForCuisine(fm.cuisine);
  let refBlock = '';
  if (refKey) {
    const refPath = path.join(REFS, `${refKey}.md`);
    if (fs.existsSync(refPath)) {
      const { content: refBody } = matter(fs.readFileSync(refPath, 'utf8'));
      const sections = extractRefSections(refBody, ['pantry', 'technique', 'drift', 'what ']);
      refBlock = `## Cuisine reference — ${refKey} (matched from cuisine: "${fm.cuisine}")\n\n${sections || refBody}`;
    }
  }
  if (!refBlock) {
    refBlock = `## Cuisine reference — NONE matched for cuisine: "${fm.cuisine || '(empty)'}"\n\n` +
      `No continental reference mapped. Review on general culinary first principles, ` +
      `and note that this cuisine may warrant its own reference file.`;
  }
  return { fm, raw, refKey, refBlock };
}

function renderPacket(slug) {
  const { raw, refBlock } = buildPacket(slug);
  return [
    `# Culinary review packet — recipes/${slug}`,
    '',
    RUBRIC,
    '',
    '---',
    '',
    '## The recipe (source markdown)',
    '',
    '```markdown',
    raw.trim(),
    '```',
    '',
    '---',
    '',
    refBlock,
  ].join('\n');
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--list-uncovered')) {
  const files = fs.readdirSync(RECIPES).filter(f => f.endsWith('.md'));
  const uncovered = new Map();
  for (const f of files) {
    const { data: fm } = matter(fs.readFileSync(path.join(RECIPES, f), 'utf8'));
    if (fm.type && fm.type !== 'recipe') continue;
    if (!refForCuisine(fm.cuisine)) {
      const key = fm.cuisine || '(empty)';
      uncovered.set(key, (uncovered.get(key) || 0) + 1);
    }
  }
  if (!uncovered.size) {
    console.log('All recipe cuisines map to a reference.');
  } else {
    console.log('Recipe cuisines with no mapped reference (add to CUISINE_TO_REF):');
    for (const [k, n] of [...uncovered.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n.toString().padStart(3)}  ${k}`);
    }
  }
  process.exit(0);
}

const slug = args.find(a => !a.startsWith('--'));
if (!slug) {
  console.error('Usage: node build/review-recipe.mjs <slug> [--json] | --list-uncovered');
  process.exit(1);
}
const cleanSlug = slug.replace(/^content\/recipes\//, '').replace(/\.md$/, '');

if (args.includes('--json')) {
  const { fm, refKey, refBlock } = buildPacket(cleanSlug);
  console.log(JSON.stringify({ slug: cleanSlug, cuisine: fm.cuisine || '', refKey, rubric: RUBRIC, reference: refBlock }, null, 2));
} else {
  console.log(renderPacket(cleanSlug));
}
