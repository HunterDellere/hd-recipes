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

function familyCardArt(family) {
  // Subtle SVG art — geometric, draws on the family's category palette.
  // Each family gets a distinctive shape language.
  if (family === 'cook') {
    return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="90" r="60" fill="none" stroke="var(--cat-recipes)" stroke-width="2" opacity="0.5"/>
      <ellipse cx="100" cy="55" rx="44" ry="10" fill="none" stroke="var(--cat-recipes)" stroke-width="1.4" opacity="0.4"/>
      <line x1="65" y1="55" x2="65" y2="40" stroke="var(--cat-recipes)" stroke-width="1.4" opacity="0.45" stroke-linecap="round"/>
      <line x1="100" y1="55" x2="100" y2="35" stroke="var(--cat-recipes)" stroke-width="1.4" opacity="0.45" stroke-linecap="round"/>
      <line x1="135" y1="55" x2="135" y2="40" stroke="var(--cat-recipes)" stroke-width="1.4" opacity="0.45" stroke-linecap="round"/>
    </svg>`;
  }
  if (family === 'pantry') {
    return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="38" width="36" height="100" rx="3" fill="none" stroke="var(--cat-ingredients)" stroke-width="1.6" opacity="0.55"/>
      <rect x="84" y="58" width="36" height="80" rx="3" fill="none" stroke="var(--cat-equipment)" stroke-width="1.6" opacity="0.55"/>
      <rect x="128" y="48" width="36" height="90" rx="3" fill="none" stroke="var(--cat-ingredients)" stroke-width="1.6" opacity="0.55"/>
      <line x1="40" y1="50" x2="76" y2="50" stroke="var(--cat-ingredients)" stroke-width="1" opacity="0.4"/>
      <line x1="84" y1="70" x2="120" y2="70" stroke="var(--cat-equipment)" stroke-width="1" opacity="0.4"/>
      <line x1="128" y1="60" x2="164" y2="60" stroke="var(--cat-ingredients)" stroke-width="1" opacity="0.4"/>
    </svg>`;
  }
  if (family === 'skills') {
    return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="80" r="22" fill="none" stroke="var(--cat-techniques)" stroke-width="1.6" opacity="0.55"/>
      <circle cx="100" cy="50" r="22" fill="none" stroke="var(--cat-cuisines)" stroke-width="1.6" opacity="0.55"/>
      <circle cx="140" cy="80" r="22" fill="none" stroke="var(--cat-hubs)" stroke-width="1.6" opacity="0.55"/>
      <circle cx="100" cy="115" r="22" fill="none" stroke="var(--cat-techniques)" stroke-width="1.4" opacity="0.4"/>
      <line x1="78" y1="68" x2="86" y2="58" stroke="var(--ink-faint)" stroke-width="0.8" opacity="0.4"/>
      <line x1="114" y1="58" x2="122" y2="68" stroke="var(--ink-faint)" stroke-width="0.8" opacity="0.4"/>
      <line x1="100" y1="72" x2="100" y2="93" stroke="var(--ink-faint)" stroke-width="0.8" opacity="0.4"/>
    </svg>`;
  }
  // explore — composite of all three
  return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <rect x="35" y="30" width="48" height="48" rx="4" fill="none" stroke="var(--cat-recipes)" stroke-width="1.6" opacity="0.55"/>
    <rect x="118" y="30" width="48" height="48" rx="4" fill="none" stroke="var(--cat-ingredients)" stroke-width="1.6" opacity="0.55"/>
    <rect x="76" y="82" width="48" height="48" rx="4" fill="none" stroke="var(--cat-techniques)" stroke-width="1.6" opacity="0.55"/>
  </svg>`;
}

function entryCard(entry, fromPath) {
  const href = relPath(fromPath, entry.path);
  const meta = [];
  if (entry.cuisine) meta.push(escapeHtml(entry.cuisine));
  if (entry.course) meta.push(escapeHtml(entry.course));
  if (entry.time && entry.time.total_min) meta.push(`${entry.time.total_min} min`);
  return `
        <a class="entry-card" href="${escapeHtml(href)}" data-category="${escapeHtml(entry.category)}">
          <span class="ec-cat">${escapeHtml(entry.category)}</span>
          <span class="ec-title">${escapeHtml(entry.title || '')}</span>
          ${entry.desc ? `<span class="ec-desc">${escapeHtml(entry.desc.slice(0, 110))}</span>` : ''}
          ${meta.length ? `<span class="ec-meta">${meta.join(' · ')}</span>` : ''}
        </a>`;
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

  const intro = `
    <div class="fam-intro">
      <span class="fam-intro-stat">${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'} · ${memberKeys.length} categor${memberKeys.length === 1 ? 'y' : 'ies'}</span>
      <p class="fam-intro-text">${escapeHtml(meta.desc)}</p>
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
    ? ` data-card data-cuisine="${escapeHtml(e.cuisine || '')}" data-course="${escapeHtml(e.course || '')}" data-diet="${(e.diet || []).map(escapeHtml).join('|')}" data-difficulty="${escapeHtml(e.difficulty || '')}" data-time="${(e.time && e.time.total_min) || ''}"`
    : '';

  const sections = memberKeys.map(catKey => {
    const list = byCategory.get(catKey) || [];
    const cardsHtml = list.map(e => entryCard(e, fromPath).replace('class="entry-card"', `class="entry-card"${augment(e)}`)).join('');
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
