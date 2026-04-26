#!/usr/bin/env node
/**
 * refresh-nutrition.mjs — fetch USDA FoodData Central nutrition records for
 * every ingredient page that declares `usda_fdc_id`, plus any per-recipe overrides.
 *
 * Caches results in data/_reference/usda-cache.json (commit this file).
 *
 * Requires:
 *   USDA_API_KEY=your_key   (free: https://fdc.nal.usda.gov/api-key-signup.html)
 *
 * Flags:
 *   --force         re-fetch every id, even if cached
 *   --verify-only   just print what would be fetched
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';
import { fetchFdcFood, loadCache, saveCache } from '../build/lib/nutrition.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FORCE = process.argv.includes('--force');
const VERIFY_ONLY = process.argv.includes('--verify-only');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

const apiKey = process.env.USDA_API_KEY;
if (!apiKey && !VERIFY_ONLY) {
  console.error('refresh-nutrition: USDA_API_KEY not set.');
  console.error('  Get a free key at https://fdc.nal.usda.gov/api-key-signup.html');
  console.error('  Then: export USDA_API_KEY=...');
  process.exit(1);
}

const cache = loadCache(ROOT);
const ids = new Set();

for (const fp of walk(path.join(ROOT, 'content'))) {
  const { data: fm } = matter(fs.readFileSync(fp, 'utf8'));
  if (fm.usda_fdc_id) ids.add(String(fm.usda_fdc_id));
  for (const ing of (fm.ingredients || [])) {
    if (ing.usda_fdc_id) ids.add(String(ing.usda_fdc_id));
  }
}

const toFetch = [...ids].filter(id => FORCE || !cache.foods[id]);
if (!toFetch.length) {
  console.log(`refresh-nutrition: cache up-to-date (${ids.size} ids tracked).`);
  process.exit(0);
}

if (VERIFY_ONLY) {
  console.log(`Would fetch ${toFetch.length} record(s):`, toFetch);
  process.exit(0);
}

console.log(`Fetching ${toFetch.length} USDA records…`);
let ok = 0, failed = 0;
for (const id of toFetch) {
  try {
    cache.foods[id] = await fetchFdcFood(id, apiKey);
    ok++;
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 80)); // gentle pace
  } catch (e) {
    failed++;
    console.error(`\n  ✗ ${id}: ${e.message}`);
  }
}
cache.fetched = new Date().toISOString();
saveCache(ROOT, cache);
console.log(`\nrefresh-nutrition: ${ok} ok, ${failed} failed. Cache → data/_reference/usda-cache.json`);
