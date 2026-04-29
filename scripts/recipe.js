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

  // Adjust word-form imperial units (cup/cups, stick/sticks, …) to match the
  // scaled quantity. Abbreviations (tsp/tbsp/oz/lb) don't pluralize so they
  // pass through. Returning the original unit text (preserving authored case)
  // when the lookup misses keeps anything we don't know about as-is.
  const IMP_SINGULAR_TO_PLURAL = { cup: 'cups', stick: 'sticks', pound: 'pounds', tablespoon: 'tablespoons', teaspoon: 'teaspoons' };
  const IMP_PLURAL_TO_SINGULAR = Object.fromEntries(Object.entries(IMP_SINGULAR_TO_PLURAL).map(([s, p]) => [p, s]));
  function pluralizeUnit(unit, qty) {
    if (!unit) return unit;
    const lc = unit.toLowerCase();
    if (qty > 1 && IMP_SINGULAR_TO_PLURAL[lc]) return IMP_SINGULAR_TO_PLURAL[lc];
    if (qty <= 1 && IMP_PLURAL_TO_SINGULAR[lc]) return IMP_PLURAL_TO_SINGULAR[lc];
    return unit;
  }

  function initScaling(root) {
    const baseServings = parseInt(root.dataset.baseServings, 10) || 1;
    const input = root.querySelector('[data-scale-input]');
    const stepBtns = root.querySelectorAll('[data-scale-step]');
    const unitBtns = root.querySelectorAll('[data-units]');
    const rows = Array.from(root.querySelectorAll('.ing-row'));
    // Quantities embedded in step prose, wrapped at build time as
    // <span data-step-qty …>. Scaling these keeps the instructions in sync
    // with the ingredients table when the cook adjusts servings.
    const stepQtyEls = Array.from(document.querySelectorAll('[data-step-qty]'));
    // The hero "N servings" stat — updated alongside the input so the page
    // header reflects the chosen yield, not the static recipe default.
    const heroServingsEl = document.querySelector('[data-stat="servings"] .rh-stat-value');

    // Snapshot original metric (qty, unit) per row. The dataset.qty/unit values
    // were emitted at build time from validated metric frontmatter; trust those.
    rows.forEach(row => {
      if (row.dataset.origQty != null) return; // already set
      const q = parseFloat(row.dataset.qty);
      if (isFinite(q)) row.dataset.origQty = String(q);
      if (row.dataset.unit) row.dataset.origUnit = row.dataset.unit;
    });
    // Snapshot the authored step-quantity text once. At factor=1 we restore
    // this verbatim instead of re-formatting — fmtImperial would otherwise
    // round 1⅓ to 1⅜ on the no-op render.
    stepQtyEls.forEach(el => {
      if (el.dataset.origText == null) el.dataset.origText = el.textContent;
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

    // Convert metric → metric (size-driven readability — show kg above 1000g, l above 1000ml)
    function metricDisplay(qty, unit) {
      if (unit === 'g' && qty >= 1000) return { qty: qty / 1000, unit: 'kg' };
      if (unit === 'ml' && qty >= 1000) return { qty: qty / 1000, unit: 'l' };
      return { qty, unit };
    }
    function fmtMetric(n, unit) {
      if (n == null || isNaN(n)) return '';
      if (unit === 'kg' || unit === 'l') return n < 10 ? n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : n.toFixed(1).replace(/\.0$/, '');
      // grams / ml — round to integer above 10, one decimal under
      if (n >= 10) return String(Math.round(n));
      return fmtQty(n);
    }
    // Active-unit formatter for the alt parenthetical: dispatches to the right
    // formatter for the unit family.
    function fmtActive(qty, unit) {
      if (unit === 'g' || unit === 'kg' || unit === 'mg' || unit === 'ml' || unit === 'l') {
        return fmtMetric(qty, unit);
      }
      return fmtImperial(qty, unit);
    }

    function apply() {
      const servings = Math.max(1, parseInt(input?.value, 10) || baseServings);
      const factor = servings / baseServings;
      rows.forEach(row => {
        const orig = parseFloat(row.dataset.origQty);
        const origUnit = row.dataset.origUnit || row.dataset.unit || '';
        const altEl = row.querySelector('[data-ing-alt]');

        // Pack rows render "N × <label>" instead of qty + unit. Recalculate
        // the count whenever servings change. Round up because cans/bottles
        // come in whole units — overshoot honestly rather than underbuy.
        const packCountEl = row.querySelector('[data-pack-count]');
        if (packCountEl) {
          const sizeMl = parseFloat(row.dataset.packSizeMl);
          const sizeG  = parseFloat(row.dataset.packSizeG);
          const size = isFinite(sizeMl) ? sizeMl : (isFinite(sizeG) ? sizeG : null);
          if (isFinite(orig) && size) {
            const count = Math.max(1, Math.ceil((orig * factor) / size));
            packCountEl.textContent = String(count);
          }
          if (altEl) altEl.textContent = '';
          return;
        }

        const qtyEl = row.querySelector('[data-ing-qty]');
        const unitEl = row.querySelector('[data-ing-unit]');
        if (!qtyEl) return;
        if (!isFinite(orig)) {
          // Non-numeric quantities (e.g. "to taste") aren't scaled or converted
          if (altEl) altEl.textContent = '';
          return;
        }
        const scaled = orig * factor;
        const density = parseFloat(row.dataset.density);
        const impPref = row.dataset.impPref || null;
        let mainDisp, altDisp;
        if (units === 'imperial') {
          mainDisp = toImperial(scaled, origUnit, isFinite(density) ? density : undefined, impPref);
          // Alt = metric form of the original metric value (rebased to kg/l for big quantities).
          const m = metricDisplay(scaled, origUnit);
          altDisp = m;
        } else {
          mainDisp = metricDisplay(scaled, origUnit);
          // Alt = imperial form of the original metric value.
          altDisp = toImperial(scaled, origUnit, isFinite(density) ? density : undefined, impPref);
        }
        // Main column
        qtyEl.textContent = (units === 'imperial' ? fmtImperial : fmtMetric)(mainDisp.qty, mainDisp.unit);
        if (unitEl) unitEl.textContent = mainDisp.unit;
        // Alternate-unit parenthetical — empty when there's no meaningful conversion
        if (altEl) {
          const altQty = fmtActive(altDisp.qty, altDisp.unit);
          // Only show the alt if the alt unit is *different* from the main unit
          // (otherwise it's redundant noise — e.g. unit-less rows or when
          // metric→imperial fell through to passthrough).
          if (altQty && altDisp.unit && altDisp.unit !== mainDisp.unit) {
            altEl.textContent = `(${altQty} ${altDisp.unit})`;
            altEl.setAttribute('aria-hidden', 'false');
          } else {
            altEl.textContent = '';
            altEl.setAttribute('aria-hidden', 'true');
          }
        }
      });

      stepQtyEls.forEach(el => {
        if (Math.abs(factor - 1) < 1e-9 && el.dataset.origText != null) {
          el.textContent = el.dataset.origText;
          return;
        }
        const mq = parseFloat(el.dataset.metricQty);
        const mu = el.dataset.metricUnit || '';
        const iq = parseFloat(el.dataset.impQty);
        const iu = el.dataset.impUnit || '';
        if (!isFinite(mq) || !isFinite(iq)) return;
        const mScaled = mq * factor;
        const iScaled = iq * factor;
        const metricText = `${fmtMetric(mScaled, mu)} ${mu}`;
        const impText = `${fmtImperial(iScaled, iu)} ${pluralizeUnit(iu, iScaled)}`;
        el.textContent = `${metricText} / ${impText}`;
      });

      if (heroServingsEl) heroServingsEl.textContent = String(servings);
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
    // Scope to the shop panel so we don't duplicate plain rows that also
    // appear in the mise-en-place breakdown. Fall back to all rows if the
    // panel structure isn't there (older recipes).
    const shopRoot = root.querySelector('[data-ing-panel="shop"] .ing-list-shop') || root;
    const rows = Array.from(shopRoot.querySelectorAll('.ing-row'));
    const lines = rows.filter(r => {
      const cb = r.querySelector('.ing-cb');
      return !cb || !cb.checked; // include unchecked (= still need to buy)
    }).map(r => {
      // Pack rows render "N × <label>" — read those directly so the export
      // says "2 × 13.5 oz / 400 ml can full-fat coconut milk" rather than the
      // underlying ml.
      const packCountEl = r.querySelector('[data-pack-count]');
      if (packCountEl) {
        const count = packCountEl.textContent.trim();
        const labelText = (r.querySelector('[data-pack-label-text]') || {}).textContent?.trim() || '';
        const name = (r.querySelector('.ing-name') || {}).textContent.trim();
        return `- ${count} × ${labelText}  ${name}`.replace(/\s+/g, ' ').trim();
      }
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

  // Tap anywhere in an ingredient row to tick it. The row becomes a single
  // big touch target — important when cooks have wet/dirty hands and small
  // checkboxes are a struggle to hit. Native interactives inside the row
  // (links, the checkbox itself, its label) keep handling their own clicks
  // so a tap on a slug crosslink still navigates rather than ticking.
  function initRowTap(root) {
    root.addEventListener('click', e => {
      if (e.target.closest('a, button, input, label')) return;
      const row = e.target.closest('.ing-row');
      if (!row || !root.contains(row)) return;
      const cb = row.querySelector('.ing-cb');
      if (!cb) return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  document.querySelectorAll('.recipe-ingredients').forEach(root => {
    initScaling(root);
    initShop(root);
    initStrike(root);
    initRowTap(root);
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
    const completedSteps = new Set();
    const steps = Array.from(document.querySelectorAll('.recipe-steps .step-item'));
    const ingredientsSection = document.querySelector('.recipe-ingredients');
    const labelEl = toggle.querySelector('.rh-cook-label');

    // Build a real button element for ingredients-toggle in cooks view rather
    // than retrofitting the H2 with role=button. Inserted but kept hidden when
    // not in cooks view via CSS.
    let ingPanelBtn = null;
    if (ingredientsSection) {
      const anchor = document.querySelector('[id="ingredients"]');
      ingPanelBtn = document.createElement('button');
      ingPanelBtn.type = 'button';
      ingPanelBtn.className = 'cv-ing-toggle';
      ingPanelBtn.setAttribute('aria-expanded', 'false');
      ingPanelBtn.setAttribute('aria-controls', 'cv-ingredients-panel');
      ingPanelBtn.hidden = true;
      ingPanelBtn.innerHTML = `
        <span class="cv-ing-toggle-label">Mise en Place</span>
        <span class="cv-ing-toggle-meta"><span class="cv-ing-count"></span><span class="cv-ing-toggle-chev" aria-hidden="true">▾</span></span>`;
      ingredientsSection.id = 'cv-ingredients-panel';
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(ingPanelBtn, ingredientsSection);
      } else {
        ingredientsSection.parentNode.insertBefore(ingPanelBtn, ingredientsSection);
      }
      // Scope the count to the shop panel — plain rows otherwise double-count
      // (they render in both shop and mise panels). The shop panel is the
      // canonical "what do I have" view, so it's the right denominator.
      const countRoot = ingredientsSection.querySelector('[data-ing-panel="shop"] .ing-list-shop') || ingredientsSection;
      const ingCountEl = ingPanelBtn.querySelector('.cv-ing-count');
      const totalIng = countRoot.querySelectorAll('.ing-row').length;
      const updateIngCount = () => {
        const checked = countRoot.querySelectorAll('.ing-cb:checked').length;
        ingCountEl.textContent = `${checked}/${totalIng} ready`;
      };
      updateIngCount();
      ingredientsSection.addEventListener('change', e => {
        if (e.target.classList && e.target.classList.contains('ing-cb')) updateIngCount();
      });
      const togglePanel = () => {
        const expanded = ingredientsSection.dataset.expanded === '1';
        const cbMise = document.querySelector('.cb-mise');
        if (expanded) {
          delete ingredientsSection.dataset.expanded;
          ingPanelBtn.setAttribute('aria-expanded', 'false');
          if (cbMise) cbMise.setAttribute('aria-pressed', 'false');
        } else {
          ingredientsSection.dataset.expanded = '1';
          ingPanelBtn.setAttribute('aria-expanded', 'true');
          if (cbMise) cbMise.setAttribute('aria-pressed', 'true');
        }
      };
      ingPanelBtn.addEventListener('click', togglePanel);
    }

    toggle.addEventListener('click', () => {
      if (active) exit(); else enter();
    });

    // Restore prior state on load — done after handlers are wired so the
    // toggle is fully ready by the time enter() flips the state.
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(recipeKey) || 'null'); } catch {}
    if (stored && stored.active) {
      if (Array.isArray(stored.completed)) for (const i of stored.completed) completedSteps.add(i);
      enter();
      if (typeof stored.step === 'number' && stored.step >= 0 && stored.step < steps.length) {
        setActiveStep(stored.step);
      }
    }

    async function enter() {
      active = true;
      document.body.dataset.cooksView = 'on';
      toggle.setAttribute('aria-pressed', 'true');
      if (labelEl) labelEl.textContent = "Exit cook's view";
      if (ingPanelBtn) ingPanelBtn.hidden = false;

      // Wake lock — graceful no-op if unsupported or denied
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; });
        } catch {}
      }

      // Re-acquire wake lock when tab becomes visible again
      document.addEventListener('visibilitychange', reacquireWakeLock);

      // Build the floating exit/control bar
      buildCookBar();
      // Wire per-step click → activate (idempotent)
      steps.forEach((s, i) => {
        if (!s.dataset.cookBound) {
          s.addEventListener('click', () => setActiveStep(i));
          s.dataset.cookBound = '1';
        }
      });
      // Activate the stored step (or first), guarding against zero-step recipes.
      if (steps.length > 0) setActiveStep(activeStepIndex);
      persist();
    }

    function exit() {
      active = false;
      delete document.body.dataset.cooksView;
      toggle.setAttribute('aria-pressed', 'false');
      if (labelEl) labelEl.textContent = "Cook's view";
      if (ingPanelBtn) {
        ingPanelBtn.hidden = true;
        ingPanelBtn.setAttribute('aria-expanded', 'false');
      }
      if (ingredientsSection) delete ingredientsSection.dataset.expanded;
      if (wakeLock) { try { wakeLock.release(); } catch {} wakeLock = null; }
      document.removeEventListener('visibilitychange', reacquireWakeLock);
      steps.forEach(s => { s.classList.remove('step-active'); s.classList.remove('step-done'); });
      completedSteps.clear();
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

    function renderProgressBar() {
      const bar = document.querySelector('.cb-progress-fill');
      if (!bar || !steps.length) return;
      const pct = Math.max(0, Math.min(100, ((activeStepIndex + 1) / steps.length) * 100));
      bar.style.width = `${pct}%`;
    }

    function setActiveStep(i) {
      if (steps.length === 0) return;
      // Mark the current step done before moving forward — gives visible
      // progress as the cook advances.
      if (i > activeStepIndex) completedSteps.add(activeStepIndex);
      activeStepIndex = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach((s, idx) => {
        s.classList.toggle('step-active', idx === activeStepIndex);
        s.classList.toggle('step-done', completedSteps.has(idx) && idx !== activeStepIndex);
      });
      const target = steps[activeStepIndex];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const counter = document.querySelector('[data-cook-counter]');
      if (counter) counter.textContent = `Step ${activeStepIndex + 1} of ${steps.length}`;
      // Disable prev/next at the boundaries so a tap doesn't feel dead.
      const prev = document.querySelector('.cb-prev');
      const next = document.querySelector('.cb-next');
      if (prev) prev.disabled = activeStepIndex === 0;
      if (next) next.disabled = activeStepIndex === steps.length - 1;
      renderProgressBar();
      persist();
    }

    function persist() {
      try {
        localStorage.setItem(recipeKey, JSON.stringify({
          active, step: activeStepIndex, completed: [...completedSteps],
        }));
      } catch {}
    }

    function buildCookBar() {
      if (document.querySelector('.cook-bar')) return;
      const bar = document.createElement('div');
      bar.className = 'cook-bar';
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', "Cook's view controls");
      bar.innerHTML = `
        <div class="cb-progress" aria-hidden="true"><div class="cb-progress-fill"></div></div>
        <div class="cb-row">
          <button type="button" class="cb-btn cb-prev" aria-label="Previous step">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            <span>Prev</span>
          </button>
          <button type="button" class="cb-btn cb-mise" aria-label="Toggle mise en place" aria-pressed="false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
            <span>Mise</span>
          </button>
          <span class="cb-counter" data-cook-counter></span>
          <button type="button" class="cb-btn cb-next" aria-label="Next step">
            <span>Next</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
          <button type="button" class="cb-btn cb-exit" aria-label="Exit cook's view">Done</button>
        </div>`;
      document.body.appendChild(bar);
      bar.querySelector('.cb-prev').addEventListener('click', () => setActiveStep(activeStepIndex - 1));
      bar.querySelector('.cb-next').addEventListener('click', () => setActiveStep(activeStepIndex + 1));
      bar.querySelector('.cb-exit').addEventListener('click', exit);
      bar.querySelector('.cb-mise').addEventListener('click', toggleMiseFromBar);
    }

    // Mise toggle wired into the cook-bar so the cook can flip up the
    // per-phase ingredient list from anywhere in the steps without scrolling
    // back to the top. Coordinates with the existing cv-ing-toggle button so
    // the two stay in sync (both are just views onto the same data-expanded
    // state). Opening: expand + open mise + scroll to it. Closing: collapse
    // + return scroll to active step so the cook resumes where they were.
    function toggleMiseFromBar() {
      if (!ingredientsSection) return;
      const mise = ingredientsSection.querySelector('[data-ing-panel="mise"]');
      const cbMise = document.querySelector('.cb-mise');
      const opening = !(ingredientsSection.dataset.expanded === '1' && mise && mise.open);
      if (opening) {
        ingredientsSection.dataset.expanded = '1';
        if (ingPanelBtn) ingPanelBtn.setAttribute('aria-expanded', 'true');
        if (mise) mise.open = true;
        if (cbMise) cbMise.setAttribute('aria-pressed', 'true');
        const target = mise || ingredientsSection;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        if (mise) mise.open = false;
        delete ingredientsSection.dataset.expanded;
        if (ingPanelBtn) ingPanelBtn.setAttribute('aria-expanded', 'false');
        if (cbMise) cbMise.setAttribute('aria-pressed', 'false');
        const stepEl = steps[activeStepIndex];
        if (stepEl) stepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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

  // ── Step timers ────────────────────────────────────────────────────────
  // Every step that declares `time_min` ≤ 240 emits a `data-step-timer`
  // button. Tapping it spawns a floating countdown card. Multiple timers can
  // run at once (stacked). Timers persist across reload via the absolute
  // `endsAt` timestamp, so a refresh mid-cook never resets the clock.
  // On completion: chime (Web Audio synth — no asset to ship), Notification
  // if the user has granted permission, vibrate on supported hardware. Works
  // identically on desktop, tablet, and phone — the systemic answer for
  // "launch a timer on whatever device".
  if (document.querySelector('[data-step-timer]')) initStepTimers();

  function initStepTimers() {
    const STORE_KEY = `hdr-timers:${location.pathname}`;
    const timers = []; // { id, label, totalSec, endsAt, paused, remainingSec, doneAt, el }
    let dock = null;
    let tickHandle = null;
    let audioCtx = null;
    let nextId = 1;

    function getDock() {
      if (dock) return dock;
      dock = document.createElement('div');
      dock.className = 'step-timer-dock';
      dock.setAttribute('aria-live', 'polite');
      dock.setAttribute('aria-label', 'Active step timers');
      document.body.appendChild(dock);
      return dock;
    }

    function persist() {
      try {
        const snap = timers.map(t => ({
          id: t.id, label: t.label, totalSec: t.totalSec,
          endsAt: t.endsAt, paused: t.paused, remainingSec: t.remainingSec,
          doneAt: t.doneAt,
        }));
        if (snap.length) localStorage.setItem(STORE_KEY, JSON.stringify(snap));
        else localStorage.removeItem(STORE_KEY);
      } catch {}
    }

    function ensureTick() {
      if (tickHandle) return;
      tickHandle = setInterval(tick, 250);
    }
    function maybeStopTick() {
      if (timers.length === 0 && tickHandle) {
        clearInterval(tickHandle); tickHandle = null;
      }
    }

    function tick() {
      const now = Date.now();
      for (const t of timers) {
        if (t.doneAt) continue;
        let remaining;
        if (t.paused) remaining = t.remainingSec;
        else remaining = Math.max(0, Math.round((t.endsAt - now) / 1000));
        const display = t.el.querySelector('.st-time');
        if (display) display.textContent = fmtClock(remaining);
        if (!t.paused && remaining <= 0) {
          t.doneAt = now;
          t.el.classList.add('is-done');
          const status = t.el.querySelector('.st-status');
          if (status) status.textContent = 'Done';
          ringChime();
          notifyDone(t);
          if (navigator.vibrate) { try { navigator.vibrate([300, 120, 300]); } catch {} }
        }
      }
      persist();
    }

    function fmtClock(sec) {
      sec = Math.max(0, Math.floor(sec));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      const pad = (n) => String(n).padStart(2, '0');
      return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    }

    function ringChime() {
      try {
        if (!audioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          audioCtx = new Ctx();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        // Two short rising chimes — pleasant, audible without being startling.
        const now = audioCtx.currentTime;
        [880, 1175].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain).connect(audioCtx.destination);
          const start = now + i * 0.32;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.32, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
          osc.start(start);
          osc.stop(start + 0.6);
        });
      } catch {}
    }

    function notifyDone(t) {
      try {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        const body = t.label || 'Timer complete';
        const n = new Notification('Timer done', { body, tag: `hdr-timer-${t.id}` });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {}
    }

    function maybeRequestNotificationPermission() {
      try {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      } catch {}
    }

    function buildCard(t) {
      const card = document.createElement('div');
      card.className = 'step-timer-card';
      card.setAttribute('role', 'group');
      card.setAttribute('aria-label', `Timer: ${t.label}`);
      card.innerHTML = `
        <div class="st-head">
          <span class="st-status" aria-live="polite">${t.paused ? 'Paused' : 'Running'}</span>
          <button type="button" class="st-x" aria-label="Dismiss timer">×</button>
        </div>
        <div class="st-label" title="${escapeAttr(t.label)}">${escapeText(t.label)}</div>
        <div class="st-time" aria-label="Time remaining">${fmtClock(remainingFor(t))}</div>
        <div class="st-controls">
          <button type="button" class="st-btn st-pause" aria-label="${t.paused ? 'Resume timer' : 'Pause timer'}">${t.paused ? 'Resume' : 'Pause'}</button>
          <button type="button" class="st-btn st-add" aria-label="Add 30 seconds">+30s</button>
          <button type="button" class="st-btn st-reset" aria-label="Reset timer">Reset</button>
        </div>`;
      card.querySelector('.st-x').addEventListener('click', () => removeTimer(t.id));
      card.querySelector('.st-pause').addEventListener('click', () => togglePause(t.id));
      card.querySelector('.st-add').addEventListener('click', () => addSeconds(t.id, 30));
      card.querySelector('.st-reset').addEventListener('click', () => resetTimer(t.id));
      return card;
    }

    function escapeText(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
    function escapeAttr(s) { return escapeText(s).replace(/"/g, '&quot;'); }

    function remainingFor(t) {
      if (t.doneAt) return 0;
      if (t.paused) return t.remainingSec;
      return Math.max(0, Math.round((t.endsAt - Date.now()) / 1000));
    }

    function startTimer(minutes, label) {
      maybeRequestNotificationPermission();
      const totalSec = Math.round(Number(minutes) * 60);
      if (!isFinite(totalSec) || totalSec <= 0) return;
      const t = {
        id: nextId++,
        label: label || `${minutes} min timer`,
        totalSec,
        endsAt: Date.now() + totalSec * 1000,
        paused: false,
        remainingSec: totalSec,
        doneAt: null,
        el: null,
      };
      t.el = buildCard(t);
      getDock().appendChild(t.el);
      timers.push(t);
      ensureTick();
      persist();
    }

    function removeTimer(id) {
      const i = timers.findIndex(x => x.id === id);
      if (i < 0) return;
      const t = timers[i];
      if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
      timers.splice(i, 1);
      persist();
      maybeStopTick();
    }

    function togglePause(id) {
      const t = timers.find(x => x.id === id);
      if (!t || t.doneAt) return;
      if (t.paused) {
        t.paused = false;
        t.endsAt = Date.now() + t.remainingSec * 1000;
      } else {
        t.paused = true;
        t.remainingSec = Math.max(0, Math.round((t.endsAt - Date.now()) / 1000));
      }
      const status = t.el.querySelector('.st-status');
      const btn = t.el.querySelector('.st-pause');
      if (status) status.textContent = t.paused ? 'Paused' : 'Running';
      if (btn) {
        btn.textContent = t.paused ? 'Resume' : 'Pause';
        btn.setAttribute('aria-label', t.paused ? 'Resume timer' : 'Pause timer');
      }
      t.el.classList.toggle('is-paused', t.paused);
      persist();
    }

    function addSeconds(id, sec) {
      const t = timers.find(x => x.id === id);
      if (!t) return;
      if (t.doneAt) {
        t.doneAt = null;
        t.el.classList.remove('is-done');
        const status = t.el.querySelector('.st-status');
        if (status) status.textContent = t.paused ? 'Paused' : 'Running';
      }
      if (t.paused) t.remainingSec += sec;
      else t.endsAt += sec * 1000;
      t.totalSec += sec;
      ensureTick();
      tick();
    }

    function resetTimer(id) {
      const t = timers.find(x => x.id === id);
      if (!t) return;
      t.doneAt = null;
      t.paused = false;
      t.remainingSec = t.totalSec;
      t.endsAt = Date.now() + t.totalSec * 1000;
      t.el.classList.remove('is-done', 'is-paused');
      const status = t.el.querySelector('.st-status');
      const btn = t.el.querySelector('.st-pause');
      if (status) status.textContent = 'Running';
      if (btn) { btn.textContent = 'Pause'; btn.setAttribute('aria-label', 'Pause timer'); }
      ensureTick();
      tick();
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('[data-step-timer]');
      if (!btn) return;
      e.preventDefault();
      // Stop the click from bubbling to the cook's-view step handler — the
      // cook is launching a timer, not signaling "I'm now on this step".
      e.stopPropagation();
      const minutes = parseFloat(btn.getAttribute('data-step-timer'));
      const label = btn.getAttribute('data-step-label') || '';
      startTimer(minutes, label);
    });

    // Restore prior timers on load — guard against absurd clock jumps so a
    // stale entry from a different machine/timezone can't leak forward.
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const s of arr) {
            if (!s || typeof s.totalSec !== 'number') continue;
            // Drop entries that ended more than an hour ago — the cook has moved on.
            if (s.doneAt && (Date.now() - s.doneAt) > 60 * 60 * 1000) continue;
            const t = {
              id: nextId++,
              label: s.label || '',
              totalSec: s.totalSec,
              endsAt: typeof s.endsAt === 'number' ? s.endsAt : Date.now() + s.totalSec * 1000,
              paused: !!s.paused,
              remainingSec: typeof s.remainingSec === 'number' ? s.remainingSec : s.totalSec,
              doneAt: s.doneAt || null,
              el: null,
            };
            t.el = buildCard(t);
            if (t.doneAt) t.el.classList.add('is-done');
            if (t.paused) t.el.classList.add('is-paused');
            getDock().appendChild(t.el);
            timers.push(t);
          }
          if (timers.length) ensureTick();
        }
      }
    } catch {}
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
