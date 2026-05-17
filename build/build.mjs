#!/usr/bin/env node
/**
 * build.mjs — hd-recipes build system
 *
 * Reads:  content/<category>/<slug>.md
 * Writes: pages/<category>/<slug>.html
 *         data/entries.json
 *         data/search-index.json
 *         data/recent.json
 *         data/nutrition.json (per-recipe nutrition snapshot)
 *         data/featured.json
 *         og/<category>/<slug>.svg
 *         sitemap.xml, robots.txt, feed.xml, manifest.webmanifest
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';
import matter from 'gray-matter';
import { validateEntry } from './lib/validate.mjs';
import { buildSearchIndex } from './lib/search-index.mjs';
import { buildRelations, buildAdjacency, renderRelatedHtml, renderAdjacencyHtml } from './lib/relations.mjs';
import { buildLinkMap, autoLinkBody, buildPageFooter, renderSourcesHtml, ensureMainContentId } from './lib/augment.mjs';
import { renderOgSvg, categoryFaviconDataUri } from './lib/og.mjs';
import {
  renderRecipeBody, renderIngredientBody, renderTechniqueBody, renderHubBody,
  renderEquipmentBody, renderCuisineBody, renderTagBody,
  renderSafetyBody, renderSafetyNotes,
} from './lib/recipe-render.mjs';
import { renderFamilyContent, renderFamilyCrosslinks, familyCardArt } from './lib/family-render.mjs';
import { loadCache, computeRecipeNutrition, roundNutrition } from './lib/nutrition.mjs';
import { computeReverseLinks, enrichEntry } from './lib/cards.mjs';
import { computePairings } from './lib/pairings.mjs';
import { buildRecipeImages } from './lib/images.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const LAYOUT = readFileSync(join(ROOT, 'templates/_layout.html'), 'utf8');

const SITE_URL = 'https://hunterdellere.github.io/hd-recipes';
const SITE_NAME = 'hd · recipes';

const CATEGORY_LABELS = {
  recipes: 'Recipes', ingredients: 'Ingredients', techniques: 'Techniques',
  cuisines: 'Cuisines', equipment: 'Equipment', hubs: 'Collections',
  safety: 'Safety',
};

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function walk(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) results.push(...walk(full));
    else if (name.endsWith('.md') && !name.startsWith('_')) results.push(full);
  }
  return results;
}

function buildJsonLd(fm, slug, category) {
  if (fm.status !== 'complete') return '';
  const url = `${SITE_URL}/pages/${category}/${slug}.html`;
  const description = fm.metaDesc || fm.desc || '';
  const author = { '@type': 'Person', name: 'Hunter Dellere' };

  let data;
  if (fm.type === 'recipe') {
    const ingredients = (fm.ingredients || []).map(i => {
      const qty = i.qty != null ? `${i.qty}${i.unit ? ' ' + i.unit : ''} ` : '';
      return `${qty}${i.item}${i.prep ? ', ' + i.prep : ''}`;
    });
    const time = fm.time || {};
    data = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: fm.title || slug,
      description,
      url,
      author,
      datePublished: fm.updated,
      recipeYield: fm.servings ? `${fm.servings} servings` : undefined,
      recipeCuisine: fm.cuisine,
      recipeCategory: fm.course,
      keywords: (fm.tags || []).join(', ') || undefined,
      prepTime: time.prep_min ? `PT${time.prep_min}M` : undefined,
      cookTime: time.cook_min ? `PT${time.cook_min}M` : undefined,
      totalTime: time.total_min ? `PT${time.total_min}M` : undefined,
      recipeIngredient: ingredients,
      recipeInstructions: (fm.steps || []).map(s => ({ '@type': 'HowToStep', text: s.text })),
    };
  } else {
    data = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: fm.title || slug,
      description, url, author,
      datePublished: fm.updated, dateModified: fm.updated,
      publisher: { '@type': 'Organization', name: SITE_NAME },
      mainEntityOfPage: url,
    };
  }
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS[category] || category, item: `${SITE_URL}/#cat-${category}` },
      { '@type': 'ListItem', position: 3, name: fm.title || slug, item: url },
    ],
  };
  return [
    `<script type="application/ld+json">${JSON.stringify(data)}</script>`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`,
  ].join('\n');
}

function buildOgTags(fm, slug, category, photoOg) {
  if (fm.status !== 'complete') return '';
  const url = `${SITE_URL}/pages/${category}/${slug}.html`;
  const ogImg = photoOg || `${SITE_URL}/og/${category}/${slug}.svg`;
  const title = fm.pageTitle || fm.title || slug;
  const desc = fm.metaDesc || fm.desc || '';
  return [
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${ogImg}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(desc)}">`,
    `<meta name="twitter:image" content="${ogImg}">`,
  ].join('\n');
}

function buildMetaComment(fm) {
  const obj = {};
  for (const k of ['type','category','title','status','tags','cuisine','course','difficulty']) {
    if (fm[k] !== undefined) obj[k] = fm[k];
  }
  return JSON.stringify(obj);
}

function renderPage(fm, body, slug, category) {
  const metaComment = buildMetaComment(fm);
  const pageTitle = fm.pageTitle || fm.title || slug;
  const metaDesc = fm.metaDesc || fm.desc || '';
  const jsonLd = buildJsonLd(fm, slug, category);
  // Prefer a real photo for social cards if a hero is present.
  let photoOg = null;
  if (category === 'recipes') {
    const imgs = recipeImages.get(slug);
    if (imgs && imgs.hero) {
      const v = imgs.hero.variants.jpeg;
      const widest = v[v.length - 1];
      photoOg = `${SITE_URL}/assets/images/recipes/${slug}/hero-${widest.width}.jpg`;
    }
  }
  const ogTags = buildOgTags(fm, slug, category, photoOg);
  const favicon = categoryFaviconDataUri(category);
  const canonicalUrl = `${SITE_URL}/pages/${category}/${slug}.html`;

  return LAYOUT
    .replace('{{{metaComment}}}', metaComment)
    .replace('{{{pageTitle}}}', escapeHtml(pageTitle))
    .replace('{{{metaDesc}}}', escapeAttr(metaDesc))
    .replace('{{{jsonLd}}}', jsonLd)
    .replace('{{{ogTags}}}', ogTags)
    .replace('{{{favicon}}}', favicon)
    .replace('{{{canonicalUrl}}}', canonicalUrl)
    .replace('{{{pageBody}}}', body.trim());
}

function toEntryObject(fm, slug, category) {
  const path = `pages/${category}/${slug}.html`;
  const entry = {
    path,
    type: fm.type,
    category: fm.category || category,
    title: fm.title,
    desc: fm.desc,
    tags: fm.tags || [],
    status: fm.status,
    _slug: slug,
  };
  for (const k of ['cuisine','course','difficulty','servings','time','rating','last_made','updated','diet']) {
    if (fm[k] !== undefined) entry[k] = fm[k];
  }
  if (fm.type === 'recipe') {
    entry.ingredients = (fm.ingredients || []).map(i => ({ item: i.item, slug: i.slug, optional: !!i.optional }));
    entry.techniques = fm.techniques || [];
    entry.equipment = fm.equipment || [];
  }
  return entry;
}

// ── main ─────────────────────────────────────────────────────────────────────

const contentDir = join(ROOT, 'content');
const pagesDir   = join(ROOT, 'pages');
const dataDir    = join(ROOT, 'data');
mkdirSync(dataDir, { recursive: true });

const files = walk(contentDir).filter(f => !relative(contentDir, f).startsWith('_'));

// "Recently added" needs the date a content file first landed in the repo —
// distinct from `updated`, which advances on every edit. We read it once from
// git history (`--diff-filter=A` over content/) into a map keyed by the path
// git prints, e.g. `content/recipes/brown-butter.md`. Files not yet committed
// fall back to mtime so brand-new drafts still surface as recent.
const addedByContentPath = (() => {
  const map = new Map();
  const out = spawnSync(
    'git',
    ['-C', ROOT, 'log', '--diff-filter=AR', '--name-only', '--reverse', '--format=COMMIT %aI', '--', 'content/'],
    { encoding: 'utf8' }
  );
  if (out.status !== 0 || !out.stdout) return map;
  let commitDate = null;
  for (const line of out.stdout.split('\n')) {
    if (!line) continue;
    if (line.startsWith('COMMIT ')) {
      commitDate = line.slice(7, 17); // YYYY-MM-DD
    } else if (commitDate && !map.has(line)) {
      map.set(line, commitDate);
    }
  }
  return map;
})();

// Guardrail: a shallow clone (fetch-depth: 1 in CI) collapses every file's
// "added" date to the latest commit, which combined with the per-day cap in
// recent.json silently truncates "Recently added" to ~3 entries. This has
// regressed twice. Detect it and fail loudly rather than ship a broken section.
{
  const isShallow = spawnSync('git', ['-C', ROOT, 'rev-parse', '--is-shallow-repository'], { encoding: 'utf8' });
  if (isShallow.status === 0 && isShallow.stdout.trim() === 'true') {
    console.error('\n✗ Refusing to build: git repository is a shallow clone.');
    console.error('  "Recently added" derives each entry\'s date from `git log --diff-filter=AR`,');
    console.error('  which silently collapses to a single date under shallow clones.');
    console.error('  Fix: actions/checkout with `fetch-depth: 0`, or `git fetch --unshallow` locally.\n');
    process.exit(1);
  }
}

function addedDateFor(filePath) {
  const key = relative(ROOT, filePath).split('\\').join('/');
  const fromGit = addedByContentPath.get(key);
  if (fromGit) return fromGit;
  try {
    return statSync(filePath).mtime.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

const entries = [];
const pending = [];
let errors = 0;

for (const filePath of files) {
  const rel = relative(contentDir, filePath);
  const parts = rel.split('/');
  const category = parts[0];
  const slug = basename(filePath, '.md');
  try {
    const raw = readFileSync(filePath, 'utf8');
    const { data: fm, content: body } = matter(raw);
    validateEntry(fm, filePath);
    const outDir = join(pagesDir, category);
    mkdirSync(outDir, { recursive: true });
    const entry = toEntryObject(fm, slug, category);
    // Attach raw frontmatter for nutrition lookup (ingredient pages carry usda_fdc_id)
    entry._fm = fm;
    const added = addedDateFor(filePath);
    if (added) entry.added = added;
    entries.push(entry);
    pending.push({ fm, body, slug, category, outDir, entry });
  } catch (err) {
    console.error(`\n✗ ${rel}\n${err.message}`);
    errors++;
  }
}

// Build slug-keyed lookups for crosslinking
const ingredientBySlug = new Map();
const techniqueBySlug = new Map();
const equipmentBySlug = new Map();
const entriesByPath = new Map();
for (const e of entries) {
  entriesByPath.set(e.path, e);
  if (e.type === 'ingredient') {
    ingredientBySlug.set(e._slug, e);
    ingredientBySlug.set(`ingredients/${e._slug}`, e);
    e.fm = e._fm; // needed for nutrition fdc id lookup
  } else if (e.type === 'technique') {
    techniqueBySlug.set(e._slug, e);
    techniqueBySlug.set(`techniques/${e._slug}`, e);
  } else if (e.type === 'equipment') {
    equipmentBySlug.set(e._slug, e);
    equipmentBySlug.set(`equipment/${e._slug}`, e);
  }
}

// Enrich entries with card-display fields BEFORE rendering pages, so the
// family pages and related sections all use the same type-specific cards.
const ingHasNutrition = new Set();
for (const e of entries) {
  if (e.type === 'ingredient' && e._fm && e._fm.usda_fdc_id != null) {
    ingHasNutrition.add(e._slug);
  }
}
const reverseLinks = computeReverseLinks(entries);
for (const e of entries) enrichEntry(e, { ...reverseLinks, ingHasNutrition });

const relations = buildRelations(entries);
const adjacency = buildAdjacency(entries);
const usdaCache = loadCache(ROOT);

// safety_slug → entries that reference it via safety_notes[].ref. Used to
// render the "Referenced by" section on each safety page so readers can
// see which recipes and techniques rely on the published-safe call.
const safetyReferencedBy = new Map(); // slug (without "safety/" prefix) → [entry]
for (const e of entries) {
  const notes = e._fm && e._fm.safety_notes;
  if (!Array.isArray(notes)) continue;
  for (const n of notes) {
    if (!n || !n.ref) continue;
    const refSlug = String(n.ref).split('#')[0].replace(/^safety\//, '');
    if (!safetyReferencedBy.has(refSlug)) safetyReferencedBy.set(refSlug, []);
    const list = safetyReferencedBy.get(refSlug);
    if (!list.find(x => x.path === e.path)) list.push(e);
  }
}

// Cuisine → recipes index (for renderCuisineBody fallback). Cuisines with
// authored bodies bypass this; this only matters for cuisine entries that
// land with frontmatter only and need an auto-rendered Recipes section.
const cuisineRecipes = new Map(); // cuisine_title (case-insensitive) → [{ title, path, course }]
for (const e of entries) {
  if (e.type !== 'recipe' || e.status !== 'complete' || !e.cuisine) continue;
  const key = String(e.cuisine).trim().toLowerCase();
  if (!cuisineRecipes.has(key)) cuisineRecipes.set(key, []);
  cuisineRecipes.get(key).push({ title: e.title, path: e.path, course: e.course });
}
for (const list of cuisineRecipes.values()) list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en'));

const nutritionByPath = {};

// Build responsive image variants for any photos under content/images/recipes/<slug>/
const recipeImages = await buildRecipeImages(ROOT);

let built = 0;
let autoLinkCount = 0;

for (const { fm, body, slug, category, outDir, entry } of pending) {
  try {
    let augmentedBody = body.trim();

    // Family-explore pages: replace markers with rendered content + crosslinks
    if (fm.family && augmentedBody.includes('<!--FAMILY_CONTENT-->')) {
      augmentedBody = augmentedBody
        .replace('<!--FAMILY_CONTENT-->',    renderFamilyContent(fm.family, entries, entry.path))
        .replace('<!--FAMILY_CROSSLINKS-->', renderFamilyCrosslinks(fm.family, entry.path));
    }

    // Auto-render recipe / ingredient / technique / hub bodies if no body authored
    if (!augmentedBody) {
      if (fm.type === 'recipe') {
        const nutrition = roundNutritionWrap(computeRecipeNutrition(fm, ingredientBySlug, usdaCache));
        nutritionByPath[entry.path] = nutrition;
        const autoPairings = computePairings(entry, entries, {
          hubMembers: reverseLinks.hubMembers,
          inHubs: reverseLinks.inHubs,
          ingredientBySlug, techniqueBySlug,
        }, 8);
        // Explicit author pairings come first and never get dropped. Auto
        // pairings fill the remaining slots up to a cap of 8; any path
        // already covered by an explicit entry is filtered out.
        const explicitPairings = [];
        for (const p of (fm.pairings || [])) {
          if (!p || !p.recipe || !p.reason) continue;
          const refSlug = String(p.recipe).replace(/^pages\//, '').replace(/\.html$/, '');
          const refPath = `pages/${refSlug}.html`;
          const target = entriesByPath.get(refPath);
          if (!target) continue;
          explicitPairings.push({
            path: target.path, title: target.title, category: target.category, type: target.type,
            desc: target.desc, reason: p.reason, score: 1000, explicit: true,
          });
        }
        const explicitPaths = new Set(explicitPairings.map(p => p.path));
        const pairings = [...explicitPairings, ...autoPairings.filter(p => !explicitPaths.has(p.path))].slice(0, 8);
        augmentedBody = renderRecipeBody(fm, slug, category, {
          ingredientBySlug, techniqueBySlug, equipmentBySlug, nutrition,
          inHubs: reverseLinks.inHubs.get(entry.path) || [],
          pairings,
          entriesByPath,
          images: recipeImages.get(slug) || null,
        });
      } else if (fm.type === 'ingredient') {
        const recipesUsing = reverseLinks.ingRecipes.get(slug) || [];
        augmentedBody = renderIngredientBody(fm, slug, category, { recipesUsing });
      } else if (fm.type === 'technique') {
        const recipesPracticing = reverseLinks.techRecipes.get(slug) || [];
        augmentedBody = renderTechniqueBody(fm, slug, category, { recipesPracticing });
      } else if (fm.type === 'equipment') {
        const recipesUsing = reverseLinks.eqUsedIn.get(slug) || [];
        augmentedBody = renderEquipmentBody(fm, slug, category, { recipesUsing });
      } else if (fm.type === 'cuisine') {
        const recipes = cuisineRecipes.get(String(fm.title || slug).toLowerCase()) || [];
        augmentedBody = renderCuisineBody(fm, slug, category, { recipes });
      } else if (fm.type === 'hub') {
        augmentedBody = renderHubBody(fm, slug, category, entriesByPath);
      } else if (fm.type === 'safety') {
        const referencedBy = safetyReferencedBy.get(slug) || [];
        augmentedBody = renderSafetyBody(fm, slug, category, { referencedBy });
      } else {
        augmentedBody = `<div class="shell"><main class="main" id="main-content"><header class="topic-hero"><h1 class="topic-hero-title">${escapeHtml(fm.title || slug)}</h1></header></main></div>`;
      }
    } else if (fm.type === 'recipe') {
      // If a body is authored, we still compute and stash nutrition for /data/nutrition.json
      const nutrition = roundNutritionWrap(computeRecipeNutrition(fm, ingredientBySlug, usdaCache));
      nutritionByPath[entry.path] = nutrition;
    }

    if (entry.status === 'complete') {
      const linkMap = buildLinkMap(entries, entry);
      const beforeLen = augmentedBody.length;
      augmentedBody = autoLinkBody(augmentedBody, linkMap, entry);
      if (augmentedBody.length !== beforeLen) autoLinkCount++;

      const sourcesHtml = renderSourcesHtml(fm);
      // Family / explore pages ARE the index — auto-Related there is just
      // duplicate links to siblings that the user is already browsing. Skip.
      const isFamilyOrExplore = fm.type === 'family' || fm.category === 'explore';
      const relatedHtml = isFamilyOrExplore ? '' : renderRelatedHtml(relations.get(entry.path) || [], entry.path, { fromType: fm.type });
      const adjacencyHtml = isFamilyOrExplore ? '' : renderAdjacencyHtml(adjacency.get(entry.path), entry.path);
      const injection = `${sourcesHtml}${relatedHtml}${adjacencyHtml}`;
      if (injection && augmentedBody.includes('</main>')) {
        augmentedBody = augmentedBody.replace('</main>', `${injection}\n  </main>`);
      }
    }

    augmentedBody = buildPageFooter(augmentedBody, fm, slug, category);
    augmentedBody = ensureMainContentId(augmentedBody);

    const html = renderPage(fm, augmentedBody, slug, category);
    writeFileSync(join(outDir, `${slug}.html`), html, 'utf8');
    built++;
  } catch (err) {
    console.error(`\n✗ ${category}/${slug}\n${err.message}`);
    errors++;
  }
}

function roundNutritionWrap(n) {
  return { perServing: roundNutrition(n.perServing), total: roundNutrition(n.total), missing: n.missing };
}

// ── Tag pages (virtual) ───────────────────────────────────────────────
// One page per tag that has at least one complete entry. These are not
// content/<...>.md sources — they're indices generated from the union of
// all entry tags[]. Lives at pages/tags/<slug>.html.
const tagToEntries = new Map(); // tag_slug → entries[]
for (const e of entries) {
  if (e.status !== 'complete') continue;
  for (const t of (e.tags || [])) {
    if (!tagToEntries.has(t)) tagToEntries.set(t, []);
    tagToEntries.get(t).push(e);
  }
}

// Read the canonical tag list (for label lookups; tags not in the schema still
// render — we just fall back to slug-as-label).
let tagSchema = [];
try { tagSchema = JSON.parse(readFileSync(join(ROOT, 'content/_schema/tags.json'), 'utf8')); } catch {}
const tagLabel = new Map(tagSchema.map(t => [t.slug, t.label]));

const tagsDir = join(ROOT, 'pages', 'tags');
mkdirSync(tagsDir, { recursive: true });
const tagPagePaths = new Set();
const CATEGORY_ORDER = ['recipes','ingredients','techniques','equipment','cuisines','hubs'];
for (const [tagSlug, tagEntries] of tagToEntries.entries()) {
  // Sort + group by category
  const grouped = {};
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const e of tagEntries) {
    if (grouped[e.category]) grouped[e.category].push(e);
  }
  for (const cat of CATEGORY_ORDER) {
    grouped[cat].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en'));
  }

  const label = tagLabel.get(tagSlug) || tagSlug;
  const synthFm = {
    type: 'tag',
    category: 'tags',
    title: `#${tagSlug}`,
    pageTitle: `#${tagSlug}`,
    desc: `${tagEntries.length} entries tagged ${label}.`,
    metaDesc: `Every entry tagged ${label} across hd-recipes — recipes, ingredients, techniques, and more.`,
    status: 'complete',
    updated: new Date().toISOString().slice(0, 10),
    tags: [tagSlug],
  };
  const currentPath = `pages/tags/${tagSlug}.html`;
  let pageBody = renderTagBody(tagSlug, label, grouped, currentPath);
  pageBody = buildPageFooter(pageBody, synthFm, tagSlug, 'tags');
  pageBody = ensureMainContentId(pageBody);
  const html = renderPage(synthFm, pageBody, tagSlug, 'tags');
  writeFileSync(join(tagsDir, `${tagSlug}.html`), html, 'utf8');
  tagPagePaths.add(currentPath);
}

// ── In-season this month (computed BEFORE we strip _fm) ──────────────
// Parses each ingredient's `seasonality:` string for month ranges; surfaces
// recipes that lean on 2+ in-season ingredients. Built fresh on every
// build (current month = build month). The homepage section hides itself
// when the recipes array is empty.
const inSeasonJson = (() => {
  const MONTH_INDEX = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };
  function parseRanges(text) {
    if (!text) return null;
    const lower = String(text).toLowerCase();
    if (/year[\s-]?round|always\s+available|all\s+year/.test(lower)) return 'year-round';
    const ranges = [];
    const rangeRe = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(?:–|—|-|to)\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/gi;
    let mm;
    while ((mm = rangeRe.exec(lower))) {
      const a = MONTH_INDEX[mm[1]];
      const b = MONTH_INDEX[mm[2]];
      if (a == null || b == null) continue;
      ranges.push([a, b]);
    }
    return ranges.length ? ranges : null;
  }
  function monthInRanges(month, ranges) {
    if (!Array.isArray(ranges)) return false;
    for (const [a, b] of ranges) {
      if (a <= b) { if (month >= a && month <= b) return true; }
      else        { if (month >= a || month <= b) return true; }
    }
    return false;
  }
  const currentMonth = new Date().getMonth();
  const inSeasonSlugs = new Set();
  for (const e of entries) {
    if (e.type !== 'ingredient') continue;
    const text = e._fm && e._fm.seasonality;
    const parsed = parseRanges(text);
    if (!parsed || parsed === 'year-round') continue;
    if (monthInRanges(currentMonth, parsed)) {
      inSeasonSlugs.add(e._slug);
      inSeasonSlugs.add(`ingredients/${e._slug}`);
    }
  }
  if (inSeasonSlugs.size === 0) return { month: currentMonth, recipes: [], ingredients: [] };
  const ranked = [];
  for (const e of entries) {
    if (e.type !== 'recipe' || e.status !== 'complete') continue;
    const ings = (e._fm && e._fm.ingredients) || [];
    const hits = new Set();
    for (const i of ings) {
      if (!i || !i.slug) continue;
      if (inSeasonSlugs.has(i.slug)) hits.add(i.slug);
    }
    if (hits.size >= 2) {
      ranked.push({ path: e.path, title: e.title, desc: e.desc, hits: hits.size, slugs: [...hits] });
    }
  }
  ranked.sort((a, b) => b.hits - a.hits || (a.title || '').localeCompare(b.title || ''));
  return {
    month: currentMonth,
    ingredients: [...inSeasonSlugs].filter(s => !s.includes('/')),
    recipes: ranked.slice(0, 6),
  };
})();

// Strip _fm before serializing
for (const e of entries) { delete e._fm; delete e.fm; }

// Prune orphan pages — but include tag pages in expectedPaths so they survive.
const expectedPaths = new Set([...entries.map(e => e.path), ...tagPagePaths]);
let pruned = 0;
const pagesRoot = join(ROOT, 'pages');
const PRUNE_SKIP = new Set(['_admin']);
if (existsSync(pagesRoot)) {
  for (const cat of readdirSync(pagesRoot)) {
    if (PRUNE_SKIP.has(cat)) continue;
    const catDir = join(pagesRoot, cat);
    if (!statSync(catDir).isDirectory()) continue;
    for (const name of readdirSync(catDir)) {
      if (!name.endsWith('.html')) continue;
      const rel = `pages/${cat}/${name}`;
      if (!expectedPaths.has(rel)) {
        unlinkSync(join(catDir, name));
        console.log(`  ⌫  pruned orphan: ${rel}`);
        pruned++;
      }
    }
  }
}

entries.sort((a, b) => {
  if (a.status !== b.status) return a.status === 'complete' ? -1 : 1;
  if (a.updated && b.updated) return b.updated.localeCompare(a.updated);
  return 0;
});

writeFileSync(join(dataDir, 'entries.json'), JSON.stringify(entries, null, 2), 'utf8');

// Family art SVGs for the homepage (browser injects via [data-family-art])
writeFileSync(join(dataDir, 'family-art.json'), JSON.stringify({
  cook: familyCardArt('cook'),
  pantry: familyCardArt('pantry'),
  learn: familyCardArt('learn'),
  traverse: familyCardArt('traverse'),
  explore: familyCardArt('explore'),
}, null, 2), 'utf8');
writeFileSync(join(dataDir, 'nutrition.json'), JSON.stringify(nutritionByPath, null, 2), 'utf8');
writeFileSync(join(dataDir, 'in-season.json'), JSON.stringify(inSeasonJson, null, 2), 'utf8');

// search index
function extractBodyText(raw) {
  return raw
    .replace(/<aside[^>]*class="sidebar"[^>]*>[\s\S]*?<\/aside>/g, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/g, ' ')
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}
const bodies = {};
for (const { body, entry } of pending) {
  if (entry.status !== 'complete') continue;
  bodies[entry.path] = extractBodyText(body || '');
}
const searchIndex = buildSearchIndex(entries, bodies);
writeFileSync(join(dataDir, 'search-index.json'), JSON.stringify(searchIndex), 'utf8');

// "Recently added" surfaces every entry type. Sort by when the entry first
// landed in the repo (git first-add date, mtime fallback) — *not* `updated`,
// which advances on every edit and would resurface old entries after a small
// fix. Recipes get priority on date ties — they're what people come here for.
//
// A single big drop (e.g. a new cuisine pulling in 9 entries on one day) used
// to dominate the section so older recent additions never surfaced. Cap each
// day to RECENT_PER_DAY_CAP entries before slicing — within a day, TYPE_RANK
// keeps the most reader-facing entries (recipes, then techniques) at the top.
const TYPE_RANK = { recipe: 0, technique: 1, hub: 2, cuisine: 3, ingredient: 4, equipment: 5, family: 6 };
const RECENT_PER_DAY_CAP = 8;
const perDayCount = new Map();
const recent = entries
  .filter(e => e.status === 'complete' && e.added)
  .sort((a, b) => {
    const cmp = b.added.localeCompare(a.added);
    if (cmp !== 0) return cmp;
    return (TYPE_RANK[a.type] ?? 99) - (TYPE_RANK[b.type] ?? 99);
  })
  .filter(e => {
    const n = perDayCount.get(e.added) || 0;
    if (n >= RECENT_PER_DAY_CAP) return false;
    perDayCount.set(e.added, n + 1);
    return true;
  })
  .slice(0, 24);
writeFileSync(join(dataDir, 'recent.json'), JSON.stringify(recent, null, 2), 'utf8');

try {
  const featuredSrc = join(ROOT, 'content', '_featured', 'daily.json');
  const featured = JSON.parse(readFileSync(featuredSrc, 'utf8'));
  writeFileSync(join(dataDir, 'featured.json'), JSON.stringify(featured), 'utf8');
} catch (err) {
  console.warn('No featured.json:', err.message);
}

// sitemap + robots + feed
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: SITE_URL + '/', lastmod: today, priority: '1.0', changefreq: 'weekly' },
  ...entries.filter(e => e.status === 'complete').map(e => ({
    loc: `${SITE_URL}/${e.path}`,
    lastmod: e.updated || today,
    priority: '0.8', changefreq: 'monthly',
  })),
];
writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n') +
  `\n</urlset>\n`, 'utf8');

writeFileSync(join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');

function rssEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
const rssItems = entries.filter(e => e.status === 'complete' && e.updated).slice(0, 30).map(e => {
  const url = `${SITE_URL}/${e.path}`;
  const pubDate = new Date(e.updated + 'T00:00:00Z').toUTCString();
  return `    <item>\n      <title>${rssEscape(e.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <pubDate>${pubDate}</pubDate>\n      <description>${rssEscape(e.desc)}</description>\n      <category>${rssEscape(e.category)}</category>\n    </item>`;
}).join('\n');
writeFileSync(join(ROOT, 'feed.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${SITE_NAME}</title>\n    <link>${SITE_URL}/</link>\n    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n    <description>Recipes — tested, scaled, sourced.</description>\n    <language>en</language>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n` +
  rssItems + `\n  </channel>\n</rss>\n`, 'utf8');

// OG cards
const ogDir = join(ROOT, 'og');
mkdirSync(ogDir, { recursive: true });
let ogWritten = 0;
for (const e of entries) {
  if (e.status !== 'complete') continue;
  const slug = basename(e.path, '.html');
  const dir = join(ogDir, e.category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug}.svg`), renderOgSvg(e), 'utf8');
  ogWritten++;
}

// PWA manifest
const manifest = {
  name: 'hd · recipes',
  short_name: 'recipes',
  description: 'Recipes — tested, scaled, sourced. Every ingredient links, every macro is real, scales on the fly.',
  start_url: './?utm_source=pwa',
  scope: './',
  id: './',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  orientation: 'portrait-primary',
  background_color: '#faf6ee',
  theme_color: '#b8423a',
  lang: 'en',
  dir: 'ltr',
  categories: ['food', 'lifestyle', 'books'],
  icons: [
    { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: './icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Surprise me',     short_name: 'Random',  description: 'Open a random recipe',
      url: './random.html',           icons: [{ src: './icons/icon-192.png', sizes: '192x192' }] },
    { name: 'Browse recipes',  short_name: 'Recipes', description: 'Browse all recipes',
      url: './pages/explore/cook.html', icons: [{ src: './icons/icon-192.png', sizes: '192x192' }] },
  ],
};
writeFileSync(join(ROOT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`\nBuild complete: ${built} pages, ${pruned} pruned, ${errors} errors.`);
console.log(`OG cards: ${ogWritten}.  Auto-linked: ${autoLinkCount}/${pending.length} pages.`);

// Admin dashboard (best-effort)
try {
  const { spawnSync } = await import('node:child_process');
  const admin = spawnSync(process.execPath, [join(__dirname, 'build-admin.mjs')], { stdio: 'inherit' });
  if (admin.status !== 0) console.warn('build-admin: exited non-zero (admin page may be stale)');
} catch (e) {
  console.warn('admin pipeline failed:', e.message);
}

if (errors) process.exit(1);
