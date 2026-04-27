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

  // ── Unit conversion (metric ↔ imperial) ────────────────────────────────────
  // Display-only conversions. Source of truth stays metric; we never mutate the
  // origQty/origUnit data attributes. Volume conversions assume water density,
  // which is acceptable for cup/tsp/tbsp display (the canonical USDA-aligned
  // quantity remains in g for nutrition).
  //
  // Strategy: pick the most natural imperial unit for the size of the value.
  // Tiny mass stays in g/oz for precision; tiny volume stays in tsp/tbsp.
  const UNITS_KEY = 'hdr-units'; // localStorage key — global preference

  function toImperial(qty, unit) {
    // Mass
    if (unit === 'g' || unit === 'kg') {
      const g = unit === 'kg' ? qty * 1000 : qty;
      if (g < 7)        return { qty: g, unit: 'g' };       // pinch territory; oz unhelpful
      if (g < 28)       return { qty: g / 28.3495, unit: 'oz' };
      if (g < 454)      return { qty: g / 28.3495, unit: 'oz' };
      return { qty: g / 453.592, unit: 'lb' };
    }
    // Volume
    if (unit === 'ml' || unit === 'l') {
      const ml = unit === 'l' ? qty * 1000 : qty;
      if (ml < 5)       return { qty: ml / 5,    unit: 'tsp' };
      if (ml < 15)      return { qty: ml / 5,    unit: 'tsp' };
      if (ml < 60)      return { qty: ml / 15,   unit: 'tbsp' };
      // Cups all the way to ~1.9 L (8 cups). Above that, switch to qt for
      // sanity. Most home recipes don't exceed 8 cups in a single ingredient.
      if (ml < 1900)    return { qty: ml / 240,  unit: 'cup' };
      return { qty: ml / 946.353, unit: 'qt' };
    }
    // Already imperial-style (tsp, tbsp, cup, oz, lb) or unitless — passthrough.
    return { qty, unit };
  }

  function toMetric(qty, unit) {
    if (unit === 'oz') return { qty: qty * 28.3495,  unit: 'g'  };
    if (unit === 'lb') return { qty: qty * 453.592,  unit: 'g'  };
    if (unit === 'tsp')  return { qty: qty * 5,      unit: 'ml' };
    if (unit === 'tbsp') return { qty: qty * 15,     unit: 'ml' };
    if (unit === 'cup')  return { qty: qty * 240,    unit: 'ml' };
    if (unit === 'qt')   return { qty: qty * 946.353, unit: 'ml' };
    return { qty, unit };
  }

  // Format an imperial quantity nicely — fractions for cup/tsp/tbsp; rounded
  // numbers for oz/lb. Keeps grams precise.
  function fmtImperial(n, unit) {
    if (n == null || isNaN(n)) return '';
    if (unit === 'cup' || unit === 'tsp' || unit === 'tbsp' || unit === 'qt') {
      // Round to nearest 1/8 below 4, nearest 1/4 below 10, integer above.
      if (n >= 10) return String(Math.round(n));
      const step = n < 4 ? 8 : 4;
      const r = Math.round(n * step) / step;
      return fmtQty(r);
    }
    if (unit === 'oz') return n < 4 ? n.toFixed(2).replace(/0$/, '').replace(/\.$/, '') : n.toFixed(1).replace(/\.0$/, '');
    if (unit === 'lb') return n < 1 ? n.toFixed(2).replace(/0$/, '').replace(/\.$/, '') : n.toFixed(1).replace(/\.0$/, '');
    return fmtQty(n);
  }

  function getStoredUnits() {
    try { return localStorage.getItem(UNITS_KEY) === 'imperial' ? 'imperial' : 'metric'; }
    catch { return 'metric'; }
  }
  function setStoredUnits(v) {
    try { localStorage.setItem(UNITS_KEY, v); } catch {}
  }

  function initScaling(root) {
    const baseServings = parseInt(root.dataset.baseServings, 10) || 1;
    const input = root.querySelector('[data-scale-input]');
    const stepBtns = root.querySelectorAll('[data-scale-step]');
    const unitBtns = root.querySelectorAll('[data-units]');
    const rows = Array.from(root.querySelectorAll('.ing-row'));

    // Snapshot original metric (qty, unit) per row. The dataset.qty/unit values
    // were emitted at build time from validated metric frontmatter; trust those.
    rows.forEach(row => {
      if (row.dataset.origQty != null) return; // already set
      const q = parseFloat(row.dataset.qty);
      if (isFinite(q)) row.dataset.origQty = String(q);
      if (row.dataset.unit) row.dataset.origUnit = row.dataset.unit;
    });

    let units = getStoredUnits();
    syncUnitButtons();

    function syncUnitButtons() {
      unitBtns.forEach(b => {
        const on = b.dataset.units === units;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function apply() {
      const servings = Math.max(1, parseInt(input?.value, 10) || baseServings);
      const factor = servings / baseServings;
      rows.forEach(row => {
        const orig = parseFloat(row.dataset.origQty);
        const origUnit = row.dataset.origUnit || row.dataset.unit || '';
        const qtyEl = row.querySelector('[data-ing-qty]');
        const unitEl = row.querySelector('[data-ing-unit]');
        if (!qtyEl) return;
        if (!isFinite(orig)) {
          // Non-numeric quantities (e.g. "to taste") aren't scaled or converted
          return;
        }
        const scaled = orig * factor;
        if (units === 'imperial') {
          const conv = toImperial(scaled, origUnit);
          qtyEl.textContent = fmtImperial(conv.qty, conv.unit);
          if (unitEl) unitEl.textContent = conv.unit;
        } else {
          qtyEl.textContent = fmtQty(scaled);
          if (unitEl) unitEl.textContent = origUnit;
        }
      });
    }

    apply(); // initial render reflects stored units preference

    if (input) {
      input.addEventListener('input', apply);
    }
    stepBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.scaleStep, 10) || 0;
        const cur = parseInt(input.value, 10) || baseServings;
        input.value = Math.max(1, cur + step);
        apply();
      });
    });
    unitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.units;
        if (next === units) return;
        units = next;
        setStoredUnits(units);
        syncUnitButtons();
        apply();
        // Keep all recipe ingredients sections in sync if there are multiple
        document.dispatchEvent(new CustomEvent('hdr:units', { detail: { units } }));
      });
    });

    // Cross-section sync (rare but possible if a page has multiple ingredient blocks)
    document.addEventListener('hdr:units', (e) => {
      if (e.detail?.units && e.detail.units !== units) {
        units = e.detail.units;
        syncUnitButtons();
        apply();
      }
    });
  }

  function buildShoppingList(root) {
    const rows = Array.from(root.querySelectorAll('.ing-row'));
    const lines = rows.filter(r => {
      const cb = r.querySelector('.ing-cb');
      return !cb || !cb.checked; // include unchecked (= still need to buy)
    }).map(r => {
      const qty = (r.querySelector('[data-ing-qty]') || {}).textContent.trim() || '';
      const unit = (r.querySelector('[data-ing-unit]') || {}).textContent.trim() || '';
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
    // tag is multi-select (Set): a card must match ALL selected tags.
    // Other facets remain single-select.
    const state = { cuisine: null, course: null, diet: null, time: null, difficulty: null, tags: new Set() };

    function apply() {
      let visible = 0;
      for (const card of cards) {
        const matchCuisine = !state.cuisine || card.dataset.cuisine === state.cuisine;
        const matchCourse = !state.course || card.dataset.course === state.course;
        const matchDiet = !state.diet || (card.dataset.diet || '').split('|').includes(state.diet);
        const matchDiff = !state.difficulty || card.dataset.difficulty === state.difficulty;
        const matchTime = !state.time || (card.dataset.time && parseInt(card.dataset.time, 10) <= parseInt(state.time, 10));
        const cardTags = (card.dataset.tags || '').split('|').filter(Boolean);
        const matchTags = state.tags.size === 0 || [...state.tags].every(t => cardTags.includes(t));
        const show = matchCuisine && matchCourse && matchDiet && matchDiff && matchTime && matchTags;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      }
      const filters = [];
      if (state.cuisine) filters.push(state.cuisine);
      if (state.course) filters.push(state.course);
      if (state.diet) filters.push(state.diet);
      if (state.difficulty) filters.push(state.difficulty);
      if (state.time) filters.push(`≤ ${state.time} min`);
      for (const t of state.tags) filters.push(`#${t}`);
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
        state.cuisine = state.course = state.diet = state.time = state.difficulty = null;
        state.tags.clear();
        bar.querySelectorAll('.filter-pill.active').forEach(b => b.classList.remove('active'));
        apply();
        return;
      }
      // Tag is multi-select: toggle independently, don't clear siblings.
      if (btn.dataset.filterTag !== undefined) {
        const tag = btn.dataset.filterTag;
        if (state.tags.has(tag)) { state.tags.delete(tag); btn.classList.remove('active'); }
        else { state.tags.add(tag); btn.classList.add('active'); }
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
