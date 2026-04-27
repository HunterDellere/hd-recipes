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

  // Volume of one of each imperial unit, in ml. Used for mass↔volume crossings.
  const VOL_ML = { tsp: 5, tbsp: 15, cup: 240, qt: 946.353 };

  // Density-aware metric → imperial conversion.
  //   - density: g/ml of the ingredient (defaults to 1.0 — water-equivalent — if unset)
  //   - impPref: optional preferred imperial unit ('cup'|'tbsp'|'tsp'|'oz'|'lb').
  //              When set + the natural unit family disagrees, we cross through
  //              density (mass→volume) so cup/tsp/tbsp work for flour, sugar, etc.
  function toImperial(qty, unit, density, impPref) {
    const d = (typeof density === 'number' && density > 0) ? density : 1.0;

    // Mass source
    if (unit === 'g' || unit === 'kg') {
      const g = unit === 'kg' ? qty * 1000 : qty;
      // Volume preference for a mass-source: convert g → ml via density, then ml → preferred unit
      if (impPref === 'cup' || impPref === 'tbsp' || impPref === 'tsp') {
        const ml = g / d;
        return { qty: ml / VOL_ML[impPref], unit: impPref };
      }
      if (impPref === 'lb') return { qty: g / 453.592, unit: 'lb' };
      if (impPref === 'oz') return { qty: g / 28.3495, unit: 'oz' };
      // Default: size-driven
      if (g < 7)   return { qty: g, unit: 'g' };
      if (g < 454) return { qty: g / 28.3495, unit: 'oz' };
      return { qty: g / 453.592, unit: 'lb' };
    }

    // Volume source
    if (unit === 'ml' || unit === 'l') {
      const ml = unit === 'l' ? qty * 1000 : qty;
      // Mass preference for a volume-source: convert ml → g via density
      if (impPref === 'oz') return { qty: (ml * d) / 28.3495, unit: 'oz' };
      if (impPref === 'lb') return { qty: (ml * d) / 453.592, unit: 'lb' };
      // Volume-to-volume preference is straightforward
      if (impPref === 'cup' || impPref === 'tbsp' || impPref === 'tsp') {
        return { qty: ml / VOL_ML[impPref], unit: impPref };
      }
      // Default: size-driven
      if (ml < 15)   return { qty: ml / 5,    unit: 'tsp' };
      if (ml < 60)   return { qty: ml / 15,   unit: 'tbsp' };
      if (ml < 1900) return { qty: ml / 240,  unit: 'cup' };
      return { qty: ml / 946.353, unit: 'qt' };
    }

    // Already imperial / unitless — passthrough.
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
          const density = parseFloat(row.dataset.density);
          const impPref = row.dataset.impPref || null;
          const conv = toImperial(scaled, origUnit, isFinite(density) ? density : undefined, impPref);
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

  // ── Cook's view: focused mode with wake-lock + per-step progression ────
  // Activated via [data-cook-toggle]. State persists per-recipe (so picking
  // up mid-cook restores the active step) plus a global wake-lock.
  const cookToggle = document.querySelector('[data-cook-toggle]');
  if (cookToggle) initCooksView(cookToggle);

  function initCooksView(toggle) {
    const recipeKey = `hdr-cook:${location.pathname}`;
    let wakeLock = null;
    let active = false;
    let activeStepIndex = 0;
    const steps = Array.from(document.querySelectorAll('.recipe-steps .step-item'));

    // Restore prior state on load
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(recipeKey) || 'null'); } catch {}
    if (stored && stored.active) {
      enter();
      if (typeof stored.step === 'number' && stored.step >= 0 && stored.step < steps.length) {
        setActiveStep(stored.step);
      }
    }

    toggle.addEventListener('click', () => {
      if (active) exit(); else enter();
    });

    // Wire expand/collapse on the Mise-en-place section-head.
    // While in cook's view, the H2 above the ingredients becomes a toggle
    // (real button via the click handler — CSS styles it as one).
    const ingredientsSection = document.querySelector('.recipe-ingredients');
    const ingredientsHead = document.querySelector('[id="ingredients"] + .section-head h2');
    if (ingredientsHead && ingredientsSection) {
      ingredientsHead.setAttribute('role', 'button');
      ingredientsHead.setAttribute('tabindex', '0');
      ingredientsHead.setAttribute('aria-expanded', 'false');
      const toggleIngredients = () => {
        if (!active) return;
        const expanded = ingredientsSection.dataset.expanded === '1';
        if (expanded) {
          ingredientsSection.removeAttribute('data-expanded');
          ingredientsHead.setAttribute('aria-expanded', 'false');
        } else {
          ingredientsSection.dataset.expanded = '1';
          ingredientsHead.setAttribute('aria-expanded', 'true');
        }
      };
      ingredientsHead.addEventListener('click', toggleIngredients);
      ingredientsHead.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleIngredients(); }
      });
    }

    async function enter() {
      active = true;
      document.body.dataset.cooksView = 'on';
      toggle.setAttribute('aria-pressed', 'true');
      toggle.querySelector('.rh-cook-label').textContent = "Exit cook's view";

      // Wake lock — graceful no-op if unsupported or denied
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; });
        } catch {}
      }

      // Re-acquire wake lock when tab becomes visible again
      document.addEventListener('visibilitychange', reacquireWakeLock);

      // Build the floating exit/control bar if not present
      buildCookBar();
      // Wire per-step click → activate
      steps.forEach((s, i) => {
        s.style.cursor = 'pointer';
        if (!s.dataset.cookBound) {
          s.addEventListener('click', () => setActiveStep(i));
          s.dataset.cookBound = '1';
        }
      });
      // Activate first uncompleted step (or first step)
      setActiveStep(activeStepIndex);
      persist();
    }

    function exit() {
      active = false;
      delete document.body.dataset.cooksView;
      toggle.setAttribute('aria-pressed', 'false');
      toggle.querySelector('.rh-cook-label').textContent = "Cook's view";
      if (wakeLock) { try { wakeLock.release(); } catch {} wakeLock = null; }
      document.removeEventListener('visibilitychange', reacquireWakeLock);
      steps.forEach(s => s.classList.remove('step-active'));
      const bar = document.querySelector('.cook-bar');
      if (bar) bar.remove();
      try { localStorage.removeItem(recipeKey); } catch {}
    }

    async function reacquireWakeLock() {
      if (!active || document.visibilityState !== 'visible' || wakeLock) return;
      if ('wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
      }
    }

    function setActiveStep(i) {
      activeStepIndex = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach((s, idx) => s.classList.toggle('step-active', idx === activeStepIndex));
      const target = steps[activeStepIndex];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const counter = document.querySelector('[data-cook-counter]');
      if (counter) counter.textContent = `Step ${activeStepIndex + 1} / ${steps.length}`;
      persist();
    }

    function persist() {
      try { localStorage.setItem(recipeKey, JSON.stringify({ active, step: activeStepIndex })); } catch {}
    }

    function buildCookBar() {
      if (document.querySelector('.cook-bar')) return;
      const bar = document.createElement('div');
      bar.className = 'cook-bar';
      bar.innerHTML = `
        <button type="button" class="cb-btn cb-prev" aria-label="Previous step">‹ Prev</button>
        <span class="cb-counter" data-cook-counter></span>
        <button type="button" class="cb-btn cb-next" aria-label="Next step">Next ›</button>
        <button type="button" class="cb-btn cb-exit" aria-label="Exit cook's view">Done</button>`;
      document.body.appendChild(bar);
      bar.querySelector('.cb-prev').addEventListener('click', () => setActiveStep(activeStepIndex - 1));
      bar.querySelector('.cb-next').addEventListener('click', () => setActiveStep(activeStepIndex + 1));
      bar.querySelector('.cb-exit').addEventListener('click', exit);
    }

    // Keyboard navigation while in cook's view
    document.addEventListener('keydown', (e) => {
      if (!active) return;
      if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setActiveStep(activeStepIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveStep(activeStepIndex - 1);
      } else if (e.key === 'Escape') {
        exit();
      }
    });
  }

  // ── filter bar (cook explore page) ─────────────────────────────────
  const filterBar = document.querySelector('[data-filter-bar]');
  if (filterBar) initExploreFilters(filterBar);

  function initExploreFilters(bar) {
    const grid = document.querySelector('[data-grid]');
    const status = document.querySelector('[data-filter-status]');
    const chipsEl = document.querySelector('[data-filter-chips]');
    const clearBtn = bar.querySelector('[data-filter-clear]');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('[data-card]'));

    // tag is multi-select (Set, AND semantics); other facets are single-select.
    const state = { cuisine: null, course: null, diet: null, time: null, difficulty: null, tags: new Set() };

    // Map facet → human label for chip display
    const FACET_LABEL = {
      cuisine: 'Cuisine', course: 'Course', diet: 'Diet',
      time: 'Active time', difficulty: 'Difficulty',
    };

    // ── filtering ──────────────────────────────────────────────────────
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
      renderChips();
      renderCounts();
      const totalActive = countActive();
      if (clearBtn) clearBtn.hidden = totalActive === 0;
      if (status) {
        if (totalActive === 0) {
          status.textContent = '';
        } else {
          status.textContent = `${visible} ${visible === 1 ? 'recipe' : 'recipes'} match`;
        }
      }
    }

    function countActive() {
      let n = 0;
      for (const k of ['cuisine','course','diet','time','difficulty']) if (state[k]) n++;
      n += state.tags.size;
      return n;
    }

    // ── chip strip (active-filter summary) ─────────────────────────────
    function renderChips() {
      if (!chipsEl) return;
      const out = [];
      for (const k of ['cuisine','course','diet','difficulty']) {
        if (state[k]) out.push(chipHtml(k, state[k], state[k]));
      }
      if (state.time) out.push(chipHtml('time', state.time, `≤ ${state.time} min active`));
      for (const t of state.tags) out.push(chipHtml('tag', t, `#${t}`));
      chipsEl.innerHTML = out.join('');
      chipsEl.hidden = out.length === 0;
    }
    function chipHtml(facet, value, label) {
      return `<button type="button" class="filter-chip" data-chip-facet="${escapeAttr(facet)}" data-chip-value="${escapeAttr(value)}" aria-label="Remove filter: ${escapeAttr(label)}">${escapeHtml(label)}<span class="filter-chip-x" aria-hidden="true">×</span></button>`;
    }
    function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function escapeAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

    if (chipsEl) {
      chipsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        const facet = chip.dataset.chipFacet;
        const value = chip.dataset.chipValue;
        if (facet === 'tag') {
          state.tags.delete(value);
        } else {
          state[facet] = null;
        }
        syncInputs();
        apply();
      });
    }

    // ── per-menu count badges ──────────────────────────────────────────
    function renderCounts() {
      bar.querySelectorAll('[data-filter-menu]').forEach(menu => {
        const facet = menu.dataset.filterMenu;
        const countEl = menu.querySelector('[data-menu-count]');
        if (!countEl) return;
        let n;
        if (facet === 'tag') n = state.tags.size;
        else n = state[facet] ? 1 : 0;
        countEl.textContent = n > 0 ? String(n) : '';
        countEl.hidden = n === 0;
        menu.classList.toggle('has-active', n > 0);
      });
    }

    // ── input → state ──────────────────────────────────────────────────
    bar.addEventListener('change', (e) => {
      const input = e.target.closest('input');
      if (!input) return;
      // Find which facet this input belongs to
      const facets = ['cuisine','course','diet','time','difficulty','tag'];
      let facet = null, value = null;
      for (const f of facets) {
        const k = `filter${f.charAt(0).toUpperCase() + f.slice(1)}`;
        if (input.dataset[k] !== undefined) { facet = f; value = input.dataset[k]; }
      }
      if (!facet) return;
      if (facet === 'tag') {
        if (input.checked) state.tags.add(value);
        else state.tags.delete(value);
      } else {
        // Radio: setting same value toggles off (so user can deselect)
        // The native radio group handles single-select; we just record.
        state[facet] = input.checked ? value : null;
      }
      apply();
    });

    // Allow re-clicking an already-checked radio to clear it.
    bar.addEventListener('click', (e) => {
      const input = e.target.closest('input[type="radio"]');
      if (!input) return;
      // If radio was already checked before this click, the click won't trigger
      // a 'change' event. Detect via a microtask: if state matches, clear.
      const facets = ['cuisine','course','diet','time','difficulty'];
      let facet = null, value = null;
      for (const f of facets) {
        const k = `filter${f.charAt(0).toUpperCase() + f.slice(1)}`;
        if (input.dataset[k] !== undefined) { facet = f; value = input.dataset[k]; }
      }
      if (!facet) return;
      if (state[facet] === value) {
        // User clicked the already-active radio: clear it
        input.checked = false;
        state[facet] = null;
        apply();
      }
    });

    // Sync DOM input states back from `state` (after chip removal etc.)
    function syncInputs() {
      bar.querySelectorAll('input[type="radio"]').forEach(input => {
        const facets = ['cuisine','course','diet','time','difficulty'];
        for (const f of facets) {
          const k = `filter${f.charAt(0).toUpperCase() + f.slice(1)}`;
          if (input.dataset[k] !== undefined) {
            input.checked = state[f] === input.dataset[k];
          }
        }
      });
      bar.querySelectorAll('input[type="checkbox"][data-filter-tag]').forEach(input => {
        input.checked = state.tags.has(input.dataset.filterTag);
      });
    }

    // ── clear all ──────────────────────────────────────────────────────
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.cuisine = state.course = state.diet = state.time = state.difficulty = null;
        state.tags.clear();
        syncInputs();
        // Also close any open menus
        bar.querySelectorAll('details[data-filter-menu]').forEach(d => d.removeAttribute('open'));
        apply();
      });
    }

    // ── close menus on outside click / Escape ──────────────────────────
    document.addEventListener('click', (e) => {
      const menus = bar.querySelectorAll('details[data-filter-menu][open]');
      if (!menus.length) return;
      menus.forEach(menu => { if (!menu.contains(e.target)) menu.removeAttribute('open'); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      bar.querySelectorAll('details[data-filter-menu][open]').forEach(d => {
        d.removeAttribute('open');
        const sum = d.querySelector('summary'); if (sum) sum.focus();
      });
    });

    // Only allow one menu open at a time — friendlier on mobile.
    bar.querySelectorAll('details[data-filter-menu]').forEach(menu => {
      menu.addEventListener('toggle', () => {
        if (!menu.open) return;
        bar.querySelectorAll('details[data-filter-menu][open]').forEach(other => {
          if (other !== menu) other.removeAttribute('open');
        });
      });
    });

    // Initial render
    apply();
  }
})();
