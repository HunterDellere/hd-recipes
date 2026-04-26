#!/usr/bin/env node
/**
 * refresh-nutrition.mjs — fetch USDA FoodData Central nutrition records for
 * every ingredient page that declares `usda_fdc_id`, plus any per-recipe overrides.
 *
 * Caches results in data/_reference/usda-cache.json (commit this file).
 *
 * USDA RATE LIMITS:
 *   - 1,000 requests/hour/IP for signed-up keys (api.data.gov default)
 *   - DEMO_KEY: 30 req/hour, 50/day (don't use it)
 *   - Going over → key blocked for 1 hour
 *
 * This script is conservative by default:
 *   - Pace: 1 request every 4 seconds (= 900/hour, well under the cap)
 *   - Per-run cap: --max=N (default 200 — enough for a sensible session, leaves
 *     headroom in the hourly quota)
 *   - Cache is saved after EVERY successful fetch — a kill mid-run loses nothing
 *   - Honors Retry-After / 429 with exponential backoff
 *   - On hard rate-limit error after retries → save and exit cleanly
 *
 * Requires:
 *   USDA_API_KEY=your_key   (free: https://fdc.nal.usda.gov/api-key-signup.html)
 *
 * Flags:
 *   --force         re-fetch every id, even if cached
 *   --verify-only   just print what would be fetched
 *   --max=N         cap fetches this run (default 200)
 *   --pace=MS       ms between requests (default 4000 → 900 req/hr)
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';
import { fetchFdcFood, loadCache, saveCache, sleep } from '../build/lib/nutrition.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FORCE = process.argv.includes('--force');
const VERIFY_ONLY = process.argv.includes('--verify-only');
const maxArg = process.argv.find(a => a.startsWith('--max='));
const paceArg = process.argv.find(a => a.startsWith('--pace='));
const MAX_PER_RUN = maxArg ? parseInt(maxArg.split('=')[1], 10) : 200;
const PACE_MS = paceArg ? parseInt(paceArg.split('=')[1], 10) : 4000;

if (!Number.isFinite(MAX_PER_RUN) || MAX_PER_RUN <= 0) {
  console.error('refresh-nutrition: --max must be a positive integer');
  process.exit(1);
}
if (!Number.isFinite(PACE_MS) || PACE_MS < 1000) {
  console.error('refresh-nutrition: --pace must be ≥1000ms (rate-limit safety)');
  process.exit(1);
}

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
if (apiKey === 'DEMO_KEY') {
  console.error('refresh-nutrition: refusing to use DEMO_KEY (30 req/hr, 50/day cap).');
  console.error('  Sign up for a real key.');
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

const batch = toFetch.slice(0, MAX_PER_RUN);
const skipped = toFetch.length - batch.length;
const estMin = Math.ceil((batch.length * PACE_MS) / 60000);
console.log(`refresh-nutrition: ${batch.length} fetch${batch.length === 1 ? '' : 'es'} this run (pace ${PACE_MS}ms, ~${estMin} min). ${skipped > 0 ? `${skipped} deferred — re-run after the hour ticks.` : ''}`);

let ok = 0, failed = 0, notFound = 0;
let lastRemaining = null;

// Graceful shutdown on Ctrl-C — don't lose what we've fetched
let abort = false;
process.on('SIGINT', () => {
  if (abort) process.exit(130); // double Ctrl-C → hard exit
  console.log('\n  ⚠ shutting down after current request… (Ctrl-C again to force)');
  abort = true;
});

for (let i = 0; i < batch.length; i++) {
  if (abort) break;
  const id = batch[i];
  try {
    const { food, rateRemaining } = await fetchFdcFood(id, apiKey);
    cache.foods[id] = food;
    cache.fetched = new Date().toISOString();
    saveCache(ROOT, cache); // save every iteration — never lose progress
    ok++;
    lastRemaining = rateRemaining;
    const tag = rateRemaining != null ? ` [${rateRemaining} left this hour]` : '';
    process.stdout.write(`  ✓ ${id} — ${food.description?.slice(0, 60) || ''}${tag}\n`);
  } catch (e) {
    if (e.code === 'RATE_LIMIT') {
      failed++;
      console.error(`\n  ✗ ${id}: rate-limited; ${batch.length - i - 1} ids deferred. Re-run after the hour resets.`);
      break;
    }
    if (e.code === 'AUTH') {
      console.error(`\n  ✗ AUTH FAILURE: ${e.message}`);
      console.error('  Check USDA_API_KEY is correct.');
      process.exit(2);
    }
    if (e.code === 'NOT_FOUND') {
      notFound++;
      console.error(`  ✗ ${id}: not found in USDA database — fix the fdc_id in the source content`);
    } else {
      failed++;
      console.error(`  ✗ ${id}: ${e.message}`);
    }
  }
  if (i < batch.length - 1 && !abort) await sleep(PACE_MS);
}

console.log(`\nrefresh-nutrition: ${ok} ok, ${notFound} not-found, ${failed} failed.`);
if (lastRemaining != null) console.log(`Hourly quota remaining: ${lastRemaining}.`);
console.log(`Cache → data/_reference/usda-cache.json`);
process.exit(failed > 0 ? 1 : 0);
