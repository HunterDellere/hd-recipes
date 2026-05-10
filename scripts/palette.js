/**
 * palette.js — site-wide command palette.
 *
 * Triggered by Cmd/Ctrl+K on every page. On the homepage the existing `/`
 * shortcut still focuses the inline search box; the palette is additive.
 *
 * Modes:
 *   - "search" (default): typing queries data/search-index.json with the same
 *     ranking as scripts/homepage.js. Postings + prefix + substring + bounded
 *     Levenshtein for typo tolerance.
 *   - "actions": empty query on a recipe page surfaces page-context actions
 *     (toggle units, scale ±, copy list, cook's view, theme, jump/start step N).
 *
 * Zero deps. ~Two screens of code. Kept in sync with the search engine in
 * scripts/homepage.js — if you change ranking there, mirror it here.
 */
(function () {
  'use strict';

  // ── Resolve site root regardless of current page depth ──────────────────
  // Homepage is at /, recipe pages at /pages/<category>/<slug>.html. We need
  // a path prefix that hits data/ and pages/ from anywhere.
  function resolveRoot() {
    // <link rel="canonical"> always points to the absolute URL of the page.
    // Strip the page off and we have the host root. As a fallback, count the
    // number of path segments and emit ../ accordingly.
    const path = location.pathname;
    if (path === '/' || path.endsWith('/index.html') && path.split('/').length === 2) {
      return '';
    }
    const parts = path.split('/').filter(Boolean);
    // /index.html → 1 part (file at root) → ''
    if (parts.length <= 1) return '';
    // /pages/recipes/foo.html → 3 parts → '../../'
    return '../'.repeat(parts.length - 1);
  }

  const ROOT = resolveRoot();

  // ── Levenshtein, bounded — mirror of homepage.js ────────────────────────
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
      if (rowMin > maxDist) return maxDist + 1;
      for (let j = 0; j <= lb; j++) row[j] = next[j];
    }
    return row[lb];
  }

  // ── DOM ─────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'cmd-palette-overlay';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Command palette');
  overlay.innerHTML = `
    <div class="cmd-palette" role="document">
      <div class="cmd-palette-input-wrap">
        <span class="cmd-palette-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input type="search"
               class="cmd-palette-input"
               placeholder="Search recipes, ingredients, techniques — or type to act"
               autocomplete="off"
               spellcheck="false"
               aria-label="Search or run a command">
        <kbd class="cmd-palette-esc" aria-hidden="true">esc</kbd>
      </div>
      <ul class="cmd-palette-results" role="listbox"></ul>
      <div class="cmd-palette-hint">
        <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.cmd-palette-input');
  const resultsEl = overlay.querySelector('.cmd-palette-results');

  let index = null;
  let indexKeys = null;
  let entries = null;
  const pathToEntry = new Map();
  let activeIndex = -1;
  let currentItems = []; // [{kind, label, sub, run, href}]

  // ── Lazy load search data on first open ─────────────────────────────────
  async function ensureData() {
    if (index && entries) return;
    try {
      const [idxResp, entriesResp] = await Promise.all([
        fetch(ROOT + 'data/search-index.json'),
        fetch(ROOT + 'data/entries.json'),
      ]);
      index = await idxResp.json();
      indexKeys = Object.keys(index.index);
      entries = await entriesResp.json();
      pathToEntry.clear();
      for (const e of entries) pathToEntry.set(e.path, e);
    } catch (err) {
      // Network fail (e.g. offline) — fall back to actions-only mode.
    }
  }

  // ── Search ranking — mirror of homepage.js ──────────────────────────────
  function postingsFor(token) {
    if (!index) return new Map();
    const postings = new Map();
    const idx = index.index;
    function add(list, multiplier, boost) {
      for (const [pid, s] of list) {
        const score = s * multiplier + (boost || 0);
        const prev = postings.get(pid);
        if (prev === undefined || score > prev) postings.set(pid, score);
      }
    }
    if (idx[token]) add(idx[token], 1.0, 500);
    const tlen = token.length;
    const isShort = tlen <= 2;
    for (const key of indexKeys) {
      if (key === token) continue;
      if (key.startsWith(token)) add(idx[key], isShort ? 0.6 : 0.7, 0);
      else if (!isShort && key.includes(token)) add(idx[key], 0.4, 0);
    }
    if (tlen >= 4 && postings.size === 0) {
      for (const key of indexKeys) {
        if (Math.abs(key.length - tlen) > 1) continue;
        if (levenshteinBounded(token, key, 1) <= 1) add(idx[key], 0.3, 0);
      }
    }
    return postings;
  }

  function searchEntries(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length || !index) return [];
    let combined = null;
    for (const tok of tokens) {
      const partial = postingsFor(tok);
      if (combined === null) combined = partial;
      else {
        const next = new Map();
        for (const [pid, s] of combined) {
          const o = partial.get(pid);
          if (o !== undefined) next.set(pid, s + o);
        }
        combined = next;
      }
      if (combined.size === 0) break;
    }
    const out = [];
    for (const [pid, score] of combined) {
      const path = index.paths[pid];
      const e = pathToEntry.get(path);
      if (!e) continue;
      out.push({ pid, score, entry: e });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  // ── Page-context actions ────────────────────────────────────────────────
  function buildActions() {
    const actions = [];

    // Theme — universal
    actions.push({
      kind: 'action',
      label: 'Toggle theme (light/dark)',
      sub: 'Visual',
      run: () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('hdr-theme', next); } catch {}
      },
    });

    // Random recipe — universal
    actions.push({
      kind: 'action',
      label: 'Open a random recipe',
      sub: 'Navigation',
      run: () => { location.href = ROOT + 'random.html'; },
    });

    // Recipe-page actions ────────────────────────────────────────────────
    const recipeRoot = document.querySelector('.recipe-ingredients');
    if (recipeRoot) {
      const scaleInput = recipeRoot.querySelector('[data-scale-input]');
      const stepDown = recipeRoot.querySelector('[data-scale-step="-1"]');
      const stepUp = recipeRoot.querySelector('[data-scale-step="1"]');

      function bumpServings(delta) {
        if (!scaleInput) return;
        const cur = parseFloat(scaleInput.value) || 1;
        const next = Math.max(1, Math.min(100, cur + delta));
        scaleInput.value = next;
        scaleInput.dispatchEvent(new Event('input', { bubbles: true }));
        scaleInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (scaleInput) {
        actions.push({ kind: 'action', label: 'Increase servings (+1)', sub: 'Scale', run: () => bumpServings(1) });
        actions.push({ kind: 'action', label: 'Decrease servings (−1)', sub: 'Scale', run: () => bumpServings(-1) });
        actions.push({ kind: 'action', label: 'Double servings', sub: 'Scale', run: () => bumpServings((parseFloat(scaleInput.value) || 1)) });
        actions.push({ kind: 'action', label: 'Halve servings', sub: 'Scale', run: () => bumpServings(-Math.floor((parseFloat(scaleInput.value) || 1) / 2)) });
      }

      const metricBtn = recipeRoot.querySelector('[data-units="metric"]');
      const imperialBtn = recipeRoot.querySelector('[data-units="imperial"]');
      if (metricBtn && imperialBtn) {
        actions.push({
          kind: 'action',
          label: 'Toggle units (metric / imperial)',
          sub: 'Display',
          run: () => {
            const isMetric = metricBtn.getAttribute('aria-pressed') === 'true';
            (isMetric ? imperialBtn : metricBtn).click();
          },
        });
      }

      const shopBtn = document.querySelector('[data-shop-export]');
      if (shopBtn) {
        actions.push({ kind: 'action', label: 'Copy shopping list', sub: 'Recipe', run: () => shopBtn.click() });
      }

      const cookToggle = document.querySelector('[data-cook-toggle]');
      if (cookToggle) {
        actions.push({
          kind: 'action',
          label: cookToggle.getAttribute('aria-pressed') === 'true' ? "Exit cook's view" : "Enter cook's view",
          sub: 'Recipe',
          run: () => cookToggle.click(),
        });
      }

      // Per-step: jump + timer
      const steps = document.querySelectorAll('.recipe-steps .step-item');
      steps.forEach((step, i) => {
        const num = i + 1;
        const stepText = (step.querySelector('.step-body')?.textContent || '').trim().slice(0, 60);
        actions.push({
          kind: 'action',
          label: `Jump to step ${num}`,
          sub: stepText,
          run: () => {
            step.scrollIntoView({ behavior: 'smooth', block: 'center' });
            step.classList.add('step-flash');
            setTimeout(() => step.classList.remove('step-flash'), 1200);
          },
        });
        const timerBtn = step.querySelector('[data-step-timer]');
        if (timerBtn) {
          const min = timerBtn.getAttribute('data-step-timer');
          actions.push({
            kind: 'action',
            label: `Start ${min} min timer for step ${num}`,
            sub: 'Timer',
            run: () => timerBtn.click(),
          });
        }
      });
    }

    return actions;
  }

  // ── Render ──────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render() {
    const q = input.value.trim();
    let items = [];

    if (!q) {
      // Empty query: surface page-context actions.
      items = buildActions();
    } else {
      const scored = searchEntries(q);
      items = scored.slice(0, 10).map(s => ({
        kind: 'entry',
        label: s.entry.title || '',
        sub: s.entry.category,
        href: ROOT + s.entry.path,
        entry: s.entry,
      }));
      // Also include actions whose label matches the query (substring, case-insensitive).
      const ql = q.toLowerCase();
      const acts = buildActions().filter(a => a.label.toLowerCase().includes(ql));
      items = items.concat(acts.slice(0, 6));
    }

    currentItems = items;
    activeIndex = items.length ? 0 : -1;

    if (!items.length) {
      resultsEl.innerHTML = '<li class="cmd-empty">No matches</li>';
      return;
    }

    resultsEl.innerHTML = items.map((it, i) => {
      const cls = it.kind === 'entry' ? 'cmd-item cmd-item-entry' : 'cmd-item cmd-item-action';
      const tag = it.kind === 'entry'
        ? `<span class="cmd-tag cmd-tag-${escapeHtml(it.entry.type)}">${escapeHtml(it.entry.category)}</span>`
        : `<span class="cmd-tag cmd-tag-action">${escapeHtml(it.sub || 'Action')}</span>`;
      return `<li class="${cls}${i === 0 ? ' is-active' : ''}" role="option" data-i="${i}">
        ${tag}
        <span class="cmd-label">${escapeHtml(it.label)}</span>
        ${it.kind === 'entry' && it.entry.desc ? `<span class="cmd-sub">${escapeHtml(it.entry.desc.slice(0, 80))}</span>` : ''}
      </li>`;
    }).join('');

    updateActive();
  }

  function updateActive() {
    const lis = resultsEl.querySelectorAll('.cmd-item');
    lis.forEach((li, i) => li.classList.toggle('is-active', i === activeIndex));
    if (activeIndex >= 0 && lis[activeIndex]) {
      lis[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function runItem(i) {
    const it = currentItems[i];
    if (!it) return;
    close();
    if (it.kind === 'entry') {
      location.href = it.href;
    } else if (typeof it.run === 'function') {
      // Defer one tick so the close() animation is visible.
      setTimeout(() => { try { it.run(); } catch {} }, 60);
    }
  }

  // ── Open / close ────────────────────────────────────────────────────────
  let lastFocus = null;

  async function open() {
    if (!overlay.hidden) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('cmd-palette-open');
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    input.value = '';
    await ensureData();
    render();
    setTimeout(() => input.focus(), 30);
  }

  function close() {
    if (overlay.hidden) return;
    overlay.classList.remove('is-open');
    // Release the body lock and pointer-event capture immediately — waiting
    // for the 140ms fade leaves the page non-interactive after a "close".
    document.body.classList.remove('cmd-palette-open');
    setTimeout(() => {
      overlay.hidden = true;
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }, 140);
  }

  // ── Wire keyboard ───────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+K — open from anywhere
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (overlay.hidden) open(); else close();
      return;
    }
    if (overlay.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentItems.length) {
        activeIndex = (activeIndex + 1) % currentItems.length;
        updateActive();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentItems.length) {
        activeIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
        updateActive();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) runItem(activeIndex);
    }
  });

  input.addEventListener('input', render);

  resultsEl.addEventListener('click', (e) => {
    const li = e.target.closest('.cmd-item');
    if (!li) return;
    const i = parseInt(li.dataset.i, 10);
    if (isFinite(i)) runItem(i);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
})();
