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
    const complete = entries.filter(e => e.status === 'complete');

    // Build filter pills from tags + cuisines + courses + diets
    const allTags = new Map();   // tag → count
    const cuisines = new Set();
    const courses = new Set();
    const diets = new Set();
    for (const e of complete) {
      for (const t of (e.tags || [])) allTags.set(t, (allTags.get(t) || 0) + 1);
      if (e.cuisine) cuisines.add(e.cuisine);
      if (e.course) courses.add(e.course);
      for (const d of (e.diet || [])) diets.add(d);
    }

    const filterBar = `
      <div class="filter-bar" role="toolbar" aria-label="Filter entries">
        <div class="filter-group">
          <span class="filter-label">Type</span>
          <button type="button" class="filter-pill active" data-filter-type="all">All</button>
          ${Object.keys(catMeta).map(cat => `<button type="button" class="filter-pill" data-filter-type="${escapeHtml(cat)}">${escapeHtml(catMeta[cat].label)}</button>`).join('')}
        </div>
        ${cuisines.size ? `<div class="filter-group">
          <span class="filter-label">Cuisine</span>
          ${[...cuisines].sort().map(c => `<button type="button" class="filter-pill" data-filter-cuisine="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
        </div>` : ''}
        ${courses.size ? `<div class="filter-group">
          <span class="filter-label">Course</span>
          ${[...courses].sort().map(c => `<button type="button" class="filter-pill" data-filter-course="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
        </div>` : ''}
        ${diets.size ? `<div class="filter-group">
          <span class="filter-label">Diet</span>
          ${[...diets].sort().map(d => `<button type="button" class="filter-pill" data-filter-diet="${escapeHtml(d)}">${escapeHtml(d)}</button>`).join('')}
        </div>` : ''}
      </div>
      <p class="filter-status" data-filter-status></p>`;

    const cardsHtml = complete.map(e => {
      const cardData = `data-card data-cat="${escapeHtml(e.category)}" data-cuisine="${escapeHtml(e.cuisine || '')}" data-course="${escapeHtml(e.course || '')}" data-diet="${(e.diet || []).map(escapeHtml).join('|')}" data-tags="${(e.tags || []).map(escapeHtml).join('|')}"`;
      return entryCard(e).replace('class="entry-card"', `class="entry-card" ${cardData}`);
    }).join('');

    allEl.innerHTML = complete.length
      ? `${filterBar}<div class="card-grid" id="all-grid">${cardsHtml}</div>`
      : `<p class="empty">Add a recipe in <code>content/recipes/</code> and run <code>npm run build</code>.</p>`;

    initFilters();
    initSearch(entries);
  }

  function initFilters() {
    const bar = document.querySelector('.filter-bar');
    if (!bar) return;
    const grid = document.getElementById('all-grid');
    const status = document.querySelector('[data-filter-status]');
    const cards = Array.from(grid.querySelectorAll('[data-card]'));
    const state = { type: 'all', cuisine: null, course: null, diet: null };

    function apply() {
      let visible = 0;
      for (const card of cards) {
        const matchType = state.type === 'all' || card.dataset.cat === state.type;
        const matchCuisine = !state.cuisine || card.dataset.cuisine === state.cuisine;
        const matchCourse = !state.course || card.dataset.course === state.course;
        const matchDiet = !state.diet || (card.dataset.diet || '').split('|').includes(state.diet);
        const show = matchType && matchCuisine && matchCourse && matchDiet;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      }
      const filters = [];
      if (state.type !== 'all') filters.push(state.type);
      if (state.cuisine) filters.push(state.cuisine);
      if (state.course) filters.push(state.course);
      if (state.diet) filters.push(state.diet);
      status.textContent = filters.length
        ? `${visible} ${visible === 1 ? 'entry' : 'entries'} matching ${filters.join(' · ')}`
        : '';
    }

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;
      const types = ['type','cuisine','course','diet'];
      let group = null;
      for (const t of types) if (btn.dataset[`filter${t.charAt(0).toUpperCase() + t.slice(1)}`] !== undefined) group = t;
      if (!group) return;
      const val = btn.dataset[`filter${group.charAt(0).toUpperCase() + group.slice(1)}`];
      // Toggle: clicking active pill clears the filter (except 'type all')
      const wasActive = btn.classList.contains('active');
      bar.querySelectorAll(`[data-filter-${group}]`).forEach(b => b.classList.remove('active'));
      if (group === 'type' && val === 'all') {
        state.type = 'all';
        btn.classList.add('active');
      } else if (wasActive) {
        state[group] = null;
        if (group === 'type') {
          bar.querySelector('[data-filter-type="all"]').classList.add('active');
          state.type = 'all';
        }
      } else {
        state[group] = val;
        btn.classList.add('active');
      }
      apply();
    });
  }

  async function initSearch(entries) {
    const input = $('#home-search');
    const resultsEl = $('#home-search-results');
    if (!input) return;
    let index = null;
    const pathToEntry = new Map(entries.map(e => [e.path, e]));
    let activeIndex = -1; // for keyboard navigation

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'home-search-results');
    input.setAttribute('aria-expanded', 'false');
    resultsEl.setAttribute('role', 'listbox');

    input.addEventListener('focus', async () => {
      if (index) return;
      try { index = await loadJson('data/search-index.json'); } catch {}
    });

    function render(results) {
      if (!results.length) {
        resultsEl.innerHTML = '<li class="sr-empty">No matches</li>';
        resultsEl.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        return;
      }
      resultsEl.innerHTML = results.map(([pid], i) => {
        const path = index.paths[pid];
        const e = pathToEntry.get(path);
        if (!e) return '';
        return `<li role="option" id="sr-opt-${i}"><a href="${escapeHtml(path)}"><span class="sr-cat">${escapeHtml(e.category)}</span><span class="sr-title">${escapeHtml(e.title || '')}</span></a></li>`;
      }).join('');
      resultsEl.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      activeIndex = -1;
    }

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q || !index) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = '';
        input.setAttribute('aria-expanded', 'false');
        return;
      }
      const tokens = q.split(/\s+/).filter(Boolean);
      const scores = new Map();
      for (const tok of tokens) {
        const postings = index.index[tok] || [];
        for (const [pid, score] of postings) scores.set(pid, (scores.get(pid) || 0) + score);
      }
      const top = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
      render(top);
    });

    input.addEventListener('keydown', (e) => {
      const items = resultsEl.querySelectorAll('li[role="option"]');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive(items);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0) {
          e.preventDefault();
          const link = items[activeIndex].querySelector('a');
          if (link) link.click();
        }
      } else if (e.key === 'Escape') {
        input.blur();
        resultsEl.hidden = true;
      }
    });

    function updateActive(items) {
      items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      if (activeIndex >= 0) {
        input.setAttribute('aria-activedescendant', `sr-opt-${activeIndex}`);
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    input.addEventListener('blur', () => setTimeout(() => {
      resultsEl.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }, 200));

    // global '/' shortcut to focus search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
