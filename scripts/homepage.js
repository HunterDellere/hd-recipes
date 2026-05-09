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

  // Mirror of build/lib/cards.mjs::fmtMinutes — keep in sync.
  function fmtMinutes(min) {
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

  // Mirror of build/lib/cards.mjs::fmtPassive + frameRecipeTime — keep in sync.
  function fmtPassive(p) {
    const n = Number(p);
    if (!isFinite(n) || n < 60) return '';
    if (n < 480) return `+ ${Math.round(n / 60)} h rest`;
    if (n <= 1080) return '+ overnight';
    return `+ ${Math.round(n / 1440)} d rest`;
  }
  function frameRecipeTime(time) {
    if (!time) return null;
    const total = Number(time.total_min) || 0;
    const prep = Number(time.prep_min) || 0;
    const cook = Number(time.cook_min) || 0;
    const declaredActive = Number(time.active_min);
    const active = isFinite(declaredActive) && declaredActive > 0
      ? declaredActive : (prep + cook) || total;
    const passive = Math.max(0, total - active);
    const passiveDominant = passive >= Math.max(60, 2 * active);
    if (!passiveDominant || !active) {
      return { active, passive, total, lead: fmtMinutes(total || active), annotation: '', mode: 'total' };
    }
    return { active, passive, total, lead: fmtMinutes(active), annotation: fmtPassive(passive), mode: 'active' };
  }

  function cardBody(e) {
    const c = e._card || {};
    const title = `<span class="ec-title">${escapeHtml(e.title || '')}</span>`;
    const desc = e.desc ? `<span class="ec-desc">${escapeHtml(e.desc.slice(0, 110))}</span>` : '';
    const cat = `<span class="ec-cat">${escapeHtml(e.category)}</span>`;

    if (e.type === 'recipe') {
      const meta = [];
      if (e.cuisine) meta.push(`<span class="ec-meta-item">${escapeHtml(e.cuisine)}</span>`);
      if (e.course)  meta.push(`<span class="ec-meta-item">${escapeHtml(e.course)}</span>`);
      if (c.timeLead) {
        const annot = c.timeAnnotation ? `<span class="ec-time-annot">${escapeHtml(c.timeAnnotation)}</span>` : '';
        const lead = c.timeMode === 'active'
          ? `<span class="ec-time-active"><strong>${escapeHtml(c.timeLead)}</strong> active</span>`
          : `<strong>${escapeHtml(c.timeLead)}</strong>`;
        meta.push(`<span class="ec-meta-item ec-meta-time">${lead}${annot}</span>`);
      } else if (c.totalMinutes) {
        meta.push(`<span class="ec-meta-item ec-meta-time">${escapeHtml(fmtMinutes(c.totalMinutes))}</span>`);
      }
      const stats = e.servings ? `<span class="ec-stat"><strong>${e.servings}</strong> serving${e.servings === 1 ? '' : 's'}</span>` : '';
      const diff = c.diffLabel ? `<span class="ec-pill ec-diff ec-d-${escapeHtml(c.diffLabel)}">${escapeHtml(c.diffLabel)}</span>` : '';
      return `${cat}${title}${desc}<div class="ec-foot"><div class="ec-meta">${meta.join('')}</div>${diff}</div>${stats ? `<div class="ec-stats">${stats}</div>` : ''}`;
    }
    if (e.type === 'ingredient') {
      const tag = c.primaryTag ? `<span class="ec-pill ec-pill-tag">${escapeHtml(c.primaryTag)}</span>` : '';
      const used = c.usedInCount > 0 ? `<span class="ec-stat ec-stat-link"><strong>${c.usedInCount}</strong> ${c.usedInCount === 1 ? 'recipe' : 'recipes'}</span>` : '';
      const nut = c.hasNutrition ? `<span class="ec-pill ec-pill-data" title="USDA nutrition data available">USDA</span>` : '';
      return `${cat}${title}${desc}<div class="ec-foot"><div class="ec-meta">${tag}${nut}</div>${used}</div>`;
    }
    if (e.type === 'technique' || e.type === 'cuisine') {
      const used = c.usedInCount > 0 ? `<span class="ec-stat ec-stat-link"><strong>${c.usedInCount}</strong> ${c.usedInCount === 1 ? 'recipe' : 'recipes'}</span>` : '';
      return `${cat}${title}${desc}<div class="ec-foot">${used}</div>`;
    }
    if (e.type === 'equipment') {
      const tag = c.primaryTag ? `<span class="ec-pill ec-pill-tag">${escapeHtml(c.primaryTag)}</span>` : '';
      return `${cat}${title}${desc}<div class="ec-foot">${tag}</div>`;
    }
    if (e.type === 'hub') {
      const m = c.memberCount;
      const stat = m > 0 ? `<span class="ec-stat"><strong>${m}</strong> ${m === 1 ? 'entry' : 'entries'}</span>` : '';
      return `${cat}${title}${desc}<div class="ec-foot">${stat}</div>`;
    }
    return `${cat}${title}${desc}`;
  }

  function entryCard(e) {
    return `
      <a class="entry-card" href="${escapeHtml(e.path)}" data-category="${escapeHtml(e.category)}" data-type="${escapeHtml(e.type)}">
        ${cardBody(e)}
      </a>`;
  }

  function featuredCard(e) {
    const meta = [];
    if (e.servings) meta.push(`<strong>${e.servings}</strong> servings`);
    const framed = frameRecipeTime(e.time);
    if (framed && framed.lead) {
      if (framed.mode === 'active') {
        meta.push(`<strong>${escapeHtml(framed.lead)}</strong> active${framed.annotation ? ' <span class="ff-passive">' + escapeHtml(framed.annotation) + '</span>' : ''}`);
      } else {
        meta.push(escapeHtml(framed.lead));
      }
    }
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
      recentEl.innerHTML = recent.slice(0, 16).map(entryCard).join('');
    } else {
      recentEl.innerHTML = `<p class="empty">No entries yet.</p>`;
    }

    // Family counts — Cook / Pantry / Learn / Traverse
    const cookCount     = entries.filter(e => e.status === 'complete' && e.category === 'recipes').length;
    const pantryCount   = entries.filter(e => e.status === 'complete' && (e.category === 'ingredients' || e.category === 'equipment')).length;
    const learnCount    = entries.filter(e => e.status === 'complete' && e.category === 'techniques').length;
    const traverseCount = entries.filter(e => e.status === 'complete' && (e.category === 'cuisines' || e.category === 'hubs')).length;
    const set = (sel, n) => { const el = document.querySelector(sel); if (el) el.textContent = `${n} ${n === 1 ? 'entry' : 'entries'}`; };
    set('[data-count-cook]', cookCount);
    set('[data-count-pantry]', pantryCount);
    set('[data-count-learn]', learnCount);
    set('[data-count-traverse]', traverseCount);

    // Inject family card art (single source of truth in build/lib/family-render)
    try {
      const art = await loadJson('data/family-art.json');
      document.querySelectorAll('[data-family-art]').forEach(el => {
        const key = el.dataset.familyArt;
        if (art[key]) el.innerHTML = art[key];
      });
    } catch {}

    initSearch(entries);
  }

  // ── Levenshtein distance with early-out at maxDist (typo-tolerance core) ──
  // Returns the actual distance if ≤ maxDist, else maxDist + 1.
  // Using two rolling rows; allocates O(n) once, no per-call alloc.
  const _lvRow = new Int32Array(64);
  const _lvNext = new Int32Array(64);
  function levenshteinBounded(a, b, maxDist) {
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > maxDist) return maxDist + 1;
    if (la === 0) return lb;
    if (lb === 0) return la;
    const row = lb + 1 <= _lvRow.length ? _lvRow : new Int32Array(lb + 1);
    const next = lb + 1 <= _lvNext.length ? _lvNext : new Int32Array(lb + 1);
    for (let j = 0; j <= lb; j++) row[j] = j;
    for (let i = 1; i <= la; i++) {
      next[0] = i;
      let rowMin = i;
      for (let j = 1; j <= lb; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        const v = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + cost);
        next[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > maxDist) return maxDist + 1; // can't recover
      // swap rows
      for (let j = 0; j <= lb; j++) row[j] = next[j];
    }
    return row[lb];
  }

  async function initSearch(entries) {
    const input = $('#home-search');
    const resultsEl = $('#home-search-results');
    const tabsEl = $('#home-search-tabs');
    if (!input) return;
    let index = null;
    let indexKeysCache = null; // cached Object.keys for fuzzy/prefix scans
    const pathToEntry = new Map(entries.map(e => [e.path, e]));
    let activeIndex = -1;
    let scope = 'all'; // 'all' | 'recipe' | 'ingredient' | 'technique'
    let lastScored = []; // [{pid, score, type}] across all scopes — drives tab counts + render

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'home-search-results');
    input.setAttribute('aria-expanded', 'false');
    resultsEl.setAttribute('role', 'listbox');

    input.addEventListener('focus', async () => {
      if (index) return;
      try {
        index = await loadJson('data/search-index.json');
        indexKeysCache = Object.keys(index.index);
      } catch {}
    });

    // ── postings lookup with prefix + substring + bounded Levenshtein ──
    function postingsFor(token) {
      const postings = new Map(); // pid → best score from this token
      const idx = index.index;

      function add(list, multiplier, boost) {
        for (const [pid, s] of list) {
          const score = s * multiplier + (boost || 0);
          const prev = postings.get(pid);
          if (prev === undefined || score > prev) postings.set(pid, score);
        }
      }

      // 1. Exact match (highest weight)
      if (idx[token]) add(idx[token], 1.0, 500);

      const tlen = token.length;
      const isShort = tlen <= 2;
      let foundPrefix = false;

      // 2. Prefix + substring scan over all keys
      for (const key of indexKeysCache) {
        if (key === token) continue;
        if (key.startsWith(token)) {
          add(idx[key], isShort ? 0.6 : 0.7, 0);
          foundPrefix = true;
        } else if (!isShort && key.includes(token)) {
          add(idx[key], 0.4, 0);
        }
      }

      // 3. Levenshtein-1 (typo tolerance) — only when:
      //    - token is ≥4 chars (avoids over-matching short words)
      //    - we have no prefix or exact hit (so "pecorin" → "pecorino" is already
      //      handled by prefix; "peccorino" → "pecorino" needs Levenshtein)
      if (tlen >= 4 && postings.size === 0) {
        for (const key of indexKeysCache) {
          if (Math.abs(key.length - tlen) > 1) continue;
          if (levenshteinBounded(token, key, 1) <= 1) {
            add(idx[key], 0.3, 0);
          }
        }
      }
      return postings;
    }

    function search(query) {
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!tokens.length) return [];
      let combined = null;
      for (const tok of tokens) {
        const partial = postingsFor(tok);
        if (combined === null) {
          combined = partial;
        } else {
          // AND across tokens; sum scores
          const next = new Map();
          for (const [pid, s] of combined) {
            const o = partial.get(pid);
            if (o !== undefined) next.set(pid, s + o);
          }
          combined = next;
        }
        if (combined.size === 0) break;
      }
      // Annotate with type for scoping; keep full ordered list (scoping filters render)
      const out = [];
      for (const [pid, score] of combined) {
        const path = index.paths[pid];
        const e = pathToEntry.get(path);
        if (!e) continue;
        out.push({ pid, score, type: e.type });
      }
      out.sort((a, b) => b.score - a.score);
      return out;
    }

    function render(scored, q) {
      lastScored = scored;
      const counts = { all: scored.length, recipe: 0, ingredient: 0, technique: 0 };
      for (const r of scored) {
        if (counts[r.type] !== undefined) counts[r.type]++;
      }
      // Update tab counts + visibility
      tabsEl.hidden = !scored.length;
      tabsEl.querySelectorAll('[data-scope-count]').forEach(el => {
        const k = el.dataset.scopeCount;
        el.textContent = counts[k] != null ? `(${counts[k]})` : '';
      });

      const filtered = scope === 'all' ? scored : scored.filter(r => r.type === scope);
      if (!filtered.length) {
        if (scored.length && scope !== 'all') {
          resultsEl.innerHTML = `<li class="sr-empty">No ${scope}s match. Try the All tab.</li>`;
        } else {
          resultsEl.innerHTML = '<li class="sr-empty">No matches</li>';
        }
      } else {
        resultsEl.innerHTML = filtered.slice(0, 12).map((r, i) => {
          const path = index.paths[r.pid];
          const e = pathToEntry.get(path);
          if (!e) return '';
          return `<li role="option" id="sr-opt-${i}"><a href="${escapeHtml(path)}" data-category="${escapeHtml(e.category)}"><span class="sr-cat">${escapeHtml(e.category)}</span><span class="sr-title">${escapeHtml(e.title || '')}</span></a></li>`;
        }).join('');
      }
      resultsEl.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      activeIndex = -1;
    }

    function clearResults() {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      tabsEl.hidden = true;
      lastScored = [];
      input.setAttribute('aria-expanded', 'false');
    }

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q || !index) { clearResults(); return; }
      render(search(q), q);
    });

    // Tab clicks scope without re-running search.
    // Capture the click via mousedown + preventDefault so the tab never steals
    // focus from the input — this avoids the blur→hide race that was wiping
    // the dropdown when users tried to switch scope.
    tabsEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.home-search-tab')) e.preventDefault();
    });
    tabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.home-search-tab');
      if (!btn) return;
      const newScope = btn.dataset.scope;
      if (newScope === scope) return;
      scope = newScope;
      tabsEl.querySelectorAll('.home-search-tab').forEach(b => {
        const on = b.dataset.scope === scope;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      render(lastScored, input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
      const items = resultsEl.querySelectorAll('li[role="option"]');
      if (e.key === 'Escape') {
        input.blur();
        clearResults();
        return;
      }
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
      // Don't auto-hide if focus moved into the search container (tabs / results)
      const wrap = input.closest('.home-search-wrap');
      if (wrap && document.activeElement && wrap.contains(document.activeElement)) return;
      resultsEl.hidden = true;
      tabsEl.hidden = true;
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
