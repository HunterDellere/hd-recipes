/**
 * homepage.js — hd-recipes index rendering.
 * Loads data/entries.json, data/recent.json, data/category-meta.json, data/search-index.json.
 *
 * Renders: featured pick, recently added, family counts, search.
 * The full all-entries grid lives at /pages/explore/* — not on the home.
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

  function featuredCard(e) {
    const meta = [];
    if (e.servings) meta.push(`<strong>${e.servings}</strong> servings`);
    if (e.time && e.time.total_min) meta.push(`<strong>${e.time.total_min}</strong> min`);
    if (e.difficulty) meta.push(`<span class="ff-diff ff-d-${escapeHtml(e.difficulty)}">${escapeHtml(e.difficulty)}</span>`);
    if (e.cuisine) meta.push(escapeHtml(e.cuisine));
    return `
      <a class="ff-card" href="${escapeHtml(e.path)}" data-category="${escapeHtml(e.category)}">
        <div class="ff-body">
          <span class="ff-eyebrow">Recipe</span>
          <h3 class="ff-title">${escapeHtml(e.title || '')}</h3>
          ${e.desc ? `<p class="ff-desc">${escapeHtml(e.desc)}</p>` : ''}
          ${meta.length ? `<div class="ff-meta">${meta.join(' · ')}</div>` : ''}
        </div>
        <span class="ff-arrow" aria-hidden="true">→</span>
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

    // Featured: a complete recipe, biased to recently added but rotated daily-ish
    const recipes = entries.filter(e => e.status === 'complete' && e.type === 'recipe');
    const featuredEl = $('#featured-card');
    if (recipes.length) {
      const dayKey = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      const pick = recipes[dayKey % recipes.length];
      featuredEl.innerHTML = featuredCard(pick);
    } else {
      featuredEl.innerHTML = `<p class="empty">No recipes yet.</p>`;
    }

    // Recent
    const recentEl = $('#recent-list');
    if (recent.length) {
      recentEl.innerHTML = recent.slice(0, 8).map(entryCard).join('');
    } else {
      recentEl.innerHTML = `<p class="empty">No entries yet.</p>`;
    }

    // Family counts
    const cookCount = entries.filter(e => e.status === 'complete' && e.category === 'recipes').length;
    const pantryCount = entries.filter(e => e.status === 'complete' && (e.category === 'ingredients' || e.category === 'equipment')).length;
    const skillsCount = entries.filter(e => e.status === 'complete' && (e.category === 'techniques' || e.category === 'cuisines' || e.category === 'hubs')).length;
    const set = (sel, n) => { const el = document.querySelector(sel); if (el) el.textContent = `${n} ${n === 1 ? 'entry' : 'entries'}`; };
    set('[data-count-cook]', cookCount);
    set('[data-count-pantry]', pantryCount);
    set('[data-count-skills]', skillsCount);

    initSearch(entries);
  }

  async function initSearch(entries) {
    const input = $('#home-search');
    const resultsEl = $('#home-search-results');
    if (!input) return;
    let index = null;
    const pathToEntry = new Map(entries.map(e => [e.path, e]));
    let activeIndex = -1;

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
        return `<li role="option" id="sr-opt-${i}"><a href="${escapeHtml(path)}" data-category="${escapeHtml(e.category)}"><span class="sr-cat">${escapeHtml(e.category)}</span><span class="sr-title">${escapeHtml(e.title || '')}</span></a></li>`;
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
