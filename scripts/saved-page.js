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

  // Mirror of build/lib/cards.mjs::renderCardSwatch — saved.html lives at
  // /pages/saved.html, so hero paths under "assets/..." need to be lifted
  // one directory ("../assets/...").
  function cardSwatch(entry) {
    const c = entry._card || {};
    if (c.heroSrc) {
      const href = c.heroSrc.startsWith('assets/') ? `../${c.heroSrc}` : c.heroSrc;
      return `<span class="ec-swatch ec-swatch-photo" aria-hidden="true" style="background-image:url('${escapeHtml(href)}')"></span>`;
    }
    const idx = c.swatchIndex != null ? c.swatchIndex : 0;
    const glyph = c.swatchGlyph || 'leaf';
    return `<span class="ec-swatch" data-swatch="${idx}" data-glyph="${escapeHtml(glyph)}" aria-hidden="true"></span>`;
  }

  function fmtMin(min) {
    const n = Number(min);
    if (!isFinite(n) || n <= 0) return '';
    if (n < 60) return `${Math.round(n)} min`;
    const h = Math.floor(n / 60);
    const m = Math.round(n - h * 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function cardStatPills(entry, extraMeta) {
    const c = entry._card || {};
    const pills = [];
    if (c.timeLead) {
      const annot = c.timeAnnotation ? ` ${String(c.timeAnnotation).replace(/^[+·]\s*/, '· ')}` : '';
      const label = c.timeMode === 'active' ? `${c.timeLead} active${annot}` : `${c.timeLead}${annot}`;
      pills.push(`<span class="ec-stat-pill ec-stat-time">${escapeHtml(label)}</span>`);
    } else if (c.totalMinutes) {
      pills.push(`<span class="ec-stat-pill ec-stat-time">${escapeHtml(fmtMin(c.totalMinutes))}</span>`);
    }
    if (c.kcal) pills.push(`<span class="ec-stat-pill ec-stat-kcal">${c.kcal} kcal</span>`);
    if (entry.cuisine) pills.push(`<span class="ec-stat-pill ec-stat-cuisine">${escapeHtml(entry.cuisine)}</span>`);
    if (c.diffLabel) pills.push(`<span class="ec-stat-pill ec-stat-diff ec-d-${escapeHtml(c.diffLabel)}"><span class="ec-diff-dot" aria-hidden="true"></span>${escapeHtml(c.diffLabel)}</span>`);
    if (extraMeta) pills.push(`<span class="ec-stat-pill ec-stat-cooked">${escapeHtml(extraMeta)}</span>`);
    return pills.length ? `<div class="ec-stat-row" role="list">${pills.join('')}</div>` : '';
  }

  function cardHtml(entry, meta) {
    const desc = entry.desc ? `<span class="ec-desc">${escapeHtml(entry.desc.slice(0, 110))}</span>` : '';
    const cat = `<span class="ec-cat">${escapeHtml(entry.category || 'recipes')}</span>`;
    const title = `<span class="ec-title">${escapeHtml(entry.title || entry._slug || '')}</span>`;
    return `
      <a class="entry-card" href="${escapeHtml(entryHref(entry.path))}" data-category="${escapeHtml(entry.category || 'recipes')}" data-type="${escapeHtml(entry.type || 'recipe')}">
        ${cardSwatch(entry)}
        <span class="ec-body">${cat}${title}${desc}${cardStatPills(entry, meta)}</span>
      </a>`;
  }

  function placeholderCard(slug, meta) {
    // Slug isn't in entries.json (recipe might have been renamed/removed).
    // Still link to the would-be page so the user can verify or remove it.
    // Render with a generic swatch so the missing-entry tile doesn't feel
    // visually broken next to populated cards.
    const guessPath = `../pages/recipes/${slug}.html`;
    const swatch = `<span class="ec-swatch" data-swatch="0" data-glyph="leaf" aria-hidden="true"></span>`;
    const metaRow = meta ? `<div class="ec-stat-row" role="list"><span class="ec-stat-pill ec-stat-cooked">${escapeHtml(meta)}</span></div>` : '';
    return `
      <a class="entry-card entry-card-missing" href="${escapeHtml(guessPath)}" data-category="recipes" data-type="recipe">
        ${swatch}
        <span class="ec-body">
          <span class="ec-cat">recipes</span>
          <span class="ec-title">${escapeHtml(slug)}</span>
          <span class="ec-desc"><em>This recipe is no longer in the library; remove it from saved if it's gone.</em></span>
          ${metaRow}
        </span>
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
