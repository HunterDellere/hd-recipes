/**
 * Unit normalization for ingredient quantities.
 * Conservative — only collapses obvious aliases, keeps grams as the canonical mass unit.
 */

const ALIASES = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg',
  mg: 'mg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', liter: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbl: 'tbsp',
  cup: 'cup', cups: 'cup', c: 'cup',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  pinch: 'pinch', dash: 'pinch',
  clove: 'clove', cloves: 'clove',
  each: 'each', whole: 'each', '': 'each',
};

// Approximate volume → mass for very common ingredients (g per unit).
// Used by nutrition lookup when a recipe lists volume but USDA gives per-100g.
// Keep to reliable conversions; falls back to no-conversion when unknown.
export const VOLUME_TO_G = {
  // generic water-like
  ml: 1,
  l: 1000,
  // teaspoons/tablespoons (water density baseline)
  tsp: 5,
  tbsp: 15,
  cup: 240,
  oz: 28.35,    // weight ounce
  lb: 453.59,
  kg: 1000,
  g: 1,
  mg: 0.001,
};

export function normalizeUnit(u) {
  if (u == null) return 'each';
  const key = String(u).trim().toLowerCase().replace(/\.$/, '');
  return ALIASES[key] || key;
}

export function parseQty(q) {
  if (typeof q === 'number') return q;
  if (typeof q !== 'string') return null;
  const s = q.trim();
  if (!s) return null;
  // unicode fractions
  const FRAC = { '½':0.5,'¼':0.25,'¾':0.75,'⅓':1/3,'⅔':2/3,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875 };
  if (FRAC[s]) return FRAC[s];
  // mixed: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  // simple fraction "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  // plain number
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Whole-piece units that need a per-ingredient grams_per_unit override to
// resolve into a mass. `each` covers eggs, lemons, onions; `clove` covers
// garlic; `pod` / `stick` / `pinch` are spice-shaped pieces.
const PIECE_UNITS = new Set(['each', 'clove', 'pod', 'stick', 'pinch']);

/**
 * Best-effort grams for a given ingredient line. If the unit is mass, exact.
 * If volume, use water-density conversion (rough — acceptable for nutrition
 * estimation; per-ingredient density override is supported via fm.density_g_per_ml).
 *
 * For piece-shaped units (each/clove/pod/stick/pinch), pass grams_per_unit
 * (resolved by caller via per-line override → ingredient page → null).
 */
export function ingredientGrams(ing, density_g_per_ml = 1, grams_per_unit = null) {
  const qty = parseQty(ing.qty);
  if (qty == null) return null;
  const unit = normalizeUnit(ing.unit);

  if (PIECE_UNITS.has(unit)) {
    const g = (typeof grams_per_unit === 'number' && grams_per_unit > 0) ? grams_per_unit : null;
    if (g == null) return null;
    return qty * g;
  }

  const conv = VOLUME_TO_G[unit];
  if (conv == null) return null;
  // Treat tsp/tbsp/cup/ml/l as volume → multiply by density
  const VOLUME_UNITS = new Set(['ml', 'l', 'tsp', 'tbsp', 'cup']);
  if (VOLUME_UNITS.has(unit)) return qty * conv * density_g_per_ml;
  return qty * conv;
}
