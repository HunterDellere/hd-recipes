/**
 * family-render.mjs — render explore-family pages for hd-recipes.
 *
 * Three families, mapped from categories:
 *   cook    → recipes
 *   pantry  → ingredients, equipment
 *   skills  → techniques, cuisines, hubs
 *
 * The explore index page renders three family cards + a flat all-categories
 * reference grid below.
 *
 * Each family page renders:
 *   - hero (handled in content/families/<key>.md frontmatter + body)
 *   - <!--FAMILY_CONTENT--> → category sections with entry-card grids
 *   - <!--FAMILY_CROSSLINKS--> → links to the other families
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderEntryCard } from './cards.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

export const FAMILY_MEMBERS = {
  cook:    ['recipes'],
  pantry:  ['ingredients', 'equipment'],
  skills:  ['techniques', 'cuisines', 'hubs'],
  explore: [],
};

export const FAMILY_META = {
  explore: { en: 'Explore',  desc: 'The master entry point. Three families, every category.' },
  cook:    { en: 'Cook',     desc: 'Tested recipes — scale, shop, cook. Full filters by cuisine, course, diet, time.' },
  pantry:  { en: 'Pantry',   desc: 'What ingredients are, how to choose them, store them, swap them. Plus the equipment that earns its drawer.' },
  skills:  { en: 'Skills',   desc: 'Techniques that show up across many recipes, cuisines built from a pantry, and curated reading paths.' },
};

let _categoryMeta = null;
function categoryMeta() {
  if (_categoryMeta) return _categoryMeta;
  _categoryMeta = JSON.parse(readFileSync(join(ROOT, 'data', 'category-meta.json'), 'utf8'));
  return _categoryMeta;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function relPath(fromPath, toPath) {
  const fromParts = fromPath.split('/').slice(0, -1);
  const toParts = toPath.split('/');
  let common = 0;
  while (common < fromParts.length && common < toParts.length - 1 && fromParts[common] === toParts[common]) common++;
  const ups = fromParts.length - common;
  const downs = toParts.slice(common);
  return ('../'.repeat(ups) + downs.join('/')) || './';
}

export function familyCardArt(family) {
  // Hand-tuned line-art icons. Each family gets a recognizable, distinctive
  // mark drawn in its category color, with a paper-soft background wash.
  // viewBox 200x160, designed to feel weighted toward the bottom (kitchen objects sit).
  if (family === 'cook') {
    // Saucepan in profile + steam wisps. Reads as cooking.
    return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pan-wash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--cat-recipes)" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="var(--cat-recipes)" stop-opacity="0.10"/>
        </linearGradient>
      </defs>
      <!-- steam -->
      <path d="M76 38 Q 70 28, 80 22 T 78 6" fill="none" stroke="var(--cat-recipes)" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
      <path d="M100 36 Q 94 26, 104 18 T 100 2" fill="none" stroke="var(--cat-recipes)" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>
      <path d="M124 38 Q 118 28, 128 22 T 126 6" fill="none" stroke="var(--cat-recipes)" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
      <!-- pan body -->
      <path d="M50 60 L 150 60 Q 152 60, 152 62 L 142 130 Q 141 138, 132 138 L 68 138 Q 59 138, 58 130 L 48 62 Q 48 60, 50 60 Z"
            fill="url(#pan-wash)" stroke="var(--cat-recipes)" stroke-width="2" stroke-linejoin="round"/>
      <!-- rim highlight -->
      <ellipse cx="100" cy="60" rx="51" ry="4" fill="none" stroke="var(--cat-recipes)" stroke-width="1.5" opacity="0.85"/>
      <!-- handle -->
      <path d="M152 78 L 184 70 Q 192 68, 192 62 Q 192 56, 184 58 L 150 66"
            fill="none" stroke="var(--cat-recipes)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- inner contents line (subtle) -->
      <ellipse cx="100" cy="70" rx="43" ry="3" fill="none" stroke="var(--cat-recipes)" stroke-width="1" opacity="0.35"/>
    </svg>`;
  }

  if (family === 'pantry') {
    // Three pantry jars — one tall, two short. Reads as ingredients/storage.
    return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jar-wash-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--cat-ingredients)" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="var(--cat-ingredients)" stop-opacity="0.12"/>
        </linearGradient>
        <linearGradient id="jar-wash-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--cat-equipment)" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="var(--cat-equipment)" stop-opacity="0.12"/>
        </linearGradient>
      </defs>
      <!-- shelf line -->
      <line x1="14" y1="142" x2="186" y2="142" stroke="var(--cat-ingredients)" stroke-width="1.4" opacity="0.4" stroke-linecap="round"/>
      <!-- left jar (tall) -->
      <rect x="34" y="44" width="36" height="8" rx="1.5" fill="none" stroke="var(--cat-ingredients)" stroke-width="1.8"/>
      <path d="M36 52 Q 36 56, 38 56 L 66 56 Q 68 56, 68 52 L 70 142 L 32 142 Z"
            fill="url(#jar-wash-a)" stroke="var(--cat-ingredients)" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- contents fill -->
      <path d="M38 100 L 66 100 L 67 142 L 35 142 Z" fill="var(--cat-ingredients)" opacity="0.18"/>
      <!-- middle jar (medium, equipment palette) -->
      <rect x="84" y="68" width="32" height="7" rx="1.5" fill="none" stroke="var(--cat-equipment)" stroke-width="1.8"/>
      <path d="M86 75 Q 86 79, 88 79 L 112 79 Q 114 79, 114 75 L 116 142 L 84 142 Z"
            fill="url(#jar-wash-b)" stroke="var(--cat-equipment)" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M86 110 L 114 110 L 115 142 L 85 142 Z" fill="var(--cat-equipment)" opacity="0.16"/>
      <!-- right jar (medium-tall) -->
      <rect x="128" y="56" width="38" height="8" rx="1.5" fill="none" stroke="var(--cat-ingredients)" stroke-width="1.8"/>
      <path d="M130 64 Q 130 68, 132 68 L 162 68 Q 164 68, 164 64 L 166 142 L 128 142 Z"
            fill="url(#jar-wash-a)" stroke="var(--cat-ingredients)" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M132 92 L 164 92 L 165 142 L 131 142 Z" fill="var(--cat-ingredients)" opacity="0.14"/>
      <!-- contents grain (dots in middle jar) -->
      <circle cx="92" cy="118" r="1.2" fill="var(--cat-equipment)" opacity="0.55"/>
      <circle cx="100" cy="124" r="1.2" fill="var(--cat-equipment)" opacity="0.55"/>
      <circle cx="108" cy="120" r="1.2" fill="var(--cat-equipment)" opacity="0.55"/>
      <circle cx="96" cy="132" r="1.2" fill="var(--cat-equipment)" opacity="0.55"/>
      <circle cx="106" cy="135" r="1.2" fill="var(--cat-equipment)" opacity="0.55"/>
    </svg>`;
  }

  if (family === 'skills') {
    // Chef's knife at an angle — direct, confident, "skill" reads instantly.
    return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blade-wash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="var(--cat-techniques)" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="var(--cat-techniques)" stop-opacity="0.04"/>
        </linearGradient>
      </defs>
      <!-- cutting board (subtle grain) -->
      <rect x="22" y="118" width="156" height="22" rx="3" fill="none" stroke="var(--cat-cuisines)" stroke-width="1.4" opacity="0.45"/>
      <line x1="40" y1="125" x2="60" y2="125" stroke="var(--cat-cuisines)" stroke-width="0.8" opacity="0.35"/>
      <line x1="78" y1="132" x2="106" y2="132" stroke="var(--cat-cuisines)" stroke-width="0.8" opacity="0.35"/>
      <line x1="124" y1="125" x2="158" y2="125" stroke="var(--cat-cuisines)" stroke-width="0.8" opacity="0.35"/>
      <!-- knife blade -->
      <path d="M30 96 L 138 70 L 144 92 L 30 96 Z"
            fill="url(#blade-wash)" stroke="var(--cat-techniques)" stroke-width="2" stroke-linejoin="round"/>
      <!-- spine highlight -->
      <line x1="32" y1="96" x2="138" y2="72" stroke="var(--cat-techniques)" stroke-width="1" opacity="0.5"/>
      <!-- bolster -->
      <rect x="138" y="84" width="10" height="14" rx="1.5" fill="var(--cat-techniques)" opacity="0.85"/>
      <!-- handle -->
      <path d="M148 86 L 180 84 Q 184 84, 184 88 L 184 96 Q 184 100, 180 100 L 148 98 Z"
            fill="var(--cat-techniques)" opacity="0.7" stroke="var(--cat-techniques)" stroke-width="1.4" stroke-linejoin="round"/>
      <!-- rivets -->
      <circle cx="158" cy="92" r="1.4" fill="var(--bg)" stroke="var(--cat-techniques)" stroke-width="0.8"/>
      <circle cx="172" cy="92" r="1.4" fill="var(--bg)" stroke="var(--cat-techniques)" stroke-width="0.8"/>
    </svg>`;
  }

  // explore — three small cards showing the families together
  return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="exp-r" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--cat-recipes)" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="var(--cat-recipes)" stop-opacity="0.18"/>
      </linearGradient>
      <linearGradient id="exp-i" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--cat-ingredients)" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="var(--cat-ingredients)" stop-opacity="0.18"/>
      </linearGradient>
      <linearGradient id="exp-t" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--cat-techniques)" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="var(--cat-techniques)" stop-opacity="0.18"/>
      </linearGradient>
    </defs>
    <rect x="22" y="36" width="52" height="52" rx="6" fill="url(#exp-r)" stroke="var(--cat-recipes)" stroke-width="1.8"/>
    <circle cx="48" cy="62" r="14" fill="none" stroke="var(--cat-recipes)" stroke-width="1.4" opacity="0.7"/>
    <ellipse cx="48" cy="51" rx="11" ry="2.2" fill="none" stroke="var(--cat-recipes)" stroke-width="1.2" opacity="0.7"/>

    <rect x="126" y="36" width="52" height="52" rx="6" fill="url(#exp-i)" stroke="var(--cat-ingredients)" stroke-width="1.8"/>
    <rect x="138" y="48" width="10" height="32" rx="1.5" fill="none" stroke="var(--cat-ingredients)" stroke-width="1.4" opacity="0.75"/>
    <rect x="156" y="54" width="10" height="26" rx="1.5" fill="none" stroke="var(--cat-ingredients)" stroke-width="1.4" opacity="0.75"/>

    <rect x="74" y="84" width="52" height="52" rx="6" fill="url(#exp-t)" stroke="var(--cat-techniques)" stroke-width="1.8"/>
    <path d="M85 116 L 113 102 L 116 110 L 85 116 Z" fill="none" stroke="var(--cat-techniques)" stroke-width="1.5" stroke-linejoin="round" opacity="0.85"/>
    <rect x="115" y="106" width="6" height="6" rx="1" fill="var(--cat-techniques)" opacity="0.65"/>
  </svg>`;
}

function entryCard(entry, fromPath, opts) {
  return renderEntryCard(entry, fromPath, opts);
}

function renderCategorySection(catKey, entries, fromPath) {
  const meta = categoryMeta()[catKey] || { label: catKey, blurb: '' };
  const cards = entries.map(e => entryCard(e, fromPath)).join('');
  return `
    <section class="fam-cat" id="cat-${escapeHtml(catKey)}" data-category="${escapeHtml(catKey)}">
      <div class="fam-cat-head">
        <h2 class="fam-cat-title">${escapeHtml(meta.label)}</h2>
        <span class="fam-cat-count">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      ${meta.blurb ? `<p class="fam-cat-blurb">${escapeHtml(meta.blurb)}</p>` : ''}
      ${entries.length ? `<div class="card-grid">${cards}\n      </div>` : `<p class="fam-cat-empty">No entries yet — check back soon.</p>`}
    </section>`;
}

function renderExploreContent(entries, fromPath) {
  // Three big family cards
  const families = ['cook', 'pantry', 'skills'];
  const familyCards = families.map(f => {
    const meta = FAMILY_META[f];
    const memberLabels = FAMILY_MEMBERS[f].map(k => categoryMeta()[k]?.label || k).join(' · ');
    const memberCount = FAMILY_MEMBERS[f].reduce((n, k) =>
      n + entries.filter(e => e.status === 'complete' && e.category === k).length, 0);
    const href = relPath(fromPath, `pages/explore/${f}.html`);
    return `
      <a class="family-card" href="${escapeHtml(href)}" data-family="${f}">
        <div class="family-card-art" aria-hidden="true">${familyCardArt(f)}</div>
        <div class="family-card-meta">
          <span class="family-card-eyebrow">${escapeHtml(memberLabels)}</span>
          <h3 class="family-card-title">${escapeHtml(meta.en)}</h3>
          <p class="family-card-desc">${escapeHtml(meta.desc)}</p>
          <span class="family-card-count">${memberCount} ${memberCount === 1 ? 'entry' : 'entries'}</span>
        </div>
      </a>`;
  }).join('\n      ');

  // Per-category quick links
  const allCats = ['recipes','ingredients','techniques','cuisines','equipment','hubs'];
  const catLinks = allCats.map(k => {
    const meta = categoryMeta()[k] || { label: k };
    const count = entries.filter(e => e.status === 'complete' && e.category === k).length;
    const href = relPath(fromPath, `pages/explore/${k === 'recipes' ? 'cook' : (k === 'ingredients' || k === 'equipment') ? 'pantry' : 'skills'}.html#cat-${k}`);
    return `
        <a class="cat-link" href="${escapeHtml(href)}" data-category="${escapeHtml(k)}">
          <span class="cl-label">${escapeHtml(meta.label)}</span>
          <span class="cl-count">${count}</span>
        </a>`;
  }).join('');

  return `
    <div class="families-grid">${familyCards}
    </div>
    <section class="fam-cat-strip">
      <h2 class="fam-cat-strip-h">Or jump to a category</h2>
      <div class="cat-link-grid">${catLinks}
      </div>
    </section>`;
}

export function renderFamilyContent(family, entries, fromPath) {
  if (family === 'explore') return renderExploreContent(entries, fromPath);
  const memberKeys = FAMILY_MEMBERS[family];
  if (!memberKeys || !memberKeys.length) return '';

  const byCategory = new Map();
  for (const e of entries) {
    if (e.status !== 'complete') continue;
    if (!memberKeys.includes(e.category)) continue;
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category).push(e);
  }
  for (const list of byCategory.values()) list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en'));

  const meta = FAMILY_META[family];
  const totalEntries = memberKeys.reduce((n, k) => n + (byCategory.get(k)?.length || 0), 0);

  // Per-category breakdown for the intro stats strip
  const catStats = memberKeys.map(k => {
    const list = byCategory.get(k) || [];
    const cm = categoryMeta()[k] || { label: k };
    return `<a class="fam-stat" href="#cat-${escapeHtml(k)}" data-category="${escapeHtml(k)}">
        <span class="fam-stat-num">${list.length}</span>
        <span class="fam-stat-label">${escapeHtml(cm.label)}</span>
      </a>`;
  }).join('');

  const intro = `
    <div class="fam-intro">
      <p class="fam-intro-text">${escapeHtml(meta.desc)}</p>
      <div class="fam-stats" role="navigation" aria-label="Jump to category">${catStats}</div>
    </div>`;

  // For 'cook' (the recipe explore), include filter bar
  let filterBar = '';
  if (family === 'cook') {
    const recipes = byCategory.get('recipes') || [];
    const cuisines = new Set(), courses = new Set(), diets = new Set();
    for (const r of recipes) {
      if (r.cuisine) cuisines.add(r.cuisine);
      if (r.course) courses.add(r.course);
      for (const d of (r.diet || [])) diets.add(d);
    }
    filterBar = `
    <div class="filter-bar" role="toolbar" aria-label="Filter recipes">
      <div class="filter-group">
        <span class="filter-label">Cuisine</span>
        ${[...cuisines].sort().map(c => `<button type="button" class="filter-pill" data-filter-cuisine="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
      </div>
      <div class="filter-group">
        <span class="filter-label">Course</span>
        ${[...courses].sort().map(c => `<button type="button" class="filter-pill" data-filter-course="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
      </div>
      ${diets.size ? `<div class="filter-group">
        <span class="filter-label">Diet</span>
        ${[...diets].sort().map(d => `<button type="button" class="filter-pill" data-filter-diet="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('')}
      </div>` : ''}
      <div class="filter-group">
        <span class="filter-label">Time</span>
        <button type="button" class="filter-pill" data-filter-time="30">≤ 30 min</button>
        <button type="button" class="filter-pill" data-filter-time="60">≤ 60 min</button>
      </div>
      <div class="filter-group">
        <span class="filter-label">Difficulty</span>
        <button type="button" class="filter-pill" data-filter-difficulty="easy">easy</button>
        <button type="button" class="filter-pill" data-filter-difficulty="medium">medium</button>
        <button type="button" class="filter-pill" data-filter-difficulty="hard">hard</button>
      </div>
      <button type="button" class="filter-pill filter-clear-btn" data-filter-clear>Clear all</button>
    </div>
    <p class="filter-status" data-filter-status></p>`;
  }

  // Augment entry cards with filter data attributes for 'cook'
  const augment = (e) => family === 'cook'
    ? `data-card data-cuisine="${escapeHtml(e.cuisine || '')}" data-course="${escapeHtml(e.course || '')}" data-diet="${(e.diet || []).map(escapeHtml).join('|')}" data-difficulty="${escapeHtml(e.difficulty || '')}" data-time="${(e.time && e.time.total_min) || ''}"`
    : '';

  const sections = memberKeys.map(catKey => {
    const list = byCategory.get(catKey) || [];
    const cardsHtml = list.map(e => entryCard(e, fromPath, { extraData: augment(e) })).join('');
    const meta = categoryMeta()[catKey] || { label: catKey, blurb: '' };
    return `
    <section class="fam-cat" id="cat-${escapeHtml(catKey)}" data-category="${escapeHtml(catKey)}">
      <div class="fam-cat-head">
        <h2 class="fam-cat-title">${escapeHtml(meta.label)}</h2>
        <span class="fam-cat-count">${list.length} ${list.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      ${meta.blurb ? `<p class="fam-cat-blurb">${escapeHtml(meta.blurb)}</p>` : ''}
      ${list.length ? `<div class="card-grid" data-grid>${cardsHtml}\n      </div>` : `<p class="fam-cat-empty">No entries yet.</p>`}
    </section>`;
  }).join('\n');

  return `${intro}\n${filterBar}\n${sections}`;
}

export function renderFamilyCrosslinks(family, fromPath) {
  if (family === 'explore') return '';
  const others = ['cook', 'pantry', 'skills', 'explore'].filter(f => f !== family);
  const links = others.map(f => {
    const meta = FAMILY_META[f];
    const href = relPath(fromPath, `pages/explore/${f === 'explore' ? 'index' : f}.html`);
    return `<a class="fam-cross-link" href="${escapeHtml(href)}" data-family="${f}"><span class="fcl-label">${escapeHtml(meta.en)}</span><span class="fcl-desc">${escapeHtml(meta.desc.slice(0, 70))}</span></a>`;
  }).join('');
  return `
    <section class="fam-cross">
      <span class="fam-cross-label">Continue exploring</span>
      <div class="fam-cross-grid">${links}</div>
    </section>`;
}
