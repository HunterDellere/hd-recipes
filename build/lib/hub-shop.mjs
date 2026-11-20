/**
 * hub-shop — a combined shopping list for a hub whose members are cooked
 * together (a holiday menu).
 *
 * Every member recipe contributes its ingredient rows, backups included.
 * Rows for the same ingredient merge across recipes into one shopping row,
 * and each merged row carries per-member parts in data-choice-parts:
 *   { c: [memberKey], q: grams, x: [memberKey] }
 * The member cards on the hub page are the picker (scripts/recipe.js →
 * initChoices): a part counts only while its member is selected, and never
 * while a member listed in `x` is selected. `x` is how a homemade component
 * on the menu (crème fraîche) removes the store-bought row from the list,
 * and how the store-bought row comes back if that component is toggled off.
 *
 * Enabled per hub with `shopping_list: true`. Members with `backup: true`
 * start unselected.
 */

import { classifyIngredients } from './units.mjs';
import { sectionFor } from './shop-section.mjs';
import { normItem, bareSlugRef, renderShopSections } from './recipe-render.mjs';

// Mass units fold into grams so "1 kg" and "200 g" of the same item merge.
const MASS_TO_G = { g: 1, kg: 1000, mg: 0.001, oz: 28.3495, lb: 453.592 };

// Words that change how a cook describes an item but not what they buy.
// Used only for the merge key of rows without an ingredient-page slug;
// the shopping row still shows the first contributor's own wording.
const FORM_WORDS = /\b(leaves|leaf|sprigs?|fronds|unsalted|unfiltered|low-sodium|whole|freshly|fresh|cold)\b/g;

// Tap water and ice are on ingredient lists but never on a shopping list.
const NOT_BOUGHT = /^(cold |warm |hot |boiling |ice )?(water|ice)( |$)/;

