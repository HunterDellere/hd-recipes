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
import matter from 'gray-matter';
import { validateEntry } from './lib/validate.mjs';
import { buildSearchIndex } from './lib/search-index.mjs';
import { buildRelations, buildAdjacency, renderRelatedHtml, renderAdjacencyHtml } from './lib/relations.mjs';
import { buildLinkMap, autoLinkBody, buildPageFooter, renderSourcesHtml, ensureMainContentId } from './lib/augment.mjs';
import { renderOgSvg, categoryFaviconDataUri } from './lib/og.mjs';
import {
  renderRecipeBody, renderIngredientBody, renderTechniqueBody, renderHubBody,
  renderEquipmentBody, renderCuisineBody, renderTagBody,
} from './lib/recipe-render.mjs';
import { renderFamilyContent, renderFamilyCrosslinks, familyCardArt } from './lib/family-render.mjs';
import { loadCache, computeRecipeNutrition, roundNutrition } from './lib/nutrition.mjs';
import { computeReverseLinks, enrichEntry } from './lib/cards.mjs';
import { computePairings } from './lib/pairings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const LAYOUT = readFileSync(join(ROOT, 'templates/_layout.html'), 'utf8');

const SITE_URL = 'https://recipes.hd.dev';
const SITE_NAME = 'hd · recipes';

const CATEGORY_LABELS = {
  recipes: 'Recipes', ingredients: 'Ingredients', techniques: 'Techniques',
  cuisines: 'Cuisines', equipment: 'Equipment', hubs: 'Collections',
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

function buildOgTags(fm, slug, category) {
  if (fm.status !== 'complete') return '';
  const url = `${SITE_URL}/pages/${category}/${slug}.html`;
  const ogImg = `${SITE_URL}/og/${category}/${slug}.svg`;
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
  const ogTags = buildOgTags(fm, slug, category);
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
        const pairings = computePairings(entry, entries, {
          hubMembers: reverseLinks.hubMembers,
          inHubs: reverseLinks.inHubs,
          ingredientBySlug, techniqueBySlug,
        }, 8);
        augmentedBody = renderRecipeBody(fm, slug, category, {
          ingredientBySlug, techniqueBySlug, equipmentBySlug, nutrition,
          inHubs: reverseLinks.inHubs.get(entry.path) || [],
          pairings,
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
      const relatedHtml = isFamilyOrExplore ? '' : renderRelatedHtml(relations.get(entry.path) || [], entry.path);
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

// "Recently added" surfaces real content only (skip families + hubs which are
// navigational scaffolding). Recipes get priority — they're what people come
// here for. When updated dates tie, we prefer recipes, then techniques,
// ingredients, then anything else.
const RECENT_EXCLUDE = new Set(['family']);
const TYPE_RANK = { recipe: 0, technique: 1, hub: 2, cuisine: 3, ingredient: 4, equipment: 5 };
const recent = entries
  .filter(e => e.status === 'complete' && e.updated && !RECENT_EXCLUDE.has(e.type))
  .sort((a, b) => {
    const cmp = b.updated.localeCompare(a.updated);
    if (cmp !== 0) return cmp;
    return (TYPE_RANK[a.type] ?? 99) - (TYPE_RANK[b.type] ?? 99);
  })
  .slice(0, 12);
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
  start_url: '/?utm_source=pwa',
  scope: '/',
  id: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  orientation: 'portrait-primary',
  background_color: '#faf6ee',
  theme_color: '#b8423a',
  lang: 'en',
  dir: 'ltr',
  categories: ['food', 'lifestyle', 'books'],
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Surprise me',     short_name: 'Random',  description: 'Open a random recipe',
      url: '/random.html',           icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    { name: 'Browse recipes',  short_name: 'Recipes', description: 'Browse all recipes',
      url: '/pages/explore/cook.html', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
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
