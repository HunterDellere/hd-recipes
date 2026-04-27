/**
 * Render recipe-specific page sections (ingredients table, steps, nutrition,
 * scaling controls, equipment chips).
 */

import MarkdownIt from 'markdown-it';

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

export function renderRecipeHero(fm, slug, category) {
  const time = fm.time || {};
  const totalMin = time.total_min ?? ((time.prep_min || 0) + (time.cook_min || 0));
  const meta = [];
  if (fm.servings) meta.push(`<span class="rh-meta-item"><strong>${fm.servings}</strong> servings</span>`);
  if (totalMin) meta.push(`<span class="rh-meta-item"><strong>${totalMin}</strong> min total</span>`);
  if (time.active_min != null) meta.push(`<span class="rh-meta-item"><strong>${time.active_min}</strong> min active</span>`);
  if (fm.difficulty) meta.push(`<span class="rh-meta-item rh-difficulty rh-d-${fm.difficulty}">${fm.difficulty}</span>`);
  if (fm.cuisine) meta.push(`<span class="rh-meta-item">${escapeHtml(fm.cuisine)}</span>`);
  if (fm.course) meta.push(`<span class="rh-meta-item">${escapeHtml(fm.course)}</span>`);

  const diet = (fm.diet || []).map(d => `<span class="rh-diet-chip">${escapeHtml(d)}</span>`).join('');
  return `
    <header class="recipe-hero">
      <span class="rh-eyebrow">Recipe</span>
      <h1 class="rh-title">${escapeHtml(fm.title || slug)}</h1>
      ${fm.desc ? `<p class="rh-desc">${escapeHtml(fm.desc)}</p>` : ''}
      ${meta.length ? `<div class="rh-meta">${meta.join('')}</div>` : ''}
      ${diet ? `<div class="rh-diet">${diet}</div>` : ''}
      <button type="button" class="rh-cook-btn" data-cook-toggle aria-pressed="false" aria-label="Enter cook's view — focus on steps with screen kept on">
        <span class="rh-cook-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 18h18l-2 3H5z"/><path d="M5 14h14a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4z"/><path d="M12 6v4"/><path d="M9 3v3"/><path d="M15 3v3"/>
          </svg>
        </span>
        <span class="rh-cook-label">Cook's view</span>
      </button>
    </header>`;
}

