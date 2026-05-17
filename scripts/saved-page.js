/* saved-page.js — renders /pages/saved.html.
 * Pulls slugs from window.HDR (localStorage) and hydrates metadata from
 * data/entries.json. Distinct from homepage.js so the saved view stays
 * lean — no search, no featured rotation, no family counts. */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  function fmtRelDay(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const diffDays = Math.round((Date.now() - d.getTime()) / 86400000);
      if (diffDays <= 0) return 'today';
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 30) return `${diffDays} days ago`;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso.slice(0, 10); }
  }

  // entries.json paths are repo-relative ("pages/recipes/<slug>.html").
  // From /pages/saved.html the link should resolve as "./recipes/<slug>.html".
  function entryHref(path) {
    if (!path) return '#';
    if (path.startsWith('pages/')) return '../' + path;
    return path;
  }

  function cardHtml(entry, meta) {
    const desc = entry.desc ? escapeHtml(entry.desc) : '';
    const metaLine = meta ? `<div class="hdr-saved-meta">${escapeHtml(meta)}</div>` : '';
    const cat = entry.cuisine || entry.category || 'Recipe';
    return `
      <a class="hdr-saved-card" href="${escapeHtml(entryHref(entry.path))}">
        <span class="hdr-saved-cat">${escapeHtml(cat)}</span>
        <h3 class="hdr-saved-title">${escapeHtml(entry.title || entry.slug)}</h3>
        ${desc ? `<p class="hdr-saved-desc">${desc}</p>` : ''}
        ${metaLine}
      </a>`;
  }

  function placeholderCard(slug, meta) {
    // Slug isn't in entries.json (recipe might have been renamed/removed).
    // Still link to the would-be page so the user can verify or remove it.
    const guessPath = `../pages/recipes/${slug}.html`;
    return `
      <a class="hdr-saved-card" href="${escapeHtml(guessPath)}">
        <span class="hdr-saved-cat">Recipe</span>
        <h3 class="hdr-saved-title">${escapeHtml(slug)}</h3>
        <p class="hdr-saved-desc"><em>This recipe is no longer in the library; remove it from saved if it's gone.</em></p>
        ${meta ? `<div class="hdr-saved-meta">${escapeHtml(meta)}</div>` : ''}
      </a>`;
  }

  async function loadEntries() {
    try {
      const r = await fetch('../data/entries.json');
      if (!r.ok) return [];
      return await r.json();
    } catch { return []; }
  }

  async function init() {
    if (!window.HDR) return;
    const saved = window.HDR.getSaved();
    const cookLog = window.HDR.getCookLog();

    const savedCountEl = document.querySelector('[data-saved-count]');
    if (savedCountEl) savedCountEl.textContent = String(saved.length);

    const entries = await loadEntries();
    // Recipe slug → entry. entries.json uses repo-relative slugs like
    // "recipes/<slug>" so we strip the prefix to match the bare slug we
    // store in localStorage.
    // Only index recipes — saved slugs come from recipe pages exclusively.
    const bySlug = new Map();
    for (const e of entries) {
      if (e.type !== 'recipe') continue;
      const bare = e._slug || (e.path || '').replace(/^pages\/recipes\//, '').replace(/\.html$/, '');
      if (bare) bySlug.set(bare, e);
    }

    // ── Starred ────────────────────────────────────────────────
    const grid = document.getElementById('saved-grid');
    const empty = document.getElementById('saved-empty');
    if (grid) {
      if (saved.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.hidden = false;
      } else {
        if (empty) empty.hidden = true;
        grid.innerHTML = saved.map(slug => {
          const e = bySlug.get(slug);
          return e ? cardHtml(e) : placeholderCard(slug);
        }).join('');
      }
    }

    // ── Cooked recently ────────────────────────────────────────
    const cookedSlugs = Object.keys(cookLog).map(slug => {
      const dates = (cookLog[slug] && cookLog[slug].dates) || [];
      const last = dates.length ? dates[dates.length - 1] : null;
      return { slug, last, count: dates.length };
    }).filter(x => x.last).sort((a, b) => b.last.localeCompare(a.last));

    const cookedGrid = document.getElementById('cooked-grid');
    const cookedEmpty = document.getElementById('cooked-empty');
    if (cookedGrid) {
      if (cookedSlugs.length === 0) {
        cookedGrid.innerHTML = '';
        if (cookedEmpty) cookedEmpty.hidden = false;
      } else {
        if (cookedEmpty) cookedEmpty.hidden = true;
        cookedGrid.innerHTML = cookedSlugs.map(({ slug, last, count }) => {
          const e = bySlug.get(slug);
          const meta = `Cooked ${count}× · last ${fmtRelDay(last)}`;
          return e ? cardHtml(e, meta) : placeholderCard(slug, meta);
        }).join('');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
