/**
 * cards.mjs — type-specific entry-card renderers.
 *
 * Used at build time by family-render and recipe-render. The runtime
 * (homepage.js) uses the same enriched entry shape via the matching
 * client-side helper in scripts/cards.js.
 *
 * Card grammar by type:
 *   recipe     →  badge: difficulty pill + cuisine + course + total time
 *                 stat: servings · time
 *   ingredient →  badge: primary tag (Dairy, Spice, Aromatic, etc.)
 *                 stat: "in N recipes"
 *                 USDA chip when nutrition mapped
 *   technique  →  stat: "in N recipes"
 *   cuisine    →  stat: "N recipes"
 *   equipment  →  badge: primary tag if present
 *   hub        →  stat: "N entries"
 *   family     →  fallback (plain title + desc)
 *
 * Every card renders into the same outer shape (.entry-card with
 * data-category and data-type) so the existing CSS color-mapping and
 * hover treatment apply uniformly.
 */

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Tags that are good as the "primary" badge — semantic ingredient class.
// Ordered; first match wins.
const PRIMARY_TAGS = [
  'dairy', 'fat', 'spice', 'herb', 'aromatic', 'acid', 'grain', 'legume',
  'vegetable', 'fruit', 'fish', 'seafood', 'chicken', 'beef', 'pork', 'egg',
];

function pickPrimaryTag(entry) {
  for (const t of (entry.tags || [])) {
    if (PRIMARY_TAGS.includes(t)) return t;
  }
  return null;
}

/**
 * Compute reverse-link counts from all entries in one O(n) pass.
 * Returns:
 *   ingUsedIn:  Map<ingredient_slug, number_of_recipes>
 *   techUsedIn: Map<technique_slug,  number_of_recipes>
 *   cuisineCount: Map<cuisine_name,  number_of_recipes>
 *   hubMembers:   Map<hub_path,      number_of_members>
 */