export function renderIngredientsTable(fm, currentPath, ingredientBySlug) {
  if (!fm.ingredients || !fm.ingredients.length) return '';

  // Group by `group` field (preserves order of first appearance)
  const groups = [];
  const groupMap = new Map();
  for (const ing of fm.ingredients) {
    const g = ing.group || '';
    if (!groupMap.has(g)) {
      groupMap.set(g, []);
      groups.push(g);
    }
    groupMap.get(g).push(ing);
  }

  const renderRow = (ing) => {
    let label = escapeHtml(ing.item);
    if (ing.slug) {
      const target = ingredientBySlug.get(ing.slug) || ingredientBySlug.get(ing.slug.replace(/^ingredients\//, ''));
      if (target) {
        const href = relPath(currentPath, target.path);
        label = `<a class="ing-link" href="${escapeHtml(href)}">${label}</a>`;
      }
    }
    const qty = fmtQty(ing.qty);
    const unit = ing.unit ? escapeHtml(ing.unit) : '';
    const prep = ing.prep ? `<span class="ing-prep">, ${escapeHtml(ing.prep)}</span>` : '';
    const note = ing.note ? `<span class="ing-note"> — ${escapeHtml(ing.note)}</span>` : '';
    const opt = ing.optional ? `<span class="ing-opt">optional</span>` : '';
    const dataAttrs = `data-qty="${escapeHtml(qty)}" data-unit="${escapeHtml(unit)}"` + (typeof ing.qty === 'number' ? ' data-scalable="1"' : '');
    return `
        <li class="ing-row" ${dataAttrs}>
          <label class="ing-check"><input type="checkbox" class="ing-cb"><span class="ing-check-mark"></span></label>
          <span class="ing-qty"><span data-ing-qty>${qty}</span> <span data-ing-unit>${unit}</span></span>
          <span class="ing-name">${label}${prep}${opt}${note}</span>
        </li>`;
  };

  const groupHtml = groups.map(g => {
    const head = g ? `<h3 class="ing-group-head">${escapeHtml(g)}</h3>` : '';
    const rows = groupMap.get(g).map(renderRow).join('');
    return `${head}<ol class="ing-list">${rows}\n      </ol>`;
  }).join('\n');

  const baseServings = fm.servings || 1;
  return `
    <span class="section-anchor" id="ingredients"></span>
    <div class="section-head"><h2>Mise en Place</h2></div>
    <div class="recipe-ingredients" data-base-servings="${baseServings}">
      <div class="ing-controls">
        <div class="ing-scale">
          <span class="ing-scale-label">Servings</span>
          <button type="button" class="ing-scale-btn" data-scale-step="-1" aria-label="Decrease servings">−</button>
          <input type="number" class="ing-scale-input" data-scale-input value="${baseServings}" min="1" max="100">
          <button type="button" class="ing-scale-btn" data-scale-step="1" aria-label="Increase servings">+</button>
        </div>
        <div class="ing-units" role="group" aria-label="Display units">
          <button type="button" class="ing-units-btn active" data-units="metric" aria-pressed="true">Metric</button>
          <button type="button" class="ing-units-btn" data-units="imperial" aria-pressed="false">Imperial</button>
        </div>
        <button type="button" class="ing-shop-btn" data-shop-export>Copy shopping list</button>
      </div>
      ${groupHtml}
    </div>`;
}

export function renderSteps(fm, currentPath, techniqueBySlug) {
  if (!fm.steps || !fm.steps.length) return '';
  const items = fm.steps.map((step, i) => {
    let body = escapeHtml(step.text);
    if (step.technique) {
      const target = techniqueBySlug.get(step.technique) || techniqueBySlug.get(step.technique.replace(/^techniques\//, ''));
      if (target) {
        const href = relPath(currentPath, target.path);
        const techTitle = (target.title || step.technique).split('—')[0].split('·')[0].trim();
        body += ` <a class="step-tech" href="${escapeHtml(href)}">${escapeHtml(techTitle)}</a>`;
      }
    }
    const time = step.time_min ? `<span class="step-time">${step.time_min} min</span>` : '';
    return `
      <li class="step-item">
        <span class="step-num">${i + 1}</span>
        <div class="step-body">${body}${time}</div>
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

  const missingNote = nutrition.missing && nutrition.missing.length
    ? `<p class="nut-missing">Estimated. ${nutrition.missing.length} ingredient${nutrition.missing.length === 1 ? '' : 's'} not yet mapped to USDA data.</p>`
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

export function renderSubstitutions(fm) {
  if (!fm.substitutions || !fm.substitutions.length) return '';
  const items = fm.substitutions.map(s => `
        <li><strong>${escapeHtml(s.for)}</strong> → ${escapeHtml(s.use)}${s.note ? ` <span class="sub-note">${escapeHtml(s.note)}</span>` : ''}</li>`).join('');
  return `
    <span class="section-anchor" id="substitutions"></span>
    <div class="section-head"><h2>Substitutions</h2></div>
    <ul class="recipe-subs">${items}
    </ul>`;
}

/**
 * Build the auto-generated recipe body. Used when content/<recipe>.md has no
 * authored body — the entire page renders from frontmatter.
 */
function renderHubMembership(inHubs, currentPath) {
  if (!inHubs || !inHubs.length) return '';
  const chips = inHubs.map(h => `<a class="hub-chip" href="${escapeHtml(relPath(currentPath, h.path))}" data-category="hubs">${escapeHtml(h.title)}</a>`).join('');
  return `
    <span class="section-anchor" id="in-hubs"></span>
    <div class="section-head"><h2>In collections</h2></div>
    <div class="hub-chips">${chips}</div>`;
}

export function renderRecipeBody(fm, slug, category, opts) {
  const { ingredientBySlug, techniqueBySlug, equipmentBySlug, nutrition, inHubs } = opts;
  const sidebarLinks = [];
  const sections = [];

  sections.push(renderRecipeHero(fm, slug, category));

  const ingHtml = renderIngredientsTable(fm, `pages/${category}/${slug}.html`, ingredientBySlug);
  if (ingHtml) { sections.push(ingHtml); sidebarLinks.push({ id: 'ingredients', label: 'Mise en Place' }); }

  const stepsHtml = renderSteps(fm, `pages/${category}/${slug}.html`, techniqueBySlug);
  if (stepsHtml) { sections.push(stepsHtml); sidebarLinks.push({ id: 'execution', label: 'Execution' }); }

  const eqHtml = renderEquipment(fm, `pages/${category}/${slug}.html`, equipmentBySlug);
  if (eqHtml) { sections.push(eqHtml); sidebarLinks.push({ id: 'equipment', label: 'Equipment' }); }

  const subHtml = renderSubstitutions(fm);
  if (subHtml) { sections.push(subHtml); sidebarLinks.push({ id: 'substitutions', label: 'Substitutions' }); }

  const notesHtml = renderRecipeNotes(fm);
  if (notesHtml) { sections.push(notesHtml); sidebarLinks.push({ id: 'notes', label: 'Notes' }); }

  const nutHtml = renderNutritionBlock(nutrition);
  if (nutHtml) { sections.push(nutHtml); sidebarLinks.push({ id: 'nutrition', label: 'Nutrition' }); }

  const hubsHtml = renderHubMembership(inHubs, `pages/${category}/${slug}.html`);
  if (hubsHtml) { sections.push(hubsHtml); sidebarLinks.push({ id: 'in-hubs', label: 'Collections' }); }

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
  if (fm.substitutions && fm.substitutions.length) sections.push(renderSubstitutions(fm));

  if (recipesUsing.length) {
    const cards = recipesUsing.map(r => `
        <a class="related-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-cat">recipes</span>
          <span class="rl-title">${escapeHtml(r.title)}</span>
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="used-in"></span>
    <div class="section-head"><h2>Recipes using this</h2></div>
    <div class="related-cards">${cards}
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

  if (fm.substitutions && fm.substitutions.length) sections.push(renderSubstitutions(fm));

  if (recipesUsing.length) {
    const cards = recipesUsing.map(r => `
        <a class="related-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-cat">recipes</span>
          <span class="rl-title">${escapeHtml(r.title)}</span>
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="used-in"></span>
    <div class="section-head"><h2>Recipes using this</h2></div>
    <div class="related-cards">${cards}
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
        <a class="related-card" href="${escapeHtml(relPath(currentPath, e.path))}" data-category="${escapeHtml(e.category)}">
          <span class="rl-cat">${escapeHtml(e.category)}</span>
          <span class="rl-title">${escapeHtml(e.title)}</span>
          ${e.desc ? `<span class="rl-desc">${escapeHtml(e.desc.slice(0, 110))}</span>` : ''}
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="cat-${escapeHtml(cat)}"></span>
    <div class="section-head"><h2>${escapeHtml(cat)} <span class="sh-sub">${list.length}</span></h2></div>
    <div class="related-cards">${cards}
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
        <a class="related-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-cat">${escapeHtml(r.course || 'recipe')}</span>
          <span class="rl-title">${escapeHtml(r.title)}</span>
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="recipes"></span>
    <div class="section-head"><h2>Recipes</h2></div>
    <div class="related-cards">${cards}
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
  const sidebarLinks = [{ id: 'about', label: 'About' }];
  if (fm.when_to_use)    sidebarLinks.push({ id: 'when-to-use',   label: 'When to use'   });
  if (fm.failure_modes)  sidebarLinks.push({ id: 'failure-modes', label: 'Failure modes' });
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

  if (fm.practice_notes) sections.push(`
    <span class="section-anchor" id="practice"></span>
    <div class="section-head"><h2>Practice</h2></div>
    <div class="scholar">${prosify(fm.practice_notes)}</div>`);

  if (recipesPracticing.length) {
    const cards = recipesPracticing.map(r => `
        <a class="related-card" href="${escapeHtml(relPath(`pages/${category}/${slug}.html`, r.path))}" data-category="recipes">
          <span class="rl-cat">recipes</span>
          <span class="rl-title">${escapeHtml(r.title)}</span>
        </a>`).join('');
    sections.push(`
    <span class="section-anchor" id="practiced-in"></span>
    <div class="section-head"><h2>Recipes that practice this</h2></div>
    <div class="related-cards">${cards}
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
