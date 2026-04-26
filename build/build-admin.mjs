#!/usr/bin/env node
/**
 * build-admin.mjs — generate the secret admin dashboard for hd-recipes.
 *
 * Reads:  data/entries.json, data/_admin/findings.json (if present),
 *         data/nutrition.json
 * Writes: pages/_admin/review.html
 *
 * Not linked from public surfaces. Bookmark the URL: /pages/_admin/review.html
 *   - meta robots noindex,nofollow
 *   - excluded from sitemap, search index, recent
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const entriesPath   = path.join(ROOT, 'data', 'entries.json');
const findingsPath  = path.join(ROOT, 'data', '_admin', 'findings.json');
const nutritionPath = path.join(ROOT, 'data', 'nutrition.json');
const outDir = path.join(ROOT, 'pages', '_admin');
const outPath = path.join(outDir, 'review.html');

if (!fs.existsSync(entriesPath)) {
  console.error('build-admin: data/entries.json missing — run build first.');
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
const findings = fs.existsSync(findingsPath) ? JSON.parse(fs.readFileSync(findingsPath, 'utf8')) : { findings: [] };
const nutrition = fs.existsSync(nutritionPath) ? JSON.parse(fs.readFileSync(nutritionPath, 'utf8')) : {};

const REVIEW_STATES = ['verified', 'pending', 'needs-work', 'missing'];

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const stats = { complete: 0, draft: 0, stub: 0, byReview: {}, byCategory: {} };
for (const s of REVIEW_STATES) stats.byReview[s] = 0;
for (const e of entries) {
  stats[e.status] = (stats[e.status] || 0) + 1;
  stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
}

const findingsByFile = new Map();
for (const f of (findings.findings || [])) {
  if (!findingsByFile.has(f.file)) findingsByFile.set(f.file, []);
  findingsByFile.get(f.file).push(f);
}

const recipesMissingNutrition = [];
for (const e of entries) {
  if (e.type !== 'recipe' || e.status !== 'complete') continue;
  const n = nutrition[e.path];
  if (!n || !n.perServing || !Object.keys(n.perServing).length) {
    recipesMissingNutrition.push(e);
  }
}

const completeEntries = entries.filter(e => e.status === 'complete');
for (const e of completeEntries) {
  const review = e.content_review || 'missing';
  stats.byReview[review] = (stats.byReview[review] || 0) + 1;
}

const rows = entries.map(e => {
  const fileFindings = findingsByFile.get(e.path) || [];
  const review = e.content_review || (e.status === 'complete' ? 'missing' : '—');
  const fdcMissing = e.type === 'recipe' && nutrition[e.path] && nutrition[e.path].missing && nutrition[e.path].missing.length;
  return `
    <tr data-status="${escapeHtml(e.status)}" data-review="${escapeHtml(review)}" data-category="${escapeHtml(e.category)}" data-type="${escapeHtml(e.type)}">
      <td><a href="../../${escapeHtml(e.path)}">${escapeHtml(e.title || e.path)}</a></td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.type)}</td>
      <td><span class="pill st-${escapeHtml(e.status)}">${escapeHtml(e.status)}</span></td>
      <td><span class="pill rv-${escapeHtml(review)}">${escapeHtml(review)}</span></td>
      <td>${e.updated || ''}</td>
      <td>${fileFindings.length ? `<span class="pill warn">${fileFindings.length}</span>` : ''}</td>
      <td>${fdcMissing ? `<span class="pill warn">${fdcMissing} FDC</span>` : ''}</td>
    </tr>`;
}).join('');

const generated = new Date().toISOString();

const html = `<!DOCTYPE html>
<!-- {"type":"admin","category":"_admin","status":"complete"} -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Review · hd recipes admin</title>
<style>
body { font-family: 'Inter', system-ui, sans-serif; background: #faf6ee; color: #2a1f10; margin: 0; padding: 1.5rem 2rem; }
h1 { font-family: 'EB Garamond', serif; margin: 0 0 1rem; }
.bar { display: flex; flex-wrap: wrap; gap: 1.5rem; padding: 1rem; background: #fffaf0; border: 1px solid #e6dcc6; border-radius: 8px; margin-bottom: 1rem; }
.stat { display: flex; flex-direction: column; }
.stat-num { font-size: 24px; font-weight: 700; color: #b8423a; }
.stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #8a7a60; }
.filters { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .75rem; align-items: center; }
.filters input, .filters select { font: inherit; padding: 6px 10px; border: 1px solid #e6dcc6; border-radius: 6px; background: #fff; }
table { width: 100%; border-collapse: collapse; background: #fffaf0; }
th, td { padding: .5rem .75rem; text-align: left; border-bottom: 1px solid #f0e8d4; font-size: 14px; }
th { background: #f5edd6; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #5a4a36; cursor: pointer; }
.pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
.st-complete { background: #dde9d4; color: #3a6e1a; }
.st-draft    { background: #fff0d0; color: #8a5a10; }
.st-stub     { background: #ddd; color: #666; }
.rv-verified { background: #dde9d4; color: #3a6e1a; }
.rv-pending  { background: #fff0d0; color: #8a5a10; }
.rv-needs-work { background: #fce0d8; color: #8b2e26; }
.rv-missing  { background: #fce0d8; color: #8b2e26; }
.warn        { background: #fce0d8; color: #8b2e26; }
.gen { font-size: 11px; color: #8a7a60; margin-top: 1rem; }
.note { background: #fff0d0; padding: .75rem 1rem; border-radius: 6px; margin: 1rem 0; font-size: 13px; }
</style>
</head>
<body>
<h1>hd · recipes — admin</h1>
<div class="bar">
  <div class="stat"><span class="stat-num">${stats.complete || 0}</span><span class="stat-label">Complete</span></div>
  <div class="stat"><span class="stat-num">${stats.draft || 0}</span><span class="stat-label">Draft</span></div>
  <div class="stat"><span class="stat-num">${stats.stub || 0}</span><span class="stat-label">Stub</span></div>
  ${REVIEW_STATES.map(s => `<div class="stat"><span class="stat-num">${stats.byReview[s] || 0}</span><span class="stat-label">${s}</span></div>`).join('')}
  <div class="stat"><span class="stat-num">${recipesMissingNutrition.length}</span><span class="stat-label">No nutrition</span></div>
</div>

${recipesMissingNutrition.length ? `<div class="note"><strong>Recipes missing nutrition data:</strong> ${recipesMissingNutrition.map(e => `<a href="../../${escapeHtml(e.path)}">${escapeHtml(e.title || e.path)}</a>`).join(', ')}. Add <code>usda_fdc_id</code> to ingredient pages, or per-recipe overrides on each ingredient line.</div>` : ''}

<div class="filters">
  <input type="search" id="filter-q" placeholder="Filter title…" />
  <select id="filter-cat"><option value="">All categories</option>${Object.keys(stats.byCategory).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select>
  <select id="filter-status"><option value="">Any status</option><option value="complete">complete</option><option value="draft">draft</option><option value="stub">stub</option></select>
  <select id="filter-review"><option value="">Any review</option>${REVIEW_STATES.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}</select>
</div>

<table id="entries-table">
  <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Status</th><th>Review</th><th>Updated</th><th>Findings</th><th>Nutrition</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<p class="gen">Generated ${generated}</p>

<script>
(function () {
  const q = document.getElementById('filter-q');
  const cat = document.getElementById('filter-cat');
  const st = document.getElementById('filter-status');
  const rv = document.getElementById('filter-review');
  const rows = Array.from(document.querySelectorAll('#entries-table tbody tr'));
  function apply() {
    const qv = q.value.trim().toLowerCase();
    const catV = cat.value, stV = st.value, rvV = rv.value;
    for (const r of rows) {
      const matchQ = !qv || r.cells[0].textContent.toLowerCase().includes(qv);
      const matchC = !catV || r.dataset.category === catV;
      const matchS = !stV || r.dataset.status === stV;
      const matchR = !rvV || r.dataset.review === rvV;
      r.style.display = (matchQ && matchC && matchS && matchR) ? '' : 'none';
    }
  }
  [q, cat, st, rv].forEach(el => el.addEventListener('input', apply));
})();
</script>
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`build-admin: wrote ${path.relative(ROOT, outPath)}`);
