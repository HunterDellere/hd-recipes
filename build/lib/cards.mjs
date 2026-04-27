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

/**
 * Format a duration in minutes to a compact human string.
 *   45    → "45 min"
 *   90    → "1 h 30 min"
 *   120   → "2 h"
 *   1455  → "1 d 0 h 15 min"  (mostly for brining/marinating recipes)
 *   1535  → "1 d 1 h 35 min"
 */
export function fmtMinutes(min) {
  const n = Number(min);
  if (!isFinite(n) || n <= 0) return '';
  if (n < 60) return `${Math.round(n)} min`;
  const days = Math.floor(n / 1440);
  const hours = Math.floor((n - days * 1440) / 60);
  const mins = Math.round(n - days * 1440 - hours * 60);
  const parts = [];
  if (days)  parts.push(`${days} d`);
  if (hours || days) parts.push(`${hours} h`);
  if (mins)  parts.push(`${mins} min`);
  return parts.join(' ');
}

/**
 * Compact framing for the passive (unattended) phase of a recipe — the brine,
 * marinate, chill, rest, ferment portion that doesn't tie up the cook.
 *   <60         → "" (no annotation; gets folded into total)
 *   60–179      → "+ 2 h rest"
 *   180–479     → "+ 4 h rest"
 *   480–1080    → "+ overnight"  (8–18 h is the canonical overnight window)
 *   1081–2520   → "+ 1 d rest"   (≥18 h up to ~42 h)
 *   >2520       → "+ N d rest"
 */
function fmtPassive(passiveMin) {
  const n = Number(passiveMin);
  if (!isFinite(n) || n < 60) return '';
  if (n < 480) {
    const h = Math.round(n / 60);
    return `+ ${h} h rest`;
  }
  if (n <= 1080) return '+ overnight';
  const days = Math.round(n / 1440);
  return `+ ${days} d rest`;
}

/**
 * Decide how to frame a recipe's time. Returns:
 *   { active, passive, lead, annotation }
 *     active     — minutes the cook is engaged (best estimate)
 *     passive    — unattended minutes (total - active)
 *     lead       — "25 min" (the headline number, formatted)
 *     annotation — "+ overnight" or "" (secondary chip; empty when passive ≪ active)
 *     mode       — 'active' | 'total' (which framing is in use)
 *
 * Heuristic: when passive ≥ max(60, 2×active), lead with active. Otherwise
 * lead with total (the standard framing for short recipes where rest is
 * negligible or already folded into total).
 */
export function frameRecipeTime(time) {
  if (!time) return null;
  const total = Number(time.total_min) || 0;
  const prep = Number(time.prep_min) || 0;
  const cook = Number(time.cook_min) || 0;
  const declaredActive = Number(time.active_min);
  const active = isFinite(declaredActive) && declaredActive > 0
    ? declaredActive
    : (prep + cook) || total;
  const passive = Math.max(0, total - active);

  // If active and total are roughly the same, just show total — the standard
  // recipe-card affordance.
  const passiveDominant = passive >= Math.max(60, 2 * active);
  if (!passiveDominant || !active) {
    return { active, passive, total, lead: fmtMinutes(total || active), annotation: '', mode: 'total' };
  }
  return {
    active, passive, total,
    lead: fmtMinutes(active),
    annotation: fmtPassive(passive),
    mode: 'active',
  };
}

/**
 * For sort/filter purposes — the time dimension users actually care about
 * is "how much of my evening does this take." That's active, with passive
 * folded in only when active isn't declared.
 */
