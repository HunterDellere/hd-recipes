/**
 * homepage.js — hd-recipes index rendering.
 * Loads data/entries.json, data/recent.json, data/category-meta.json, data/search-index.json.
 */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtTime(t) {
    if (!t || !t.total_min) return '';
    return `${t.total_min} min`;
  }

  function entryCard(e) {
    const meta = [];
    if (e.cuisine) meta.push(escapeHtml(e.cuisine));
    if (e.course) meta.push(escapeHtml(e.course));
    if (e.time && e.time.total_min) meta.push(fmtTime(e.time));
    return `
      <a class="entry-card" href="${escapeHtml(e.path)}" data-category="${escapeHtml(e.category)}">
        <span class="ec-cat">${escapeHtml(e.category)}</span>
        <span class="ec-title">${escapeHtml(e.title || '')}</span>
        ${e.desc ? `<span class="ec-desc">${escapeHtml(e.desc.slice(0, 110))}</span>` : ''}
        ${meta.length ? `<span class="ec-meta">${meta.join(' · ')}</span>` : ''}
      </a>`;
  }

  async function loadJson(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Failed to load ${path}`);
    return r.json();
  }

  async function init() {
    let entries = [], recent = [], catMeta = {};
    try {
      [entries, recent, catMeta] = await Promise.all([
        loadJson('data/entries.json'),
        loadJson('data/recent.json'),
        loadJson('data/category-meta.json'),
      ]);
    } catch (e) {
      $('#recent-list').innerHTML = `<p class="empty">No data yet — run <code>npm run build</code>.</p>`;
      return;
    }

    const recentEl = $('#recent-list');
    if (recent.length) recentEl.innerHTML = recent.slice(0, 8).map(entryCard).join('');
    else recentEl.innerHTML = `<p class="empty">No entries yet.</p>`;

    const catEl = $('#cat-list');
    const catCounts = {};
    for (const e of entries) {
      if (e.status !== 'complete') continue;
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    }
    catEl.innerHTML = Object.entries(catMeta).map(([key, m]) => `
      <a class="cat-card" href="#cat-${escapeHtml(key)}" data-category="${escapeHtml(key)}">
        <span class="cc-label">${escapeHtml(m.label)}</span>
        <span class="cc-blurb">${escapeHtml(m.blurb || '')}</span>
        <span class="cc-count">${catCounts[key] || 0}</span>
      </a>`).join('');

    const allEl = $('#all-list');
    const groups = new Map();
    for (const e of entries) {
      if (e.status !== 'complete') continue;
      if (!groups.has(e.category)) groups.set(e.category, []);
      groups.get(e.category).push(e);
    }
    const out = [];
    for (const [cat, list] of groups) {
      out.push(`<h3 id="cat-${cat}" class="cat-h">${escapeHtml((catMeta[cat] || {}).label || cat)}</h3>`);
      out.push(`<div class="card-grid">${list.map(entryCard).join('')}</div>`);
    }
    allEl.innerHTML = out.join('') || `<p class="empty">Add a recipe in <code>content/recipes/</code> and run <code>npm run build</code>.</p>`;

    initSearch(entries);
  }

  async function initSearch(entries) {
    const input = $('#home-search');
    const resultsEl = $('#home-search-results');
    if (!input) return;
    let index = null;
    const pathToEntry = new Map(entries.map(e => [e.path, e]));

    input.addEventListener('focus', async () => {
      if (index) return;
      try { index = await loadJson('data/search-index.json'); } catch {}
    });

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q || !index) { resultsEl.hidden = true; resultsEl.innerHTML = ''; return; }
      const tokens = q.split(/\s+/).filter(Boolean);
      const scores = new Map();
      for (const tok of tokens) {
        const postings = index.index[tok] || [];
        for (const [pid, score] of postings) scores.set(pid, (scores.get(pid) || 0) + score);
      }
      const top = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (!top.length) { resultsEl.hidden = true; resultsEl.innerHTML = ''; return; }
      resultsEl.innerHTML = top.map(([pid]) => {
        const path = index.paths[pid];
        const e = pathToEntry.get(path);
        if (!e) return '';
        return `<li><a href="${escapeHtml(path)}"><span class="sr-cat">${escapeHtml(e.category)}</span><span class="sr-title">${escapeHtml(e.title || '')}</span></a></li>`;
      }).join('');
      resultsEl.hidden = false;
    });

    input.addEventListener('blur', () => setTimeout(() => { resultsEl.hidden = true; }, 200));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
