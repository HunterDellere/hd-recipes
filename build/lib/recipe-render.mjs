/**
 * Render recipe-specific page sections (ingredients table, steps, nutrition,
 * scaling controls, equipment chips).
 */

import MarkdownIt from 'markdown-it';
import { fmtMinutes, frameRecipeTime } from './cards.mjs';
import { classifyIngredients } from './units.mjs';
import { renderPicture, relPrefixFor } from './images.mjs';

const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render a multi-paragraph prose block from frontmatter (e.g. fm.about) as proper
 * HTML — paragraphs, bold, italics, ordered/unordered lists, inline code.
 * If the input is empty or one short line, returns a single <p>.
 */
function prosify(s) {
  if (!s) return '';
  const trimmed = String(s).trim();
  if (!trimmed) return '';
  // markdown-it handles its own escaping for inline content. We disabled HTML so
  // raw <tags> in the source are escaped, which is the safe behavior.
  return md.render(trimmed);
}

/**
 * Slugify a heading's text into a URL anchor. Lowercases, trims, replaces
 * runs of non-alphanumerics with single hyphens. Used by safety pages so
 * `## Poultry` becomes `<h2 id="poultry">` and a recipe's safety_notes ref
 * `safety/meat-doneness#poultry` resolves.
 */
function slugifyAnchor(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Run prosify, then post-process the HTML to inject `id="..."` attributes on
 * h2/h3 elements. Used on reference pages (safety, future cuisines-as-pages)
 * where in-page anchors need to be linkable from elsewhere in the site.
 */
function prosifyWithHeadingAnchors(s) {
  const html = prosify(s);
  if (!html) return '';
  const seen = new Map();
  return html.replace(/<(h[23])>([\s\S]*?)<\/\1>/g, (full, tag, inner) => {
    let base = slugifyAnchor(inner);
    if (!base) return full;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
}

function relPath(fromPath, toPath) {
  const fromParts = fromPath.split('/').slice(0, -1);
  const toParts = toPath.split('/');
  let common = 0;
  while (common < fromParts.length && common < toParts.length - 1 && fromParts[common] === toParts[common]) common++;
  const ups = fromParts.length - common;
  const downs = toParts.slice(common);
  return ('../'.repeat(ups) + downs.join('/')) || './';
}

function fmtQty(qty) {
  if (typeof qty === 'string') return escapeHtml(qty);
  if (typeof qty !== 'number') return '';
  // round to 3 sig figs, then strip trailing zeros
  const rounded = Math.round(qty * 1000) / 1000;
  return String(rounded);
}

// Match metric/imperial paired quantities in step text — `115 g / 1 stick`,
// `1500 ml / 6 cups`, `1 g / ½ tsp`, etc. — and wrap them so client-side
// scaling can recompute both halves when servings change. The slash-pair is
// the recipe authoring convention for ingredient masses inside step prose;
// times, temperatures, distances, and bare-count items don't follow it, so
// the wrap is safe by construction.
const FRAC_TO_NUM = { '½':0.5,'¼':0.25,'¾':0.75,'⅓':1/3,'⅔':2/3,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875 };
const FRAC_CHARS = '½¼¾⅓⅔⅛⅜⅝⅞';

function parseQtyText(s) {
  if (!s) return null;
  s = String(s).trim();
  if (FRAC_TO_NUM[s] != null) return FRAC_TO_NUM[s];
  let m = s.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + (+m[2]) / (+m[3]);
  m = s.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*([${FRAC_CHARS}])$`));
  if (m) return +m[1] + FRAC_TO_NUM[m[2]];
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return (+m[1]) / (+m[2]);
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

const QTY_PATTERN_SRC = `(?:\\d+(?:\\.\\d+)?\\s+\\d+\\/\\d+|\\d+(?:\\.\\d+)?\\s*[${FRAC_CHARS}]|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[${FRAC_CHARS}])`;
const METRIC_UNIT_SRC = '(?:kg|mg|ml|g|l)';
const IMPERIAL_UNIT_SRC = '(?:tablespoons?|teaspoons?|tbsp|tsp|cups?|sticks?|pounds?|lbs?|oz)';
function buildPairRegex() {
  return new RegExp(
    `(${QTY_PATTERN_SRC})\\s+(${METRIC_UNIT_SRC})\\s*\\/\\s*(${QTY_PATTERN_SRC})\\s+(${IMPERIAL_UNIT_SRC})\\b`,
    'g'
  );
}

function wrapStepQuantities(text) {
  if (!text) return '';
  const re = buildPairRegex();
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    const [full, mq, mu, iq, iu] = m;
    out += escapeHtml(text.slice(last, m.index));
    const mqNum = parseQtyText(mq);
    const iqNum = parseQtyText(iq);
    if (mqNum == null || iqNum == null || !isFinite(mqNum) || !isFinite(iqNum)) {
      out += escapeHtml(full);
    } else {
      // Wrap with auto-link-skip sentinels so augment.autoLinkBody can't bury
      // an <a> inside the span — runtime updates via textContent would wipe
      // such a link, and there's nothing meaningful to link inside a quantity.
      out += `<!-- auto-link-skip --><span class="step-qty" data-step-qty data-metric-qty="${mqNum}" data-metric-unit="${escapeHtml(mu)}" data-imp-qty="${iqNum}" data-imp-unit="${escapeHtml(iu)}">${escapeHtml(full)}</span><!-- /auto-link-skip -->`;
    }
    last = m.index + full.length;
  }
  out += escapeHtml(text.slice(last));
  return out;
}

export function renderRecipeHero(fm, slug, category, opts = {}) {
  const time = fm.time || {};
  const stats = []; // primary scannables: servings, time, difficulty
  const tags  = []; // secondary metadata: cuisine, course, diet

  // ── stats ────────────────────────────────────────────
  if (fm.servings) {
    const note = fm.yield_note ? `<span class="rh-stat-sub">${escapeHtml(fm.yield_note)}</span>` : '';
    stats.push(`<div class="rh-stat" data-stat="servings">
      <span class="rh-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19a8 8 0 0 1 16 0"/><circle cx="12" cy="9" r="4"/></svg></span>
      <span class="rh-stat-text"><span class="rh-stat-value">${fm.servings}</span><span class="rh-stat-label">servings</span>${note}</span>
    </div>`);
  }

  const framed = frameRecipeTime(time);
  if (framed && framed.lead) {
    const isActive = framed.mode === 'active';
    const sub = isActive
      ? (framed.annotation ? `<span class="rh-stat-sub">${escapeHtml(framed.annotation)}</span>` : '')
      : (time.active_min != null && time.active_min < (time.total_min || 0) - 5
          ? `<span class="rh-stat-sub">${escapeHtml(fmtMinutes(time.active_min))} active</span>`
          : '');
    stats.push(`<div class="rh-stat" data-stat="time">
      <span class="rh-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
      <span class="rh-stat-text"><span class="rh-stat-value">${escapeHtml(framed.lead)}</span><span class="rh-stat-label">${isActive ? 'active' : 'total'}</span>${sub}</span>
    </div>`);
  }

  if (fm.difficulty) {
    stats.push(`<div class="rh-stat" data-stat="difficulty">
      <span class="rh-stat-icon rh-d-${fm.difficulty}" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          ${fm.difficulty === 'easy'   ? '<path d="M5 12h14"/>'
          : fm.difficulty === 'medium' ? '<path d="M5 9h14"/><path d="M5 15h14"/>'
          : /* hard */                   '<path d="M5 7h14"/><path d="M5 12h14"/><path d="M5 17h14"/>'}
        </svg>
      </span>
      <span class="rh-stat-text"><span class="rh-stat-value">${escapeHtml(fm.difficulty)}</span><span class="rh-stat-label">difficulty</span></span>
    </div>`);
  }

  // ── tags (cuisine / course / diet) ──────────────────
  // All are bg-soft pills, all linkable to their respective tag pages where possible.
  const currentPath = `pages/${category}/${slug}.html`;
  if (fm.cuisine) {
    const cuisineSlug = String(fm.cuisine).toLowerCase().replace(/\s+/g, '-');
    const targetPath = `pages/cuisines/${cuisineSlug}.html`;
    const cuisineExists = opts.entriesByPath && opts.entriesByPath.has(targetPath);
    if (cuisineExists) {
      const href = relPath(currentPath, targetPath);
      tags.push(`<a class="rh-tag rh-tag-cuisine" href="${escapeHtml(href)}" data-category="cuisines">${escapeHtml(fm.cuisine)}</a>`);
    } else {
      tags.push(`<span class="rh-tag rh-tag-cuisine">${escapeHtml(fm.cuisine)}</span>`);
    }
  }
  if (fm.course) {
    tags.push(`<span class="rh-tag rh-tag-course">${escapeHtml(fm.course)}</span>`);
  }
  for (const d of (fm.diet || [])) {
    tags.push(`<span class="rh-tag rh-tag-diet">${escapeHtml(d)}</span>`);
  }

  // ── photo column ─────────────────────────────────────
  let photoHtml = '';
  if (opts.images && opts.images.hero) {
    const relTo = relPrefixFor(currentPath);
    photoHtml = `<div class="rh-photo">${renderPicture(opts.images.hero, {
      sizes: '(min-width: 900px) 44vw, 100vw',
      alt: fm.title || slug,
      className: 'rh-img',
      eager: true,
      fetchPriority: 'high',
      aspect: '3 / 2',
    }, relTo)}</div>`;
  }

  return `
    <header class="recipe-hero${photoHtml ? ' has-photo' : ''}">
      <div class="rh-info">
        <span class="rh-eyebrow">Recipe</span>
        <h1 class="rh-title">${escapeHtml(fm.title || slug)}</h1>
        ${fm.desc ? `<p class="rh-desc">${escapeHtml(fm.desc)}</p>` : ''}
        ${stats.length ? `<div class="rh-stats" role="list">${stats.join('')}</div>` : ''}
        ${tags.length ? `<div class="rh-tags">${tags.join('')}</div>` : ''}
        <div class="rh-actions">
          <button type="button" class="rh-cook-btn" data-cook-toggle aria-pressed="false" aria-label="Enter cook's view, focus on steps with screen kept on">
            <span class="rh-cook-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 18h18l-2 3H5z"/><path d="M5 14h14a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4z"/><path d="M12 6v4"/><path d="M9 3v3"/><path d="M15 3v3"/>
              </svg>
            </span>
            <span class="rh-cook-label">Cook's view</span>
          </button>
          <button type="button" class="rh-log-btn" data-cook-log aria-label="Log that you cooked this">
            <span class="rh-log-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </span>
            <span class="rh-log-label">I cooked this</span>
          </button>
          <span class="rh-log-badge" data-cook-log-badge hidden></span>
        </div>
      </div>
      ${photoHtml}
    </header>`;
}

export function renderIngredientsTable(fm, currentPath, ingredientBySlug) {
  if (!fm.ingredients || !fm.ingredients.length) return '';

  // Strip leading measurement-paren from a note when the parenthetical is
  // pure measurement text (e.g. "(4 tbsp)", "(1 cup)", "(½ stick)"). Runtime
  // recomputes that parenthetical in whichever unit system is opposite the
  // active toggle, so leaving the author's manual one in place would either
  // duplicate or contradict it. Author prose context after the paren stays.
  const MEAS_TOKEN = /\b(tsp|tbsp|cup|cups|oz|ounces?|lb|lbs|pound|pounds?|sticks?|tablespoons?|teaspoons?|grams?|kilo(?:gram)?s?|ml|milliliters?|liters?|kg|g)\b/i;
  function splitNote(noteText) {
    if (!noteText) return '';
    const m = String(noteText).match(/^\s*\(([^)]+)\)\s*(.*)$/);
    if (!m) return noteText;
    const inner = m[1].trim();
    const hasNumber = /\d|[¼½¾⅛⅜⅝⅞⅓⅔]/.test(inner);
    const hasUnit = MEAS_TOKEN.test(inner);
    if (hasNumber && hasUnit) return m[2].trim();
    return noteText;
  }

  // Resolve ingredient roles + packs once. classified[i] = { ing, page, pack, role, parent? }
  const classified = classifyIngredients(fm.ingredients, ingredientBySlug);

  const renderRow = (entry, opts = {}) => {
    const { ing, page, pack, role, parent } = entry;
    let label = escapeHtml(ing.item);
    if (ing.slug && page) {
      const href = relPath(currentPath, page.path);
      label = `<a class="ing-link" href="${escapeHtml(href)}">${label}</a>`;
    }
    // Density + imperial preference resolution order (most specific wins):
    //   1. Per-line override on the recipe ingredient row
    //   2. Ingredient page frontmatter
    //   3. Built-in fallback in recipe.js (water density, size-driven imperial unit)
    const tfm = page && (page._fm || page.fm) ? (page._fm || page.fm) : null;
    const density = ing.density_g_per_ml ?? (tfm && tfm.density_g_per_ml);
    const impPref = ing.imperial_pref   ?? (tfm && tfm.imperial_pref);
    const densityAttr = (typeof density === 'number') ? ` data-density="${density}"` : '';
    const impPrefAttr = impPref ? ` data-imp-pref="${escapeHtml(impPref)}"` : '';
    const qty = fmtQty(ing.qty);
    const unit = ing.unit ? escapeHtml(ing.unit) : '';
    const prep = ing.prep ? `<span class="ing-prep">, ${escapeHtml(ing.prep)}</span>` : '';
    const cleanNote = splitNote(ing.note);
    const isScalable = typeof ing.qty === 'number';
    const isConvertible = isScalable && unit && unit !== 'each' && unit !== 'pinch' && unit !== 'clove';
    const alt = isConvertible ? ` <span class="ing-alt" data-ing-alt aria-hidden="true"></span>` : '';
    const note = cleanNote ? `<span class="ing-note"> — ${escapeHtml(cleanNote)}</span>` : '';
    const opt = ing.optional ? `<span class="ing-opt">optional</span>` : '';

    // Pack rows in shop view show "N × <label>" instead of qty/unit. The
    // underlying numeric stays in data-qty/data-unit so scaling math is
    // identical between views.
    const packAttrs = (role === 'pack' && pack)
      ? ` data-pack-role="pack"` +
        (pack.size_ml != null ? ` data-pack-size-ml="${pack.size_ml}"` : '') +
        (pack.size_g  != null ? ` data-pack-size-g="${pack.size_g}"`  : '') +
        (pack.size_label ? ` data-pack-label="${escapeHtml(pack.size_label)}"` : '')
      : '';
    const deriveAttrs = (role === 'derived' && ing.derive_from)
      ? ` data-derive-from="${escapeHtml(ing.derive_from)}"`
      : '';
    const idAttr = ing.id ? ` data-ing-id="${escapeHtml(ing.id)}"` : '';

    const dataAttrs = `data-qty="${escapeHtml(qty)}" data-unit="${escapeHtml(unit)}"${densityAttr}${impPrefAttr}${idAttr}${packAttrs}${deriveAttrs}` + (isScalable ? ' data-scalable="1"' : '');

    // Pack rows render as "N × <pack label>" in both shop and mise views — a
    // can is always counted in cans, never in ml. recipe.js keeps the count
    // current as the user scales servings (rounding up; you can't buy half).
    let qtyCol;
    if (role === 'pack' && pack && (pack.size_ml || pack.size_g) && pack.size_label) {
      const sizeBase = pack.size_ml || pack.size_g;
      const initialCount = isScalable ? Math.max(1, Math.ceil(parseFloat(qty) / sizeBase)) : '';
      qtyCol = `<span class="ing-qty ing-qty-pack">
            <span data-pack-count>${initialCount}</span> × <span data-pack-label-text>${escapeHtml(pack.size_label)}</span>
          </span>`;
    } else {
      qtyCol = `<span class="ing-qty"><span data-ing-qty>${qty}</span> <span data-ing-unit>${unit}</span></span>`;
    }

    // Derived rows surface their parent's identity inline so a cook reading
    // the mise sees "(from coconut milk)" rather than guessing.
    let derivedHint = '';
    if (role === 'derived' && parent && opts.variant === 'mise') {
      const parentLabel = parent.ing.item || parent.ing.id || '';
      derivedHint = parentLabel
        ? ` <span class="ing-derived-hint">from ${escapeHtml(parentLabel)}</span>`
        : '';
    }

    return `
        <li class="ing-row${role === 'pack' ? ' ing-row-pack' : ''}${role === 'derived' ? ' ing-row-derived' : ''}" ${dataAttrs}>
          <label class="ing-check"><input type="checkbox" class="ing-cb"><span class="ing-check-mark"></span></label>
          ${qtyCol}
          <span class="ing-name">${label}${prep}${alt}${opt}${note}${derivedHint}</span>
        </li>`;
  };

  // Shopping list = pack + plain rows in declaration order. Hides derived
  // (their grams already roll up into the parent pack).
  const shopRows = classified.filter(r => r.role !== 'derived');
  const shopHtml = shopRows.map(r => renderRow(r, { variant: 'shop' })).join('');

  // Mise breakdown = plain + derived rows, grouped by phase. Hides packs that
  // are split into derived rows (those slices already cover what each phase
  // uses). Packs without derived children stay in mise — the author hasn't
  // split them, so the whole buying-unit gets used as-is in its declared
  // group.
  const packsWithDerived = new Set();
  for (const r of classified) {
    if (r.role === 'derived' && r.parent) packsWithDerived.add(r.parent.idx);
  }
  const miseRows = classified.filter(r => {
    if (r.role !== 'pack') return true;
    return !packsWithDerived.has(r.idx);
  });
  const phaseGroups = [];
  const phaseMap = new Map();
  for (const r of miseRows) {
    const g = r.ing.group || '';
    if (!phaseMap.has(g)) { phaseMap.set(g, []); phaseGroups.push(g); }
    phaseMap.get(g).push(r);
  }
  const miseHtml = phaseGroups.map(g => {
    const head = g ? `<h3 class="ing-group-head">${escapeHtml(g)}</h3>` : '';
    const rows = phaseMap.get(g).map(r => renderRow(r, { variant: 'mise' })).join('');
    return `${head}<ol class="ing-list">${rows}\n      </ol>`;
  }).join('\n');

  const phaseCount = phaseGroups.filter(Boolean).length;
  const itemCount = shopRows.length;
  const baseServings = fm.servings || 1;
  return `
    <span class="section-anchor" id="ingredients"></span>
    <div class="section-head"><h2>Mise en Place</h2></div>
    <div class="recipe-ingredients" data-base-servings="${baseServings}">
      <div class="ing-controls">
        <div class="ing-control ing-scale">
          <span class="ing-control-label">Servings</span>
          <div class="ing-scale-stepper">
            <button type="button" class="ing-scale-btn" data-scale-step="-1" aria-label="Decrease servings">−</button>
            <input type="number" class="ing-scale-input" data-scale-input value="${baseServings}" min="1" max="100" aria-label="Number of servings">
            <button type="button" class="ing-scale-btn" data-scale-step="1" aria-label="Increase servings">+</button>
          </div>
        </div>
        <div class="ing-control ing-units-control">
          <span class="ing-control-label">Units</span>
          <div class="ing-units" role="group" aria-label="Display units">
            <span class="ing-units-thumb" aria-hidden="true"></span>
            <button type="button" class="ing-units-btn" data-units="metric" aria-pressed="true">
              <span class="ing-units-icon" aria-hidden="true">g</span>
              <span class="ing-units-label">Metric</span>
            </button>
            <button type="button" class="ing-units-btn" data-units="imperial" aria-pressed="false">
              <span class="ing-units-icon" aria-hidden="true">oz</span>
              <span class="ing-units-label">Imperial</span>
            </button>
          </div>
        </div>
        <button type="button" class="ing-shop-btn" data-shop-export aria-label="Copy shopping list to clipboard">
          <svg class="ing-shop-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 5h6a2 2 0 0 1 2 2v2"/><path d="M5 9h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 5a3 3 0 0 1 6 0"/>
          </svg>
          <span>Copy list</span>
        </button>
      </div>
      <details class="ing-panel ing-panel-shop" data-ing-panel="shop">
        <summary class="ing-panel-summary">
          <span class="ing-panel-title">Shopping list</span>
          <span class="ing-panel-meta">
            <span class="ing-panel-count"><span data-shop-count>${itemCount}</span> ${itemCount === 1 ? 'item' : 'items'}</span>
            <span class="ing-panel-chev" aria-hidden="true">▾</span>
          </span>
        </summary>
        <ol class="ing-list ing-list-shop">${shopHtml}
        </ol>
      </details>
      ${phaseCount > 0 ? `<details class="ing-panel ing-panel-mise" data-ing-panel="mise">
        <summary class="ing-panel-summary">
          <span class="ing-panel-title">Mise en place by phase</span>
          <span class="ing-panel-meta">
            <span class="ing-panel-count">${phaseCount} ${phaseCount === 1 ? 'phase' : 'phases'}</span>
            <span class="ing-panel-chev" aria-hidden="true">▾</span>
          </span>
        </summary>
        <div class="ing-mise-body">${miseHtml}
        </div>
      </details>` : ''}
    </div>`;
}

export function renderSteps(fm, currentPath, techniqueBySlug, images) {
  if (!fm.steps || !fm.steps.length) return '';
  const relTo = relPrefixFor(currentPath);
  const stepImages = images && images.steps ? images.steps : {};

  const items = fm.steps.map((step, i) => {
    const stepNum = i + 1;
    let body = wrapStepQuantities(step.text);
    if (step.technique) {
      const target = techniqueBySlug.get(step.technique) || techniqueBySlug.get(step.technique.replace(/^techniques\//, ''));
      if (target) {
        const href = relPath(currentPath, target.path);
        const techTitle = (target.title || step.technique).split('—')[0].split('·')[0].trim();
        body += ` <a class="step-tech" href="${escapeHtml(href)}">${escapeHtml(techTitle)}</a>`;
      }
    }
    // The time pill doubles as a one-tap timer launcher when the duration is
    // a live cooking window (≤ 4 h). Anything longer is a marinade / overnight
    // rest — those stay static text since an in-page countdown isn't useful
    // across that horizon.
    let time = '';
    if (step.time_min) {
      const label = escapeHtml(fmtMinutes(step.time_min));
      if (Number(step.time_min) > 0 && Number(step.time_min) <= 240) {
        const stepLabel = escapeHtml((step.text || '').slice(0, 80));
        time = `<button type="button" class="step-time step-time-btn" data-step-timer="${Number(step.time_min)}" data-step-label="Step ${stepNum}: ${stepLabel}" aria-label="Start ${label} timer for step ${stepNum}"><span class="step-time-icon" aria-hidden="true">⏱</span><span class="step-time-text">${label}</span></button>`;
      } else {
        time = `<span class="step-time">${label}</span>`;
      }
    }

    // Image source: convention-detected step-N.jpg wins; explicit fm.steps[i].image is reserved
    // for legacy or external-asset use.
    const img = stepImages[stepNum];
    const imgHtml = img
      ? `<figure class="step-figure" data-step-img="${stepNum}">${renderPicture(img, {
          sizes: '(min-width: 1100px) 720px, 100vw',
          alt: `Step ${stepNum}: ${(step.text || '').slice(0, 80)}`,
          className: 'step-img',
          aspect: `${img.intrinsic.width} / ${img.intrinsic.height}`,
        }, relTo)}</figure>`
      : '';

    return `
      <li class="step-item${imgHtml ? ' has-image' : ''}">
        <span class="step-num">${stepNum}</span>
        <div class="step-body">${body}${time}</div>
        ${imgHtml}
      </li>`;
  }).join('');
  return `
    <span class="section-anchor" id="execution"></span>
    <div class="section-head"><h2>Execution</h2></div>
    <ol class="recipe-steps">${items}
    </ol>`;
}

export function renderNutritionBlock(nutrition) {
  if (!nutrition || !nutrition.perServing || !Object.keys(nutrition.perServing).length) return '';
  const ps = nutrition.perServing;
  const row = (label, key, unit) => {
    if (ps[key] == null) return '';
    return `<div class="nut-row"><span class="nut-label">${escapeHtml(label)}</span><span class="nut-val">${ps[key]}<span class="nut-unit">${unit}</span></span></div>`;
  };
  const macros = [
    row('Calories', 'energy_kcal', ' kcal'),
    row('Protein', 'protein_g', ' g'),
    row('Fat', 'fat_g', ' g'),
    row('Carbs', 'carbs_g', ' g'),
    row('Fiber', 'fiber_g', ' g'),
    row('Sugar', 'sugar_g', ' g'),
    row('Sat. fat', 'saturated_fat_g', ' g'),
  ].filter(Boolean).join('');
  const micros = [
    row('Sodium', 'sodium_mg', ' mg'),
    row('Potassium', 'potassium_mg', ' mg'),
    row('Calcium', 'calcium_mg', ' mg'),
    row('Iron', 'iron_mg', ' mg'),
    row('Vitamin C', 'vitamin_c_mg', ' mg'),
    row('Vitamin A', 'vitamin_a_iu', ' IU'),
  ].filter(Boolean).join('');

  // Surface the names of ingredients excluded from the calculation so cooks
  // know what's not counted (and contributors know what to map).
  const missingList = (nutrition.missing || []).map(m => typeof m === 'string' ? { name: m } : m);
  const missingNote = missingList.length
    ? (() => {
        const names = missingList.map(m => escapeHtml(m.name || m.slug || ''));
        const shown = names.slice(0, 3).join(', ');
        const more = names.length > 3 ? `, +${names.length - 3} more` : '';
        const verb = missingList.length === 1 ? "isn't" : "aren't";
        return `<p class="nut-missing"><span class="nut-missing-icon" aria-hidden="true">⚠</span> Estimated — ${shown}${more} ${verb} mapped to USDA data yet.</p>`;
      })()
    : '';

  return `
    <span class="section-anchor" id="nutrition"></span>
    <div class="section-head"><h2>Nutrition <span class="sh-sub">per serving</span></h2></div>
    <div class="recipe-nutrition">
      <div class="nut-col">${macros}</div>
      ${micros ? `<div class="nut-col">${micros}</div>` : ''}
      ${missingNote}
      <p class="nut-source">Data: USDA FoodData Central</p>
    </div>`;
}

export function renderEquipment(fm, currentPath, equipmentBySlug) {
  if (!fm.equipment || !fm.equipment.length) return '';
  const chips = fm.equipment.map(slug => {
    const target = equipmentBySlug.get(slug) || equipmentBySlug.get(slug.replace(/^equipment\//, ''));
    if (target) {
      const href = relPath(currentPath, target.path);
      const title = (target.title || slug).split('—')[0].split('·')[0].trim();
      return `<a class="eq-chip" href="${escapeHtml(href)}">${escapeHtml(title)}</a>`;
    }
    return `<span class="eq-chip eq-chip-stub">${escapeHtml(slug)}</span>`;
  }).join('');
  return `
    <span class="section-anchor" id="equipment"></span>
    <div class="section-head"><h2>Equipment</h2></div>
    <div class="recipe-equipment">${chips}</div>`;
}

export function renderRecipeNotes(fm) {
  if (!fm.notes) return '';
  const notesHtml = fm.notes.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
  return `
    <span class="section-anchor" id="notes"></span>
    <div class="section-head"><h2>Notes</h2></div>
    <div class="recipe-notes">${notesHtml}</div>`;
}

export function renderSubstitutions(fm, opts = {}) {
  if (!fm.substitutions || !fm.substitutions.length) return '';
  const items = fm.substitutions.map(s => `
        <li><strong>${escapeHtml(s.for)}</strong> → ${escapeHtml(s.use)}${s.note ? ` <span class="sub-note">${escapeHtml(s.note)}</span>` : ''}</li>`).join('');
  const blurb = opts.context === 'ingredient'
    ? 'What to reach for when this ingredient is unavailable. Each row names the use case so the swap is judged in context.'
    : opts.context === 'equipment'
      ? 'Workable alternatives when this tool is unavailable. The use case sets the bar each swap has to clear.'
      : '1:1 ingredient swaps where the dish stays the same dish.';
  return `
    <span class="section-anchor" id="substitutions"></span>
    <div class="section-head"><h2>Substitutions</h2><p class="section-blurb">${blurb}</p></div>
    <ul class="recipe-subs">${items}
    </ul>`;
}

/**
 * Modifications: pivots that change the dish's character (protein, regional,
 * dietary, texture). Cards with a kind chip + the technique change spelled out.
 */
export function renderModifications(fm) {
  if (!fm.modifications || !fm.modifications.length) return '';
  const KIND_LABEL = {
    regional: 'Regional',
    dietary:  'Dietary',
    protein:  'Protein',
    texture:  'Texture',
    heat:     'Heat',
    occasion: 'Occasion',
  };
  const items = fm.modifications.map(m => {
    const kind = m.kind && KIND_LABEL[m.kind] ? m.kind : '';
    const chip = kind ? `<span class="mod-chip mod-chip-${kind}">${KIND_LABEL[kind]}</span>` : '';
    return `
      <li class="mod-card${kind ? ` mod-card-${kind}` : ''}">
        <div class="mod-head">
          ${chip}
          <span class="mod-arrow"><span class="mod-for">${escapeHtml(m.for)}</span><span class="mod-arrow-glyph" aria-hidden="true">→</span><span class="mod-to">${escapeHtml(m.to)}</span></span>
        </div>
        <p class="mod-how">${escapeHtml(m.how)}</p>
      </li>`;
  }).join('');
  return `
    <span class="section-anchor" id="modifications"></span>
    <div class="section-head"><h2>Modifications</h2><p class="section-blurb">Pivots that change the dish's character — protein swaps, regional variants, dietary recastings.</p></div>
    <ul class="recipe-mods">${items}
    </ul>`;
}

/**
 * "Make it from scratch" — links to homemade-version recipes for store-bought
 * ingredients used in this recipe. Distinct from substitutions: this is an
 * invitation to upgrade, not a fallback.
 */
export function renderHomemadeAlternatives(fm, currentPath, entriesByPath) {
  const list = fm.homemade_alternatives || [];
  if (!list.length) return '';
  const items = list.map(h => {
    const slug = String(h.recipe_slug || '').replace(/^pages\//, '').replace(/\.html$/, '');
    const targetPath = `pages/${slug}.html`;
    const target = entriesByPath && entriesByPath.get(targetPath);
    const href = relPath(currentPath, targetPath);
    const isStub = !target || target.status !== 'complete';
    const stubBadge = isStub ? `<span class="hm-stub" title="Stub recipe — placeholder">stub</span>` : '';
    return `
        <li class="hm-item">
          <a class="hm-link" href="${escapeHtml(href)}" data-category="recipes">
            <span class="hm-arrow" aria-hidden="true">→</span>
            <span class="hm-text">
              <span class="hm-for">${escapeHtml(h.for)}</span>
              <span class="hm-target">make it yourself${stubBadge}</span>
              ${h.why ? `<span class="hm-why">${escapeHtml(h.why)}</span>` : ''}
            </span>
          </a>
        </li>`;
  }).join('');
  return `
    <span class="section-anchor" id="homemade"></span>
    <div class="section-head"><h2>Make it from scratch</h2></div>
    <p class="hm-blurb">Store-bought is fine, but each of these has a homemade version that earns the time.</p>
    <ul class="hm-list">${items}
    </ul>`;
}

/**
 * Build the auto-generated recipe body. Used when content/<recipe>.md has no
 * authored body — the entire page renders from frontmatter.
 */
function renderPairings(pairings, currentPath) {
  if (!pairings || !pairings.length) return '';

  // Per-card mini icon — same line-art set used elsewhere, scoped by category
  // for visual reinforcement of what kind of thing each pairing is.
  const ICONS = {
    recipes:     `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h18l-1.5 5a1 1 0 0 1-1 .8H5.5a1 1 0 0 1-1-.8z"/><path d="M5 14a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4"/><path d="M12 4v3"/><path d="M9 6.5l1 1.5"/><path d="M15 6.5l-1 1.5"/></svg>`,
    ingredients: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="3" rx="0.7"/><path d="M7 6v13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
    techniques:  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 L13 8 L17 12 L7 21 Z"/><path d="M14 7 L17 4 L20 7 L17 10"/></svg>`,
    cuisines:    `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12 h18"/><path d="M12 3 a14 14 0 0 1 0 18 a14 14 0 0 1 0 -18"/></svg>`,
    equipment:   `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13 h12 a1 1 0 0 1 1 1 v3 a3 3 0 0 1 -3 3 H7 a3 3 0 0 1 -3 -3 z"/><path d="M17 14 h2 a2 2 0 0 1 0 4 h-2"/></svg>`,
    hubs:        `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M7 6 V4 a1 1 0 0 1 1 -1 h8 a1 1 0 0 1 1 1 v2"/><line x1="3" y1="11" x2="21" y2="11"/></svg>`,
  };

  const cards = pairings.map(p => {
    const icon = ICONS[p.category] || '';
    const desc = p.desc ? `<span class="pair-desc">${escapeHtml(p.desc.slice(0, 100))}</span>` : '';
    return `
        <a class="pair-card" href="${escapeHtml(relPath(currentPath, p.path))}" data-category="${escapeHtml(p.category)}">
          <span class="pair-head">
            <span class="pair-icon" aria-hidden="true">${icon}</span>
            <span class="pair-cat">${escapeHtml(p.category)}</span>
          </span>
          <span class="pair-title">${escapeHtml(p.title)}</span>
          ${desc}
          <span class="pair-reason">${escapeHtml(p.reason)}</span>
        </a>`;
  }).join('');

  return `
    <span class="section-anchor" id="pairs-with"></span>
    <div class="section-head"><h2>Pairs with</h2></div>
    <p class="pair-blurb">A handful of next moves — other dishes that round the meal, the techniques behind this one, the cuisine context, and the most distinctive ingredient.</p>
    <div class="pair-grid">${cards}
    </div>`;
}

function renderHubMembership(inHubs, currentPath) {
  if (!inHubs || !inHubs.length) return '';
  const chips = inHubs.map(h => `<a class="hub-chip" href="${escapeHtml(relPath(currentPath, h.path))}" data-category="hubs">${escapeHtml(h.title)}</a>`).join('');
  return `
    <span class="section-anchor" id="in-hubs"></span>
    <div class="section-head"><h2>In collections</h2></div>
    <div class="hub-chips">${chips}</div>`;
}

export function renderRecipeBody(fm, slug, category, opts) {
  const { ingredientBySlug, techniqueBySlug, equipmentBySlug, nutrition, inHubs, pairings, entriesByPath, images } = opts;
  const sidebarLinks = [];
  const sections = [];
  const currentPath = `pages/${category}/${slug}.html`;

  sections.push(renderRecipeHero(fm, slug, category, { images, entriesByPath }));

  // Safety callout is rendered now but inserted after Execution below — its
  // content is doneness/pasteurization context for the temperature calls
  // inside the steps, so it reads as a closing note on what the cook just
  // did rather than a banner before they've reached the heat.
  const safetyHtml = renderSafetyNotes(fm, currentPath);

  const ingHtml = renderIngredientsTable(fm, `pages/${category}/${slug}.html`, ingredientBySlug);
  if (ingHtml) { sections.push(ingHtml); sidebarLinks.push({ id: 'ingredients', label: 'Mise en Place' }); }

  const stepsHtml = renderSteps(fm, `pages/${category}/${slug}.html`, techniqueBySlug, images);
  if (stepsHtml) { sections.push(stepsHtml); sidebarLinks.push({ id: 'execution', label: 'Execution' }); }

  if (safetyHtml) { sections.push(safetyHtml); sidebarLinks.push({ id: 'safety', label: 'Safety' }); }

  const eqHtml = renderEquipment(fm, `pages/${category}/${slug}.html`, equipmentBySlug);
  if (eqHtml) { sections.push(eqHtml); sidebarLinks.push({ id: 'equipment', label: 'Equipment' }); }

  // Modifications (pivots) come BEFORE substitutions (1:1 swaps): pivots are
  // higher-leverage and likelier what a returning cook is scanning for.
  const modHtml = renderModifications(fm);
  if (modHtml) { sections.push(modHtml); sidebarLinks.push({ id: 'modifications', label: 'Modifications' }); }

  const subHtml = renderSubstitutions(fm);
  if (subHtml) { sections.push(subHtml); sidebarLinks.push({ id: 'substitutions', label: 'Substitutions' }); }

  const hmHtml = renderHomemadeAlternatives(fm, `pages/${category}/${slug}.html`, entriesByPath);
  if (hmHtml) { sections.push(hmHtml); sidebarLinks.push({ id: 'homemade', label: 'Make it from scratch' }); }

  const notesHtml = renderRecipeNotes(fm);
  if (notesHtml) { sections.push(notesHtml); sidebarLinks.push({ id: 'notes', label: 'Notes' }); }

  const nutHtml = renderNutritionBlock(nutrition);
  if (nutHtml) { sections.push(nutHtml); sidebarLinks.push({ id: 'nutrition', label: 'Nutrition' }); }

  const hubsHtml = renderHubMembership(inHubs, `pages/${category}/${slug}.html`);
  if (hubsHtml) { sections.push(hubsHtml); sidebarLinks.push({ id: 'in-hubs', label: 'Collections' }); }

  const pairsHtml = renderPairings(pairings, `pages/${category}/${slug}.html`);
  if (pairsHtml) { sections.push(pairsHtml); sidebarLinks.push({ id: 'pairs-with', label: 'Pairs with' }); }

  const sidebar = `
    <aside class="sidebar" id="sidebar" aria-label="Page contents">
      <span class="toc-topic">${escapeHtml((fm.title || slug).split('—')[0].split('·')[0].trim())}</span>
      <div class="toc-divider"></div>
      <span class="toc-label">On this page</span>
      <ul class="toc-list">
        ${sidebarLinks.map(l => `<li><a href="#${l.id}">${escapeHtml(l.label)}</a></li>`).join('\n        ')}
      </ul>
    </aside>`;

  return `
<div class="shell">
  ${sidebar}
  <main class="main" id="main-content">
    ${sections.join('\n\n    ')}
  </main>
</div>`;
}

export function renderIngredientBody(fm, slug, category, opts = {}) {
  const recipesUsing = opts.recipesUsing || [];
  const sidebar = `
    <aside class="sidebar" id="sidebar" aria-label="Page contents">
      <span class="toc-topic">${escapeHtml((fm.title || slug).split('—')[0].split('·')[0].trim())}</span>
      <div class="toc-divider"></div>
      <span class="toc-label">On this page</span>
      <ul class="toc-list">
        <li><a href="#about">About</a></li>
        ${fm.seasonality ? '<li><a href="#seasonality">Seasonality</a></li>' : ''}
        ${fm.storage ? '<li><a href="#storage">Storage</a></li>' : ''}
        ${(fm.substitutions || []).length ? '<li><a href="#substitutions">Substitutes</a></li>' : ''}
        ${recipesUsing.length ? '<li><a href="#used-in">Recipes</a></li>' : ''}
      </ul>
    </aside>`;

  const sections = [];
  sections.push(`
    <header class="topic-hero">
      <span class="topic-hero-eyebrow">Ingredient</span>
      <h1 class="topic-hero-title">${escapeHtml(fm.title || slug)}</h1>
      ${fm.desc ? `<p class="topic-hero-desc">${escapeHtml(fm.desc)}</p>` : ''}
    </header>`);

  if (fm.about || fm.desc) {
    sections.push(`
    <span class="section-anchor" id="about"></span>
    <div class="section-head"><h2>About</h2></div>
    <div class="scholar">
      ${prosify(fm.about || fm.desc)}
    </div>`);
  }

  if (fm.seasonality) {
    sections.push(`
    <span class="section-anchor" id="seasonality"></span>
    <div class="section-head"><h2>Seasonality</h2></div>
    <div class="scholar">${prosify(fm.seasonality)}</div>`);
  }
  if (fm.storage) {
    sections.push(`
    <span class="section-anchor" id="storage"></span>
    <div class="section-head"><h2>Storage</h2></div>
    <div class="scholar">${prosify(fm.storage)}</div>`);
  }
  if (fm.substitutions && fm.substitutions.length) sections.push(renderSubstitutions(fm, { context: 'ingredient' }));

  if (recipesUsing.length) {
    const cards = recipesUsing.map(r => `
        <a class="rl-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-card-title">${escapeHtml(r.title)}</span>
          ${r.desc ? `<span class="rl-card-why">${escapeHtml(r.desc.slice(0, 120))}</span>` : ''}
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="used-in"></span>
    <div class="section-head"><h2>Recipes using this</h2></div>
    <div class="rl-cards">${cards}
    </div>`);
  }

  return `
<div class="shell">
  ${sidebar}
  <main class="main" id="main-content">
    ${sections.join('\n\n    ')}
  </main>
</div>`;
}

export function renderEquipmentBody(fm, slug, category, opts = {}) {
  const recipesUsing = (opts.recipesUsing || []); // [{ title, path }] populated in C2
  const sidebar = `
    <aside class="sidebar" id="sidebar" aria-label="Page contents">
      <span class="toc-topic">${escapeHtml((fm.title || slug).split('—')[0].split('·')[0].trim())}</span>
      <div class="toc-divider"></div>
      <span class="toc-label">On this page</span>
      <ul class="toc-list">
        <li><a href="#about">About</a></li>
        ${(fm.substitutions || []).length ? '<li><a href="#substitutions">Substitutes</a></li>' : ''}
        ${recipesUsing.length ? '<li><a href="#used-in">Recipes using this</a></li>' : ''}
      </ul>
    </aside>`;

  const sections = [];
  sections.push(`
    <header class="topic-hero">
      <span class="topic-hero-eyebrow">Equipment</span>
      <h1 class="topic-hero-title">${escapeHtml(fm.title || slug)}</h1>
      ${fm.desc ? `<p class="topic-hero-desc">${escapeHtml(fm.desc)}</p>` : ''}
    </header>`);

  if (fm.about || fm.desc) {
    sections.push(`
    <span class="section-anchor" id="about"></span>
    <div class="section-head"><h2>About</h2></div>
    <div class="scholar">
      ${prosify(fm.about || fm.desc)}
    </div>`);
  }

  if (fm.substitutions && fm.substitutions.length) sections.push(renderSubstitutions(fm, { context: 'equipment' }));

  if (recipesUsing.length) {
    const cards = recipesUsing.map(r => `
        <a class="rl-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-card-title">${escapeHtml(r.title)}</span>
          ${r.desc ? `<span class="rl-card-why">${escapeHtml(r.desc.slice(0, 120))}</span>` : ''}
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="used-in"></span>
    <div class="section-head"><h2>Recipes using this</h2></div>
    <div class="rl-cards">${cards}
    </div>`);
  }

  return `
<div class="shell">
  ${sidebar}
  <main class="main" id="main-content">
    ${sections.join('\n\n    ')}
  </main>
</div>`;
}

/**
 * Render a tag landing page — every entry that carries this tag, grouped by category.
 * Tag pages are virtual: they have no content/<...>.md source, just a slug.
 * Called from build.mjs with a synthetic fm-like object: { title, slug, entries: [...] }.
 */
export function renderTagBody(tagSlug, tagLabel, entriesByCategory, currentPath) {
  const total = Object.values(entriesByCategory).reduce((n, list) => n + list.length, 0);
  const sidebar = `
    <aside class="sidebar" id="sidebar" aria-label="Page contents">
      <span class="toc-topic">#${escapeHtml(tagSlug)}</span>
      <div class="toc-divider"></div>
      <span class="toc-label">By category</span>
      <ul class="toc-list">
        ${Object.entries(entriesByCategory)
          .filter(([, list]) => list.length > 0)
          .map(([cat, list]) => `<li><a href="#cat-${escapeHtml(cat)}">${escapeHtml(cat)} <span style="color:var(--ink-faint);">${list.length}</span></a></li>`)
          .join('\n        ')}
      </ul>
    </aside>`;

  const sections = [];
  sections.push(`
    <header class="topic-hero">
      <span class="topic-hero-eyebrow">Tag</span>
      <h1 class="topic-hero-title">#${escapeHtml(tagSlug)}</h1>
      <p class="topic-hero-desc">${total} ${total === 1 ? 'entry' : 'entries'} tagged <strong>${escapeHtml(tagLabel)}</strong> across the library.</p>
    </header>`);

  for (const [cat, list] of Object.entries(entriesByCategory)) {
    if (!list.length) continue;
    const cards = list.map(e => `
        <a class="rl-card" href="${escapeHtml(relPath(currentPath, e.path))}" data-category="${escapeHtml(e.category)}">
          <span class="rl-card-title">${escapeHtml(e.title)}</span>
          ${e.desc ? `<span class="rl-card-why">${escapeHtml(e.desc.slice(0, 120))}</span>` : ''}
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="cat-${escapeHtml(cat)}"></span>
    <div class="section-head"><h2>${escapeHtml(cat)} <span class="sh-sub">${list.length}</span></h2></div>
    <div class="rl-cards">${cards}
    </div>`);
  }

  return `
<div class="shell">
  ${sidebar}
  <main class="main" id="main-content">
    ${sections.join('\n\n    ')}
  </main>
</div>`;
}

export function renderCuisineBody(fm, slug, category, opts = {}) {
  // Fallback renderer for cuisine pages with no authored body.
  // Cuisines with rich authored bodies (like italian.md) keep them and bypass this renderer.
  const recipes = (opts.recipes || []);  // [{ title, path, course }]
  const sidebar = `
    <aside class="sidebar" id="sidebar" aria-label="Page contents">
      <span class="toc-topic">${escapeHtml((fm.title || slug).split('—')[0].split('·')[0].trim())}</span>
      <div class="toc-divider"></div>
      <span class="toc-label">On this page</span>
      <ul class="toc-list">
        <li><a href="#about">About</a></li>
        ${recipes.length ? '<li><a href="#recipes">Recipes</a></li>' : ''}
      </ul>
    </aside>`;

  const sections = [];
  sections.push(`
    <header class="topic-hero">
      <span class="topic-hero-eyebrow">Cuisine</span>
      <h1 class="topic-hero-title">${escapeHtml(fm.title || slug)}</h1>
      ${fm.desc ? `<p class="topic-hero-desc">${escapeHtml(fm.desc)}</p>` : ''}
    </header>`);

  if (fm.about || fm.desc) {
    sections.push(`
    <span class="section-anchor" id="about"></span>
    <div class="section-head"><h2>About</h2></div>
    <div class="scholar">
      ${prosify(fm.about || fm.desc)}
    </div>`);
  }

  if (recipes.length) {
    const cards = recipes.map(r => `
        <a class="rl-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-card-title">${escapeHtml(r.title)}</span>
          ${r.desc ? `<span class="rl-card-why">${escapeHtml(r.desc.slice(0, 120))}</span>` : ''}
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="recipes"></span>
    <div class="section-head"><h2>Recipes</h2></div>
    <div class="rl-cards">${cards}
    </div>`);
  }

  return `
<div class="shell">
  ${sidebar}
  <main class="main" id="main-content">
    ${sections.join('\n\n    ')}
  </main>
</div>`;
}

export function renderTechniqueBody(fm, slug, category, opts = {}) {
  const recipesPracticing = opts.recipesPracticing || []; // [{ title, path }] from C2 reverse links
  const currentPath = `pages/${category}/${slug}.html`;
  const safetyHtml = renderSafetyNotes(fm, currentPath);
  const sidebarLinks = [{ id: 'about', label: 'About' }];
  if (fm.when_to_use)    sidebarLinks.push({ id: 'when-to-use',   label: 'When to use'   });
  if (fm.failure_modes)  sidebarLinks.push({ id: 'failure-modes', label: 'Failure modes' });
  if (safetyHtml)        sidebarLinks.push({ id: 'safety',        label: 'Safety' });
  if (fm.practice_notes) sidebarLinks.push({ id: 'practice',      label: 'Practice'      });
  if (recipesPracticing.length) sidebarLinks.push({ id: 'practiced-in', label: 'Recipes' });

  const sidebar = `
    <aside class="sidebar" id="sidebar" aria-label="Page contents">
      <span class="toc-topic">${escapeHtml((fm.title || slug).split('—')[0].split('·')[0].trim())}</span>
      <div class="toc-divider"></div>
      <span class="toc-label">On this page</span>
      <ul class="toc-list">
        ${sidebarLinks.map(l => `<li><a href="#${l.id}">${escapeHtml(l.label)}</a></li>`).join('\n        ')}
      </ul>
    </aside>`;

  const sections = [];
  sections.push(`
    <header class="topic-hero">
      <span class="topic-hero-eyebrow">Technique</span>
      <h1 class="topic-hero-title">${escapeHtml(fm.title || slug)}</h1>
      ${fm.desc ? `<p class="topic-hero-desc">${escapeHtml(fm.desc)}</p>` : ''}
    </header>`);

  sections.push(`
    <span class="section-anchor" id="about"></span>
    <div class="section-head"><h2>About</h2></div>
    <div class="scholar">${prosify(fm.about || fm.desc || '')}</div>`);

  if (fm.when_to_use) sections.push(`
    <span class="section-anchor" id="when-to-use"></span>
    <div class="section-head"><h2>When to use</h2></div>
    <div class="scholar">${prosify(fm.when_to_use)}</div>`);

  if (fm.failure_modes) sections.push(`
    <span class="section-anchor" id="failure-modes"></span>
    <div class="section-head"><h2>Failure modes</h2></div>
    <div class="scholar">${prosify(fm.failure_modes)}</div>`);

  if (safetyHtml) sections.push(safetyHtml);

  if (fm.practice_notes) sections.push(`
    <span class="section-anchor" id="practice"></span>
    <div class="section-head"><h2>Practice</h2></div>
    <div class="scholar">${prosify(fm.practice_notes)}</div>`);

  if (recipesPracticing.length) {
    const cards = recipesPracticing.map(r => `
        <a class="rl-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-card-title">${escapeHtml(r.title)}</span>
          ${r.desc ? `<span class="rl-card-why">${escapeHtml(r.desc.slice(0, 120))}</span>` : ''}
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="practiced-in"></span>
    <div class="section-head"><h2>Recipes that practice this</h2></div>
    <div class="rl-cards">${cards}
    </div>`);
  }

  return `
<div class="shell">
  ${sidebar}
  <main class="main" id="main-content">
    ${sections.join('\n\n    ')}
  </main>
</div>`;
}

/**
 * Safety reference page renderer. Mirrors the technique-page shape so the
 * design system stays consistent: hero with eyebrow + title + desc, About
 * section rendered from fm.about (which contains the full prose with
 * markdown headings — H2s become navigable subsections), then the
 * referenced-from list (recipes and techniques whose safety_notes[].ref
 * points at this page).
 */
export function renderSafetyBody(fm, slug, category, opts = {}) {
  const referencedBy = opts.referencedBy || []; // [{ title, path, type, desc }]
  const sidebarLinks = [{ id: 'about', label: 'About' }];
  if (referencedBy.length) sidebarLinks.push({ id: 'referenced-by', label: 'Referenced by' });

  const sidebar = `
    <aside class="sidebar" id="sidebar" aria-label="Page contents">
      <span class="toc-topic">${escapeHtml((fm.title || slug).split('—')[0].split('·')[0].trim())}</span>
      <div class="toc-divider"></div>
      <span class="toc-label">On this page</span>
      <ul class="toc-list">
        ${sidebarLinks.map(l => `<li><a href="#${l.id}">${escapeHtml(l.label)}</a></li>`).join('\n        ')}
      </ul>
    </aside>`;

  const sections = [];
  sections.push(`
    <header class="topic-hero">
      <span class="topic-hero-eyebrow" data-cat="safety">Safety</span>
      <h1 class="topic-hero-title">${escapeHtml(fm.title || slug)}</h1>
      ${fm.desc ? `<p class="topic-hero-desc">${escapeHtml(fm.desc)}</p>` : ''}
    </header>`);

  sections.push(`
    <span class="section-anchor" id="about"></span>
    <div class="section-head"><h2>Reference</h2></div>
    <div class="scholar">${prosifyWithHeadingAnchors(fm.about || fm.desc || '')}</div>`);

  if (referencedBy.length) {
    const cards = referencedBy.map(r => `
        <a class="rl-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="${escapeHtml(r.category || 'recipes')}">
          <span class="rl-card-title">${escapeHtml(r.title)}</span>
          ${r.desc ? `<span class="rl-card-why">${escapeHtml(r.desc.slice(0, 120))}</span>` : ''}
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="referenced-by"></span>
    <div class="section-head"><h2>Referenced by</h2></div>
    <div class="rl-cards">${cards}
    </div>`);
  }

  return `
<div class="shell">
  ${sidebar}
  <main class="main" id="main-content">
    ${sections.join('\n\n    ')}
  </main>
</div>`;
}

/**
 * Render the inline Safety callout block injected into recipe and technique
 * pages whose frontmatter declares safety_notes[]. Each note's `ref` is a
 * `safety/<slug>#<anchor>` string; we resolve the slug into a real page link
 * and pass the anchor through.
 */
export function renderSafetyNotes(fm, currentPath) {
  const notes = fm.safety_notes || [];
  if (!notes.length) return '';

  const items = notes.map(n => {
    if (!n || !n.ref) return '';
    // Split "safety/meat-doneness#poultry" → ["safety/meat-doneness", "poultry"]
    const [refSlug, anchor] = String(n.ref).split('#');
    const targetPath = refSlug.startsWith('safety/')
      ? `pages/${refSlug}.html`
      : `pages/safety/${refSlug}.html`;
    const href = relPath(currentPath, targetPath) + (anchor ? `#${anchor}` : '');
    return `
        <li class="safety-item">
          <span class="safety-item-for">${escapeHtml(n.for || '')}</span>
          ${n.why ? `<span class="safety-item-why">${escapeHtml(n.why)}</span>` : ''}
          <a class="safety-item-link" href="${escapeHtml(href)}">Reference →</a>
        </li>`;
  }).filter(Boolean).join('');

  if (!items) return '';

  // 16x16 shield icon — same line-art family as the safety category icon.
  const icon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 Z"/><path d="M9 12 l2 2 4-4"/></svg>`;

  return `
    <span class="section-anchor" id="safety"></span>
    <aside class="safety-callout" aria-labelledby="safety-callout-head">
      <span class="safety-callout-head" id="safety-callout-head">
        <span class="safety-callout-icon">${icon}</span>
        <span>Safety</span>
      </span>
      <ul class="safety-list">${items}
      </ul>
    </aside>`;
}

export function renderHubBody(fm, slug, category, entriesByPath) {
  const members = (fm.members || []).map(m => {
    const target = entriesByPath.get(m.slug) || entriesByPath.get(`pages/${m.slug}.html`);
    if (!target) return null;
    const href = relPath(`pages/${category}/${slug}.html`, target.path);
    const label = m.label || target.title || m.slug;
    return `
        <a class="hub-card" href="${escapeHtml(href)}" data-category="${escapeHtml(target.category)}">
          <span class="hc-cat">${escapeHtml(target.category)}</span>
          <span class="hc-title">${escapeHtml(label)}</span>
          ${m.note ? `<span class="hc-note">${escapeHtml(m.note)}</span>` : ''}
        </a>`;
  }).filter(Boolean).join('');

  return `
<div class="shell">
  <aside class="sidebar" id="sidebar" aria-label="Collection contents">
    <span class="toc-topic">${escapeHtml(fm.title || slug)}</span>
    <div class="toc-divider"></div>
    <span class="toc-label">In this collection</span>
  </aside>
  <main class="main" id="main-content">
    <header class="topic-hero">
      <span class="topic-hero-eyebrow">Collection</span>
      <h1 class="topic-hero-title">${escapeHtml(fm.title || slug)}</h1>
      ${fm.desc ? `<p class="topic-hero-desc">${escapeHtml(fm.desc)}</p>` : ''}
    </header>
    <div class="hub-cards">${members}
    </div>
  </main>
</div>`;
}