export function memberKey(member) {
  return String(member.slug || '').replace(/^.*\//, '');
}

function normalizeRecipeRef(ref) {
  return String(ref || '').replace(/^pages\//, '').replace(/\.html$/, '').replace(/^\/+/, '');
}

function mergeKeyFor(row) {
  const slug = bareSlugRef(row.ing.slug);
  if (slug) return slug;
  // "apple cider, for the wrap" and "apple cider, for spritzing" are one
  // purchase, so a trailing purpose clause is dropped from the key.
  return normItem(String(row.ing.item || '').replace(/,\s*for\b.*$/i, ''))
    .replace(FORM_WORDS, ' ').replace(/\s+/g, ' ').trim();
}

function toBase(qty, unit) {
  const u = String(unit || 'each').toLowerCase();
  if (typeof qty !== 'number') return { qty, unit: unit || '' };
  if (MASS_TO_G[u] != null) return { qty: qty * MASS_TO_G[u], unit: 'g' };
  return { qty, unit: unit || '' };
}

// Rows the recipe itself shows by default: derived splits are already inside
// their parent pack, and pick-your-own rows count only for default choices.
function defaultChoiceKeys(fm) {
  const keys = new Set();
  for (const g of (fm.choices && fm.choices.groups) || []) {
    for (const o of g.options || []) if (o.default) keys.add(o.key);
  }
  return keys;
}

function rowIsDefault(ing, defaults) {
  if (!ing.choice) return true;
  const keys = Array.isArray(ing.choice) ? ing.choice : [ing.choice];
  return keys.some(k => defaults.has(k));
}

// Member keys whose selection means this row is made at home, not bought.
function homemadeExclusions(ing, fm, keyByRecipe) {
  const out = new Set();
  const direct = keyByRecipe.get(normalizeRecipeRef(ing.recipe));
  if (direct) out.add(direct);
  for (const alt of fm.homemade_alternatives || []) {
    if (!alt || !alt.recipe_slug || normItem(alt.for) !== normItem(ing.item)) continue;
    const key = keyByRecipe.get(normalizeRecipeRef(alt.recipe_slug));
    if (key) out.add(key);
  }
  return [...out];
}

function memberRecipes(fm, entriesByPath) {
  return (fm.members || []).map(m => {
    const target = entriesByPath.get(`pages/${m.slug}.html`) || entriesByPath.get(m.slug);
    if (!target || target.type !== 'recipe' || !target._fm) return null;
    return { member: m, key: memberKey(m), fm: target._fm };
  }).filter(Boolean);
}

/**
 * Merge every member recipe's rows into shopping aggregates in the shape
 * renderShopSections() expects.
 */
export function aggregateHubShop(hubFm, entriesByPath, ingredientBySlug) {
  const recipes = memberRecipes(hubFm, entriesByPath);
  const keyByRecipe = new Map(recipes.map(r => [normalizeRecipeRef(r.member.slug), r.key]));
  const selectedByDefault = new Set(recipes.filter(r => !r.member.backup).map(r => r.key));
  const order = [];
  const groups = new Map();
  const rowsByKey = new Map(recipes.map(r => [r.key, shoppableRows(r.fm, ingredientBySlug)]));

  // A homemade component (crème fraîche) is only worth making while a dish
  // that uses it is on, so its parts also carry `u`: the members using it.
  const usersOf = new Map();
  for (const r of recipes) {
    for (const row of rowsByKey.get(r.key)) {
      for (const k of homemadeExclusions(row.ing, r.fm, keyByRecipe)) {
        if (!usersOf.has(k)) usersOf.set(k, new Set());
        usersOf.get(k).add(r.key);
      }
    }
  }
  const isOnByDefault = (part) => part.c.some(k => selectedByDefault.has(k))
    && !(part.x || []).some(k => selectedByDefault.has(k))
    && (!part.u || part.u.some(k => selectedByDefault.has(k)));

  for (const r of recipes) {
    const users = usersOf.has(r.key) ? [...usersOf.get(r.key)] : null;
    for (const row of rowsByKey.get(r.key)) {
      const base = toBase(row.ing.qty, row.ing.unit);
      const unitPart = row.role === 'pack' ? `pack:${(row.pack && row.pack.size_label) || ''}` : (base.unit || 'each');
      const key = `${row.role}|${mergeKeyFor(row)}|${unitPart}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          key, role: row.role, page: row.page, pack: row.pack,
          ing: { ...row.ing, item: String(row.ing.item || '').replace(/,\s*for\b.*$/i, ''), qty: base.qty, unit: base.unit, recipe: undefined },
          totalQty: 0, defaultQty: 0, nonNumericQtys: [], allOptional: true,
          section: sectionFor(row), parts: [],
        };
        groups.set(key, g);
        order.push(g);
      }
      const isText = typeof base.qty !== 'number';
      const q = isText ? 0 : base.qty;
      const exclude = homemadeExclusions(row.ing, r.fm, keyByRecipe);
      // t marks a text quantity ("to taste"): it keeps the row visible
      // while its dish is on, even though it adds nothing to the total.
      const part = { c: [r.key], q, ...(exclude.length ? { x: exclude } : {}), ...(users ? { u: users } : {}), ...(isText ? { t: 1 } : {}) };
      const countsByDefault = isOnByDefault(part);
      g.totalQty += q;
      if (countsByDefault) { g.defaultQty += q; if (isText) g.defaultText = true; }
      if (isText && base.qty) g.nonNumericQtys.push(String(base.qty));
      if (!row.ing.optional) g.allOptional = false;
      g.parts.push(part);
    }
  }

  // The rendered number is the default menu's total, and rows the default
  // menu does not need are emitted hidden, so the page reads correctly before
  // (or without) scripts. Hidden rows keep the full sum so their markup still
  // carries a unit conversion for when the script re-totals and shows them.
  return order.map(g => ({
    ...g,
    totalQty: g.defaultQty > 0 ? g.defaultQty : g.totalQty,
    hidden: g.defaultQty <= 0 && !g.defaultText,
  }));
}

function shoppableRows(fm, ingredientBySlug) {
  const defaults = defaultChoiceKeys(fm);
  return classifyIngredients(fm.ingredients || [], ingredientBySlug)
    .filter(row => row.role !== 'derived' && rowIsDefault(row.ing, defaults))
    .filter(row => !NOT_BOUGHT.test(normItem(row.ing.item)));
}

export function renderHubShop(hubFm, currentPath, entriesByPath, ingredientBySlug) {
  if (!hubFm.shopping_list) return '';
  const aggregates = aggregateHubShop(hubFm, entriesByPath, ingredientBySlug);
  if (!aggregates.length) return '';
  const shopHtml = renderShopSections(aggregates, currentPath, entriesByPath);
  return `
    <section class="hub-shop">
      <span class="section-anchor" id="shopping-list"></span>
      <div class="section-head"><h2>Shopping list</h2><p class="section-blurb">Everything for the dishes switched on above, merged across recipes and grouped by aisle. Switch a dish off, or a backup on, and the list re-totals. Homemade components on the menu replace their store-bought versions.</p></div>
      <div class="recipe-ingredients" data-base-servings="1">
        <div class="ing-controls">
          <div class="ing-control ing-units-control">
            <span class="ing-control-label">Units</span>
            <div class="ing-units" role="group" aria-label="Display units">
              <span class="ing-units-thumb" aria-hidden="true"></span>
              <button type="button" class="ing-units-btn" data-units="metric" aria-pressed="true">
                <span class="ing-units-icon" aria-hidden="true">g</span>
                <span class="ing-units-label">Metric</span>
              </button>
              <button type="button" class="ing-units-btn" data-units="imperial" aria-pressed="false">
                <span class="ing-units-icon" aria-hidden="true">oz</span>
                <span class="ing-units-label">Imperial</span>
              </button>
            </div>
          </div>
          <button type="button" class="ing-shop-btn" data-shop-export aria-label="Copy shopping list to clipboard">
            <svg class="ing-shop-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 5h6a2 2 0 0 1 2 2v2"/><path d="M5 9h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 5a3 3 0 0 1 6 0"/>
            </svg>
            <span>Copy list</span>
          </button>
        </div>
        <details class="ing-panel ing-panel-shop" data-ing-panel="shop" open>
          <summary class="ing-panel-summary">
            <span class="ing-panel-title">Shopping list</span>
            <span class="ing-panel-meta">
              <span class="ing-panel-count"><span data-shop-count>${aggregates.filter(g => !g.hidden).length}</span> items</span>
              <span class="ing-panel-chev" aria-hidden="true">▾</span>
            </span>
          </summary>
          <div class="ing-list-shop">${shopHtml}
          </div>
        </details>
      </div>
    </section>`;
}
