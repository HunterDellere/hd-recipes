/**
 * pantry-match.js — "what can I cook with what I have"
 *
 * Reads data/entries.json. For each recipe, compares the user's pantry list
 * against the recipe's ingredients (slug-aware, with light substring fallback
 * for items the user typed in free form). Ranks recipes by % of ingredients
 * the user already has, surfacing the missing pieces.
 *
 * State is persisted in localStorage (`hdr.pantry`) so the page restores the
 * last input on return.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-pantry-match]');
  if (!root) return;

  const ta = root.querySelector('[data-pantry-textarea]');
  const findBtn = root.querySelector('[data-pantry-find]');
  const clearBtn = root.querySelector('[data-pantry-clear]');
  const resultsEl = root.querySelector('[data-pantry-results]');
  const countEl = root.querySelector('[data-pantry-count]');
  const suggestEl = root.querySelector('[data-pantry-suggest]');

  // Resolve site root from current page depth — same trick as palette.js.
  function resolveRoot() {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    return '../'.repeat(parts.length - 1);
  }
  const SITE_ROOT = resolveRoot();
  const STORAGE_KEY = 'hdr.pantry';

  // ── State ──────────────────────────────────────────────────────────────
  let entries = null;
  let ingredientSlugs = new Set();   // every known ingredient slug
  let ingredientNames = new Map();   // slug → human-readable name (best guess)

  // ── Restore prior input ────────────────────────────────────────────────
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) ta.value = saved;
  } catch {}
  if (suggestEl) suggestEl.hidden = !!ta.value.trim();

  // ── Load entries ───────────────────────────────────────────────────────
  async function ensureEntries() {
    if (entries) return;
    const r = await fetch(SITE_ROOT + 'data/entries.json');
    entries = await r.json();
    for (const e of entries) {
      if (e.type === 'ingredient' && e._slug) {
        ingredientSlugs.add(e._slug);
        if (e.title) ingredientNames.set(e._slug, e.title.toLowerCase());
      }
    }
    // Also collect slugs referenced by recipes (some appear only as references)
    for (const e of entries) {
      if (e.type !== 'recipe' || !Array.isArray(e.ingredients)) continue;
      for (const ing of e.ingredients) {
        if (ing.slug) {
          ingredientSlugs.add(ing.slug);
          if (ing.item && !ingredientNames.has(ing.slug)) {
            ingredientNames.set(ing.slug, String(ing.item).toLowerCase());
          }
        }
      }
    }
  }

  // ── Parse user pantry input ────────────────────────────────────────────
  // Accepts comma- or newline-separated values. Returns:
  //   { tokens: ['tomato','garlic',...], slugs: Set<slug> }
  // Slugs are resolved via two passes:
  //   1. exact slug match (tomato → tomato)
  //   2. substring match against ingredient title / slug (jasmine rice → rice)
  function parsePantry(raw) {
    const tokens = String(raw || '')
      .split(/[\n,]+/)
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    const slugs = new Set();
    for (const tok of tokens) {
      // Normalize: spaces/underscores → hyphens for slug comparison
      const slug = tok.replace(/[\s_]+/g, '-');
      if (ingredientSlugs.has(slug)) { slugs.add(slug); continue; }
      // Try substring match — e.g. "jasmine rice" matches "rice", "white rice"
      // matches "rice". Prefer the shortest matching slug (most generic).
      let best = null;
      for (const s of ingredientSlugs) {
        const name = ingredientNames.get(s) || s;
        // Match if user token contains the slug as a whole word OR slug contains user token
        if (
          s === slug ||
          name === tok ||
          slug.includes(s) ||
          name.includes(tok) ||
          tok.includes(s.replace(/-/g, ' '))
        ) {
          if (!best || s.length < best.length) best = s;
        }
      }
      if (best) slugs.add(best);
    }
    return { tokens, slugs };
  }

  // ── Rank recipes by pantry coverage ────────────────────────────────────
  function rankRecipes(pantrySlugs) {
    const results = [];
    for (const e of entries) {
      if (e.type !== 'recipe' || e.status !== 'complete') continue;
      const ings = (e.ingredients || []).filter(i => !i.optional);
      if (!ings.length) continue;
      let have = 0;
      const missing = [];
      for (const ing of ings) {
        const slug = ing.slug;
        if (slug && pantrySlugs.has(slug)) {
          have++;
        } else {
          missing.push(ing.item || slug || '(unnamed)');
        }
      }
      const pct = have / ings.length;
      // Only show recipes where the user has at least one ingredient.
      if (have === 0) continue;
      results.push({
        entry: e,
        have, total: ings.length, pct, missing,
      });
    }
    results.sort((a, b) =>
      b.pct - a.pct ||
      b.have - a.have ||
      a.missing.length - b.missing.length ||
      (a.entry.title || '').localeCompare(b.entry.title || '')
    );
    return results;
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    ));
  }

  function render(ranked) {
    if (!ranked.length) {
      resultsEl.innerHTML = `<p class="pantry-match-empty">No recipes match yet. Try adding more pantry items — even basics like salt, oil, or eggs widen the field considerably.</p>`;
      if (countEl) countEl.textContent = '';
      return;
    }
    if (countEl) {
      const fullMatches = ranked.filter(r => r.missing.length === 0).length;
      countEl.textContent = `${ranked.length} recipes within reach${fullMatches ? ` · ${fullMatches} you can make right now` : ''}`;
    }
    // Limit to 40 for performance; the top of the list is what matters anyway.
    const out = ranked.slice(0, 40).map(r => {
      const e = r.entry;
      const pctLabel = Math.round(r.pct * 100);
      const missText = r.missing.length === 0
        ? `<span class="pm-card-have">You have everything.</span>`
        : `<span class="pm-card-missing"><strong>Missing ${r.missing.length}:</strong> ${escapeHtml(r.missing.slice(0, 6).join(', '))}${r.missing.length > 6 ? `, +${r.missing.length - 6} more` : ''}</span>`;
      const href = SITE_ROOT + e.path;
      return `
        <a class="pm-card" href="${escapeHtml(href)}">
          <div class="pm-card-bar" aria-hidden="true"><span class="pm-card-bar-fill" style="width:${pctLabel}%"></span></div>
          <div class="pm-card-body">
            <div class="pm-card-head">
              <h3 class="pm-card-title">${escapeHtml(e.title || '')}</h3>
              <span class="pm-card-pct">${pctLabel}%</span>
            </div>
            <p class="pm-card-meta">You have <strong>${r.have} of ${r.total}</strong> ingredients</p>
            ${missText}
            ${e.cuisine || e.course ? `<p class="pm-card-tags">${[e.cuisine, e.course].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
          </div>
        </a>`;
    }).join('');
    resultsEl.innerHTML = `<div class="pm-card-list">${out}</div>`;
  }

  // ── Wire ───────────────────────────────────────────────────────────────
  async function runMatch() {
    await ensureEntries();
    const { slugs } = parsePantry(ta.value);
    if (slugs.size === 0) {
      resultsEl.innerHTML = `<p class="pantry-match-empty">Add at least one ingredient to see matches.</p>`;
      if (countEl) countEl.textContent = '';
      return;
    }
    const ranked = rankRecipes(slugs);
    render(ranked);
    // Persist on successful run
    try { localStorage.setItem(STORAGE_KEY, ta.value); } catch {}
  }

  if (findBtn) findBtn.addEventListener('click', runMatch);
  if (clearBtn) clearBtn.addEventListener('click', () => {
    ta.value = '';
    resultsEl.innerHTML = '';
    if (countEl) countEl.textContent = '';
    if (suggestEl) suggestEl.hidden = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    ta.focus();
  });

  // Suggestion chips: append to textarea
  if (suggestEl) {
    suggestEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pantry-add]');
      if (!btn) return;
      const label = btn.textContent.trim();
      const current = ta.value.trim();
      // Avoid duplicates (case-insensitive)
      const lines = current.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (lines.includes(label.toLowerCase())) return;
      ta.value = current ? current + (current.endsWith(',') ? ' ' : '\n') + label : label;
      if (suggestEl) suggestEl.hidden = true;
    });
  }

  ta.addEventListener('input', () => {
    if (suggestEl) suggestEl.hidden = !!ta.value.trim();
  });

  // Submit on Cmd/Ctrl+Enter from the textarea
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runMatch();
    }
  });

  // Auto-run if we restored input from localStorage
  if (ta.value.trim()) {
    // Defer so the page paints first
    setTimeout(runMatch, 50);
  }
})();
