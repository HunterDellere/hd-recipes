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
  //   { tokens: ['tomato','garlic',...], slugs: Set<slug>, unresolved: string[] }
  // Matching is conservative — word-boundary based, not naive substring,
  // so "salt" doesn't accidentally resolve to "unsalted butter".
  //
  // Pre-built aliases handle the few common short forms that need them.
  const PANTRY_ALIASES = {
    'salt': 'kosher-salt',
    'sea salt': 'fine-sea-salt',
    'pepper': 'black-pepper',
    'olive oil': 'extra-virgin-olive-oil',
    'evoo': 'extra-virgin-olive-oil',
    'oil': 'neutral-oil',
    'vinegar': 'white-wine-vinegar',
    'flour': 'all-purpose-flour',
    'ap flour': 'all-purpose-flour',
    'sugar': 'granulated-sugar',
    'brown sugar': 'light-brown-sugar',
    'egg': 'eggs',
    'rice': 'jasmine-rice',
    'jasmine': 'jasmine-rice',
    'basmati': 'basmati-rice',
    'short grain rice': 'japanese-short-grain-rice',
    'sticky rice': 'glutinous-rice',
    'milk': 'whole-milk',
    'cream': 'heavy-cream',
    'butter': 'butter',
    'tomato': 'tomato',
    'tomatoes': 'tomato',
    'canned tomatoes': 'canned-san-marzano-tomatoes',
    'soy sauce': 'light-soy-sauce',
    'soy': 'light-soy-sauce',
    'mirin': 'mirin',
    'sake': 'sake',
    'parmesan': 'parmigiano-reggiano',
    'parm': 'parmigiano-reggiano',
    'pecorino': 'pecorino-romano',
  };

  function singularize(tok) {
    // Light de-pluralization. Don't over-strip ("rice" stays "rice").
    if (tok.endsWith('ies') && tok.length > 4) return tok.slice(0, -3) + 'y';
    if (tok.endsWith('oes') && tok.length > 4) return tok.slice(0, -2);
    if (tok.endsWith('es') && tok.length > 4 && !tok.endsWith('ces') && !tok.endsWith('ses')) return tok.slice(0, -2);
    if (tok.endsWith('s') && tok.length > 3 && !tok.endsWith('ss')) return tok.slice(0, -1);
    return tok;
  }

  // Does `s` contain `needle` as a whole word? Underscores/hyphens
  // count as word separators alongside spaces.
  function containsWord(haystack, needle) {
    if (!needle) return false;
    const pattern = new RegExp(`(^|[\\s\\-_])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\-_]|$)`);
    return pattern.test(haystack);
  }

  function parsePantry(raw) {
    const tokens = String(raw || '')
      .split(/[\n,]+/)
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    const slugs = new Set();
    // Free-text needles for matching against recipe ingredient `item` strings
    // when those ingredients have no slug (which is ~29% of all rows).
    // Each entry is { needle, singular } — both forms are tried.
    const textNeedles = [];
    const unresolved = [];
    for (const tok of tokens) {
      // Track the raw token as a text needle regardless of slug resolution —
      // a user typing "celery" should match an ingredient line "celery stalks,
      // medium dice" even if no celery ingredient page exists.
      const singularTok = singularize(tok);
      textNeedles.push({ needle: tok, singular: singularTok !== tok ? singularTok : null });
      // 1. Alias table — short forms first
      if (PANTRY_ALIASES[tok]) { slugs.add(PANTRY_ALIASES[tok]); continue; }

      // 2. Exact slug match (hyphenated user input or single-word that matches)
      const slug = tok.replace(/[\s_]+/g, '-');
      if (ingredientSlugs.has(slug)) { slugs.add(slug); continue; }

      // 3. Try singularized form (eggs → egg → eggs via aliases? or direct match)
      const singular = singularize(slug);
      if (singular !== slug && ingredientSlugs.has(singular)) { slugs.add(singular); continue; }
      const singularToken = singularize(tok);
      if (PANTRY_ALIASES[singularToken]) { slugs.add(PANTRY_ALIASES[singularToken]); continue; }

      // 4. Word-boundary fuzzy match against slugs and titles. Prefer:
      //    a) slug that matches the user's words exactly (e.g. "yellow onion" → yellow-onion)
      //    b) shortest slug whose title contains the user token as a whole word
      let exactWord = null;
      let titleMatch = null;
      for (const s of ingredientSlugs) {
        const name = ingredientNames.get(s) || s;
        // User typed multi-word that exactly matches the slug words
        if (s === slug) { exactWord = s; break; }
        if (containsWord(s, slug) || containsWord(slug, s)) {
          if (!exactWord || s.length < exactWord.length) exactWord = s;
        } else if (containsWord(name, tok) || (singularToken !== tok && containsWord(name, singularToken))) {
          if (!titleMatch || s.length < titleMatch.length) titleMatch = s;
        }
      }
      if (exactWord) { slugs.add(exactWord); continue; }
      if (titleMatch) { slugs.add(titleMatch); continue; }
      unresolved.push(tok);
    }
    return { tokens, slugs, textNeedles, unresolved };
  }

  // Does the recipe ingredient `item` text contain any user needle as a whole word?
  function itemMatchesNeedles(item, needles) {
    if (!item || !needles.length) return false;
    const haystack = String(item).toLowerCase();
    for (const { needle, singular } of needles) {
      if (containsWord(haystack, needle)) return true;
      if (singular && containsWord(haystack, singular)) return true;
    }
    return false;
  }

  // ── Rank recipes by pantry coverage ────────────────────────────────────
  function rankRecipes(pantrySlugs, textNeedles) {
    const results = [];
    for (const e of entries) {
      if (e.type !== 'recipe' || e.status !== 'complete') continue;
      const ings = (e.ingredients || []).filter(i => !i.optional);
      if (!ings.length) continue;
      let have = 0;
      const missing = [];
      for (const ing of ings) {
        const slug = ing.slug;
        const slugHit = slug && pantrySlugs.has(slug);
        // Fallback: ingredients without a slug (or whose slug we don't have)
        // can still match on the user's free-text needle against ing.item.
        const textHit = !slugHit && itemMatchesNeedles(ing.item, textNeedles);
        if (slugHit || textHit) {
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

  function render(ranked, unresolved) {
    const unresolvedNote = unresolved && unresolved.length
      ? `<p class="pantry-match-unresolved">Could not match: <em>${escapeHtml(unresolved.join(', '))}</em>. Add the common form (e.g. "kosher salt" instead of "salt") if it should be there.</p>`
      : '';
    if (!ranked.length) {
      resultsEl.innerHTML = `${unresolvedNote}<p class="pantry-match-empty">No recipes match yet. Try adding more pantry items, even basics like oil, eggs, or onion widen the field considerably.</p>`;
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
    resultsEl.innerHTML = `${unresolvedNote}<div class="pm-card-list">${out}</div>`;
  }

  // ── Wire ───────────────────────────────────────────────────────────────
  async function runMatch() {
    await ensureEntries();
    const { slugs, textNeedles, unresolved } = parsePantry(ta.value);
    if (slugs.size === 0 && textNeedles.length === 0) {
      resultsEl.innerHTML = `<p class="pantry-match-empty">Add at least one ingredient to see matches.</p>`;
      if (countEl) countEl.textContent = '';
      return;
    }
    const ranked = rankRecipes(slugs, textNeedles);
    render(ranked, unresolved);
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