export function filterableTime(time) {
  if (!time) return null;
  const declaredActive = Number(time.active_min);
  if (isFinite(declaredActive) && declaredActive > 0) return declaredActive;
  const prep = Number(time.prep_min) || 0;
  const cook = Number(time.cook_min) || 0;
  if (prep + cook > 0) return prep + cook;
  return Number(time.total_min) || null;
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
 * Compute reverse-link counts and lists from all entries in one O(n) pass.
 * Returns:
 *   ingUsedIn:    Map<ingredient_slug, number_of_recipes>
 *   techUsedIn:   Map<technique_slug,  number_of_recipes>
 *   eqUsedIn:     Map<equipment_slug,  Array<{title, path}>>
 *                   Populated from recipe `equipment[]` frontmatter; empty
 *                   for any equipment slug not yet referenced by a recipe.
 *   cuisineCount: Map<cuisine_name,    number_of_recipes>
 *   hubMembers:   Map<hub_path,        number_of_members>
 *   inHubs:       Map<entry_path,      Array<{title, path}>>
 *                   Reverse hub-membership: every recipe (or other entry)
 *                   referenced in a hub's members[] gets a list of the
 *                   hubs that include it.
 */
export function computeReverseLinks(entries) {
  const ingUsedIn = new Map();   // slug → count (card stats)
  const ingRecipes = new Map();  // slug → [{title, path}] (ingredient pages)
  const techUsedIn = new Map();  // slug → count (card stats)
  const techRecipes = new Map(); // slug → [{title, path}] (technique pages)
  const eqUsedIn = new Map();    // slug → [{title, path}]
  const cuisineCount = new Map();
  const hubMembers = new Map();
  const hubMix = new Map();    // hub_path → { recipes: n, techniques: n, ... }
  const inHubs = new Map();

  // Helper: register a recipe → technique link, avoiding double counts when the
  // same technique appears in both fm.techniques[] and step.technique.
  function registerTech(slug, recipe) {
    if (!slug) return;
    if (!techRecipes.has(slug)) techRecipes.set(slug, []);
    const list = techRecipes.get(slug);
    if (!list.some(x => x.path === recipe.path)) {
      list.push({ title: recipe.title, path: recipe.path });
      techUsedIn.set(slug, (techUsedIn.get(slug) || 0) + 1);
    }
  }

  for (const e of entries) {
    if (e.status !== 'complete') continue;
    if (e.type === 'recipe') {
      for (const ing of (e.ingredients || [])) {
        const s = (ing.slug || '').replace(/^ingredients\//, '');
        if (!s) continue;
        ingUsedIn.set(s, (ingUsedIn.get(s) || 0) + 1);
        if (!ingRecipes.has(s)) ingRecipes.set(s, []);
        ingRecipes.get(s).push({ title: e.title, path: e.path });
      }
      for (const t of (e.techniques || [])) {
        registerTech(String(t).replace(/^techniques\//, ''), e);
      }
      for (const step of (e.steps || [])) {
        if (step && step.technique) registerTech(String(step.technique).replace(/^techniques\//, ''), e);
      }
      for (const eq of (e.equipment || [])) {
        const s = String(eq).replace(/^equipment\//, '');
        if (!s) continue;
        if (!eqUsedIn.has(s)) eqUsedIn.set(s, []);
        eqUsedIn.get(s).push({ title: e.title, path: e.path });
      }
      if (e.cuisine) cuisineCount.set(e.cuisine, (cuisineCount.get(e.cuisine) || 0) + 1);
    }
    if (e.type === 'hub') {
      const members = (e.members || (e._fm && e._fm.members) || []);
      if (Array.isArray(members)) {
        hubMembers.set(e.path, members.length);
        const mix = {};
        for (const m of members) {
          // Members reference targets by slug-with-category, e.g. "recipes/foo".
          const key = m.slug || m;
          if (!key) continue;
          const slugStr = String(key).replace(/^pages\//, '').replace(/\.html$/, '');
          const normalized = `pages/${slugStr}.html`;
          if (!inHubs.has(normalized)) inHubs.set(normalized, []);
          inHubs.get(normalized).push({ title: e.title, path: e.path });
          // Category mix: derive from the slug prefix (e.g. "recipes/foo" → recipes)
          const cat = slugStr.split('/')[0] || 'other';
          mix[cat] = (mix[cat] || 0) + 1;
        }
        hubMix.set(e.path, mix);
      }
    }
  }
  // Stable sort lists for deterministic output
  for (const list of inHubs.values())      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en'));
  for (const list of eqUsedIn.values())    list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en'));
  for (const list of techRecipes.values()) list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en'));
  for (const list of ingRecipes.values())  list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'en'));
  return { ingUsedIn, ingRecipes, techUsedIn, techRecipes, eqUsedIn, cuisineCount, hubMembers, hubMix, inHubs };
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
  const { ingUsedIn, techUsedIn, cuisineCount, hubMembers, hubMix, ingHasNutrition } = ctx;
  const c = {};
  if (entry.type === 'recipe') {
    c.totalMinutes = entry.time && entry.time.total_min || null;
    c.diffLabel = entry.difficulty || null;
    const framed = frameRecipeTime(entry.time);
    if (framed) {
      c.timeLead = framed.lead;
      c.timeAnnotation = framed.annotation;
      c.timeMode = framed.mode; // 'active' | 'total'
      c.activeMinutes = framed.active;
    }
    c.filterMinutes = filterableTime(entry.time);
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
    c.memberMix = (hubMix && hubMix.get(entry.path)) || {};
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
    if (card.timeLead) {
      const annot = card.timeAnnotation
        ? `<span class="ec-time-annot">${escapeHtml(card.timeAnnotation)}</span>`
        : '';
      const lead = card.timeMode === 'active'
        ? `<span class="ec-time-active"><strong>${escapeHtml(card.timeLead)}</strong> active</span>`
        : `<strong>${escapeHtml(card.timeLead)}</strong>`;
      meta.push(`<span class="ec-meta-item ec-meta-time">${lead}${annot}</span>`);
    } else if (card.totalMinutes) {
      meta.push(`<span class="ec-meta-item ec-meta-time">${escapeHtml(fmtMinutes(card.totalMinutes))}</span>`);
    }
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
    const mix = card.memberMix || {};
    // Build "5 recipes · 2 techniques" label from the mix in canonical order
    const ORDER = ['recipes', 'ingredients', 'techniques', 'cuisines', 'equipment'];
    const parts = [];
    for (const k of ORDER) {
      if (mix[k]) {
        const singular = k.replace(/s$/, '');
        parts.push(`<span class="ec-mix-item ec-mix-${k}"><strong>${mix[k]}</strong> ${mix[k] === 1 ? singular : k}</span>`);
      }
    }
    const mixHtml = parts.length
      ? `<div class="ec-mix">${parts.join('')}</div>`
      : (m > 0 ? `<span class="ec-stat"><strong>${m}</strong> ${m === 1 ? 'entry' : 'entries'}</span>` : '');
    const stack = `<span class="ec-hub-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M7 6 V4 a1 1 0 0 1 1 -1 h8 a1 1 0 0 1 1 1 v2"/><line x1="3" y1="11" x2="21" y2="11"/></svg></span>`;
    return `<span class="ec-cat-row">${stack}<span class="ec-cat">collection</span></span><span class="ec-title">${title}</span>${desc}
        <div class="ec-foot">${mixHtml}</div>`;
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
