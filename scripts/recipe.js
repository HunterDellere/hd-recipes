/**
 * recipe.js — client-side scaling + shopping list export.
 * Looks for .recipe-ingredients on the page; otherwise no-op.
 */
(function () {
  'use strict';

  function fmtQty(n) {
    if (n == null || isNaN(n)) return '';
    if (n === Math.floor(n)) return String(n);
    // common fractions
    const FRAC = [
      [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
      [0.5, '½'], [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
    ];
    const whole = Math.floor(n);
    const frac = n - whole;
    for (const [v, sym] of FRAC) {
      if (Math.abs(frac - v) < 0.04) return whole > 0 ? `${whole} ${sym}` : sym;
    }
    return n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, '');
  }

  function parseQty(s) {
    if (!s) return null;
    s = String(s).trim();
    const FRAC = { '½':0.5,'¼':0.25,'¾':0.75,'⅓':1/3,'⅔':2/3,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875 };
    if (FRAC[s] != null) return FRAC[s];
    const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return +mixed[1] + (+mixed[2]) / (+mixed[3]);
    const frac = s.match(/^(\d+)\/(\d+)$/);
    if (frac) return (+frac[1]) / (+frac[2]);
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function initScaling(root) {
    const baseServings = parseInt(root.dataset.baseServings, 10) || 1;
    const input = root.querySelector('[data-scale-input]');
    const stepBtns = root.querySelectorAll('[data-scale-step]');
    const rows = Array.from(root.querySelectorAll('.ing-row'));

    // Snapshot original quantities (numeric only)
    rows.forEach(row => {
      const qtyEl = row.querySelector('[data-ing-qty]');
      if (!qtyEl) return;
      const orig = parseQty(qtyEl.textContent);
      if (orig != null) row.dataset.origQty = orig;
    });

    function apply(servings) {
      const factor = servings / baseServings;
      rows.forEach(row => {
        const orig = parseFloat(row.dataset.origQty);
        if (!isFinite(orig)) return;
        const qtyEl = row.querySelector('[data-ing-qty]');
        if (qtyEl) qtyEl.textContent = fmtQty(orig * factor);
      });
    }

    if (input) {
      input.addEventListener('input', () => {
        const v = Math.max(1, parseInt(input.value, 10) || 1);
        apply(v);
      });
    }
    stepBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.scaleStep, 10) || 0;
        const cur = parseInt(input.value, 10) || baseServings;
        input.value = Math.max(1, cur + step);
        input.dispatchEvent(new Event('input'));
      });
    });
  }

  function buildShoppingList(root) {
    const rows = Array.from(root.querySelectorAll('.ing-row'));
    const lines = rows.filter(r => {
      const cb = r.querySelector('.ing-cb');
      return !cb || !cb.checked; // include unchecked (= still need to buy)
    }).map(r => {
      const qty = (r.querySelector('[data-ing-qty]') || {}).textContent || '';
      const unit = (r.querySelector('.ing-qty') || {}).textContent.replace(qty, '').trim() || '';
      const name = (r.querySelector('.ing-name') || {}).textContent.trim();
      return `- ${qty} ${unit}  ${name}`.replace(/\s+/g, ' ').trim();
    });
    const title = document.title.split(' — ')[0];
    return `Shopping list — ${title}\n\n${lines.join('\n')}\n`;
  }

  function initShop(root) {
    const btn = root.querySelector('[data-shop-export]');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const text = buildShoppingList(root);
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = orig; }, 1600);
      } catch (e) {
        // fallback: open in a new window
        const w = window.open('', '_blank');
        if (w) { w.document.body.innerText = text; }
      }
    });
  }

  function initStrike(root) {
    // strike-through finished items via checkbox
    root.addEventListener('change', e => {
      const cb = e.target.closest('.ing-cb');
      if (!cb) return;
      const row = cb.closest('.ing-row');
      if (row) row.classList.toggle('ing-row-done', cb.checked);
    });
  }

  document.querySelectorAll('.recipe-ingredients').forEach(root => {
    initScaling(root);
    initShop(root);
    initStrike(root);
  });

  // ── filter bar (cook explore page) ─────────────────────────────────
  const filterBar = document.querySelector('.filter-bar');
  if (filterBar) initExploreFilters(filterBar);

  function initExploreFilters(bar) {
    const grid = document.querySelector('[data-grid]');
    const status = document.querySelector('[data-filter-status]');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('[data-card]'));
    const state = { cuisine: null, course: null, diet: null, time: null, difficulty: null };

    function apply() {
      let visible = 0;
      for (const card of cards) {
        const matchCuisine = !state.cuisine || card.dataset.cuisine === state.cuisine;
        const matchCourse = !state.course || card.dataset.course === state.course;
        const matchDiet = !state.diet || (card.dataset.diet || '').split('|').includes(state.diet);
        const matchDiff = !state.difficulty || card.dataset.difficulty === state.difficulty;
        const matchTime = !state.time || (card.dataset.time && parseInt(card.dataset.time, 10) <= parseInt(state.time, 10));
        const show = matchCuisine && matchCourse && matchDiet && matchDiff && matchTime;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      }
      const filters = [];
      if (state.cuisine) filters.push(state.cuisine);
      if (state.course) filters.push(state.course);
      if (state.diet) filters.push(state.diet);
      if (state.difficulty) filters.push(state.difficulty);
      if (state.time) filters.push(`≤ ${state.time} min`);
      if (status) {
        status.textContent = filters.length
          ? `${visible} ${visible === 1 ? 'recipe' : 'recipes'} matching ${filters.join(' · ')}`
          : '';
      }
    }

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;
      if (btn.hasAttribute('data-filter-clear')) {
        for (const k of Object.keys(state)) state[k] = null;
        bar.querySelectorAll('.filter-pill.active').forEach(b => b.classList.remove('active'));
        apply();
        return;
      }
      const groups = ['cuisine','course','diet','time','difficulty'];
      let group = null, val = null;
      for (const g of groups) {
        const k = `filter${g.charAt(0).toUpperCase() + g.slice(1)}`;
        if (btn.dataset[k] !== undefined) { group = g; val = btn.dataset[k]; }
      }
      if (!group) return;
      const wasActive = btn.classList.contains('active');
      bar.querySelectorAll(`[data-filter-${group}]`).forEach(b => b.classList.remove('active'));
      if (wasActive) state[group] = null;
      else { state[group] = val; btn.classList.add('active'); }
      apply();
    });
  }
})();