export function computeReverseLinks(entries) {
  const ingUsedIn = new Map();
  const techUsedIn = new Map();
  const cuisineCount = new Map();
  const hubMembers = new Map();

  for (const e of entries) {
    if (e.status !== 'complete') continue;
    if (e.type === 'recipe') {
      for (const ing of (e.ingredients || [])) {
        const s = (ing.slug || '').replace(/^ingredients\//, '');
        if (s) ingUsedIn.set(s, (ingUsedIn.get(s) || 0) + 1);
      }
      for (const t of (e.techniques || [])) {
        const s = String(t).replace(/^techniques\//, '');
        if (s) techUsedIn.set(s, (techUsedIn.get(s) || 0) + 1);
      }
      if (e.cuisine) cuisineCount.set(e.cuisine, (cuisineCount.get(e.cuisine) || 0) + 1);
    }
    if (e.type === 'hub') {
      const members = (e.members || (e._fm && e._fm.members) || []);
      if (Array.isArray(members)) hubMembers.set(e.path, members.length);
    }
  }
  return { ingUsedIn, techUsedIn, cuisineCount, hubMembers };
}

/**
 * Enrich a single entry with card-display fields. Mutates and returns the
 * entry. Safe to call after entries are otherwise frozen (only adds fields).
 *
 *   _card: {
 *     primaryTag,        // ingredient/equipment: e.g. "dairy"
 *     usedInCount,       // ingredient/technique: number of recipes
 *     hasNutrition,      // ingredient: bool — whether usda_fdc_id is set
 *     totalMinutes,      // recipe: number or null
 *     diffLabel,         // recipe: "easy"|"medium"|"hard"
 *   }
 */
export function enrichEntry(entry, ctx) {
  const { ingUsedIn, techUsedIn, cuisineCount, hubMembers, ingHasNutrition } = ctx;
  const c = {};
  if (entry.type === 'recipe') {
    c.totalMinutes = entry.time && entry.time.total_min || null;
    c.diffLabel = entry.difficulty || null;
  } else if (entry.type === 'ingredient') {
    c.primaryTag = pickPrimaryTag(entry);
    c.usedInCount = ingUsedIn.get(entry._slug) || 0;
    c.hasNutrition = !!(ingHasNutrition && ingHasNutrition.has(entry._slug));
  } else if (entry.type === 'technique') {
    c.usedInCount = techUsedIn.get(entry._slug) || 0;
  } else if (entry.type === 'cuisine') {
    c.usedInCount = cuisineCount.get(entry.title) || 0;
  } else if (entry.type === 'equipment') {
    c.primaryTag = pickPrimaryTag(entry);
  } else if (entry.type === 'hub') {
    c.memberCount = hubMembers.get(entry.path) || 0;
  }
  entry._card = c;
  return entry;
}

// ── server-side rendering ───────────────────────────────────────────────

function relPath(fromPath, toPath) {
  const fromParts = fromPath.split('/').slice(0, -1);
  const toParts = toPath.split('/');
  let common = 0;
  while (common < fromParts.length && common < toParts.length - 1 && fromParts[common] === toParts[common]) common++;
  const ups = fromParts.length - common;
  const downs = toParts.slice(common);
  return ('../'.repeat(ups) + downs.join('/')) || './';
}

function fmtCount(n, singular, plural) {
  if (n == null) return '';
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Build the inner HTML of a card, given an enriched entry.
 * Returns the body — the wrapping <a class="entry-card"> is added by callers.
 */
export function renderCardBody(entry) {
  const card = entry._card || {};
  const title = escapeHtml(entry.title || '');
  const desc = entry.desc ? `<span class="ec-desc">${escapeHtml(entry.desc.slice(0, 110))}</span>` : '';
  const cat = `<span class="ec-cat">${escapeHtml(entry.category)}</span>`;

  if (entry.type === 'recipe') {
    const meta = [];
    if (entry.cuisine) meta.push(`<span class="ec-meta-item">${escapeHtml(entry.cuisine)}</span>`);
    if (entry.course)  meta.push(`<span class="ec-meta-item">${escapeHtml(entry.course)}</span>`);
    if (card.totalMinutes) meta.push(`<span class="ec-meta-item ec-meta-time"><strong>${card.totalMinutes}</strong> min</span>`);
    const stats = entry.servings ? `<span class="ec-stat"><strong>${entry.servings}</strong> serving${entry.servings === 1 ? '' : 's'}</span>` : '';
    const diff = card.diffLabel
      ? `<span class="ec-pill ec-diff ec-d-${escapeHtml(card.diffLabel)}">${escapeHtml(card.diffLabel)}</span>`
      : '';
    return `${cat}<span class="ec-title">${title}</span>${desc}
        <div class="ec-foot">
          <div class="ec-meta">${meta.join('')}</div>
          ${diff}
        </div>${stats ? `<div class="ec-stats">${stats}</div>` : ''}`;
  }

  if (entry.type === 'ingredient') {
    const tag = card.primaryTag ? `<span class="ec-pill ec-pill-tag">${escapeHtml(card.primaryTag)}</span>` : '';
    const used = card.usedInCount > 0
      ? `<span class="ec-stat ec-stat-link"><strong>${card.usedInCount}</strong> ${card.usedInCount === 1 ? 'recipe' : 'recipes'}</span>`
      : '';
    const nut = card.hasNutrition
      ? `<span class="ec-pill ec-pill-data" title="USDA nutrition data available">USDA</span>`
      : '';
    return `${cat}<span class="ec-title">${title}</span>${desc}
        <div class="ec-foot">
          <div class="ec-meta">${tag}${nut}</div>
          ${used}
        </div>`;
  }

  if (entry.type === 'technique') {
    const used = card.usedInCount > 0
      ? `<span class="ec-stat ec-stat-link"><strong>${card.usedInCount}</strong> ${card.usedInCount === 1 ? 'recipe' : 'recipes'}</span>`
      : '';
    return `${cat}<span class="ec-title">${title}</span>${desc}
        <div class="ec-foot">
          ${used}
        </div>`;
  }

  if (entry.type === 'cuisine') {
    const used = card.usedInCount > 0
      ? `<span class="ec-stat ec-stat-link"><strong>${card.usedInCount}</strong> ${card.usedInCount === 1 ? 'recipe' : 'recipes'}</span>`
      : '';
    return `${cat}<span class="ec-title">${title}</span>${desc}
        <div class="ec-foot">${used}</div>`;
  }

  if (entry.type === 'equipment') {
    const tag = card.primaryTag ? `<span class="ec-pill ec-pill-tag">${escapeHtml(card.primaryTag)}</span>` : '';
    return `${cat}<span class="ec-title">${title}</span>${desc}
        <div class="ec-foot">${tag}</div>`;
  }

  if (entry.type === 'hub') {
    const m = card.memberCount;
    const stat = m > 0 ? `<span class="ec-stat"><strong>${m}</strong> ${m === 1 ? 'entry' : 'entries'}</span>` : '';
    return `${cat}<span class="ec-title">${title}</span>${desc}
        <div class="ec-foot">${stat}</div>`;
  }

  // fallback
  return `${cat}<span class="ec-title">${title}</span>${desc}`;
}

/**
 * Render a full <a> entry-card. Produces uniform outer markup with
 * data-category + data-type for CSS hooks.
 */
export function renderEntryCard(entry, fromPath, opts = {}) {
  const href = fromPath ? relPath(fromPath, entry.path) : entry.path;
  const extraData = opts.extraData || '';
  return `
        <a class="entry-card" href="${escapeHtml(href)}" data-category="${escapeHtml(entry.category)}" data-type="${escapeHtml(entry.type)}"${extraData ? ' ' + extraData : ''}>
          ${renderCardBody(entry)}
        </a>`;
}
