/**
 * Nutrition lookup via USDA FoodData Central (FDC) API.
 * https://fdc.nal.usda.gov/api-guide.html — free, no commercial restriction,
 * registration is light (sign up for an API key, set USDA_API_KEY env var).
 *
 * Pattern (mirrors jiaoluo-shuwu reference-data vendoring):
 *   1. Cache responses on disk: data/_reference/usda-cache.json
 *   2. Build NEVER hits network unless USDA_REFRESH=1 is set
 *   3. Missing entries log a warning and skip nutrition for that ingredient
 *
 * Per-recipe nutrition is computed at build time:
 *   - Each ingredient with a usda_fdc_id (or ingredient page mapped slug→fdc_id)
 *     contributes its scaled grams of macros/micros to the recipe total.
 *   - Per-serving = total / servings.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ingredientGrams } from './units.mjs';

const NUTRIENT_IDS = {
  // FDC nutrient numbers (https://fdc.nal.usda.gov/portal-data/external/nutrients)
  energy_kcal: 1008,
  protein_g: 1003,
  fat_g: 1004,
  saturated_fat_g: 1258,
  carbs_g: 1005,
  fiber_g: 1079,
  sugar_g: 2000,
  sodium_mg: 1093,
  potassium_mg: 1092,
  calcium_mg: 1087,
  iron_mg: 1089,
  vitamin_c_mg: 1162,
  vitamin_a_iu: 1104,
};

const CACHE_REL = 'data/_reference/usda-cache.json';

export function loadCache(rootDir) {
  const p = path.join(rootDir, CACHE_REL);
  if (!fs.existsSync(p)) return { fetched: null, foods: {} };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return { fetched: null, foods: {} }; }
}

export function saveCache(rootDir, cache) {
  const p = path.join(rootDir, CACHE_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cache, null, 2), 'utf8');
}

/**
 * Fetch nutrient data for a single FDC id and store the trimmed-down record
 * in cache. Only runs if USDA_REFRESH=1 and USDA_API_KEY is set.
 */
export async function fetchFdcFood(fdcId, apiKey) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA fetch failed (${res.status}) for fdcId ${fdcId}`);
  const data = await res.json();
  const out = { fdcId, description: data.description, dataType: data.dataType, nutrients: {} };
  const nutrients = data.foodNutrients || [];
  for (const [key, id] of Object.entries(NUTRIENT_IDS)) {
    const n = nutrients.find(x => (x.nutrient && x.nutrient.number === String(id)) || x.nutrientId === id);
    if (n) out.nutrients[key] = n.amount ?? n.value ?? null;
  }
  return out;
}

/**
 * Compute total + per-serving nutrition for a recipe.
 * Resolves each ingredient to an FDC food (via ing.usda_fdc_id, or ingredient page's fdc_id).
 * Returns { perServing, total, missing: [...slugs without nutrition] }.
 */
export function computeRecipeNutrition(recipe, ingredientPagesBySlug, cache) {
  const totals = {};
  const missing = [];
  for (const ing of (recipe.ingredients || [])) {
    if (ing.optional) continue;
    let fdcId = ing.usda_fdc_id;
    if (!fdcId && ing.slug) {
      const page = ingredientPagesBySlug.get(ing.slug) || ingredientPagesBySlug.get(ing.slug.replace(/^ingredients\//, ''));
      if (page && page.fm && page.fm.usda_fdc_id) fdcId = page.fm.usda_fdc_id;
    }
    if (!fdcId) {
      if (ing.slug) missing.push(ing.slug);
      continue;
    }
    const food = cache.foods[String(fdcId)];
    if (!food) { missing.push(ing.slug || ing.item); continue; }
    const grams = ingredientGrams(ing);
    if (grams == null) { missing.push(ing.slug || ing.item); continue; }
    const factor = grams / 100; // FDC nutrients are per 100g
    for (const [key, val] of Object.entries(food.nutrients || {})) {
      if (val == null) continue;
      totals[key] = (totals[key] || 0) + val * factor;
    }
  }
  const servings = recipe.servings || 1;
  const perServing = {};
  for (const [k, v] of Object.entries(totals)) perServing[k] = v / servings;
  return { perServing, total: totals, missing };
}

/**
 * Round nutrient values for display.
 */
export function roundNutrition(n) {
  const out = {};
  for (const [k, v] of Object.entries(n || {})) {
    if (v == null) continue;
    if (k.endsWith('_kcal')) out[k] = Math.round(v);
    else if (k.endsWith('_mg') || k.endsWith('_iu')) out[k] = Math.round(v);
    else out[k] = Math.round(v * 10) / 10;
  }
  return out;
}

export { NUTRIENT_IDS };
