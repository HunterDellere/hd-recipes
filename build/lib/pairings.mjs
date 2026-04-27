/**
 * pairings.mjs — multi-dimensional "Pairs with" recommendations for a recipe.
 *
 * Different from relations.mjs (tag-similarity Related): pairings deliberately
 * mix result types — other recipes, the techniques behind this dish, the key
 * ingredients to deep-dive, the cuisine context, the curated hub it belongs to.
 *
 * Each candidate carries a `reason` (short chip text) and a numeric `score`.
 * The computePairings function dedupes by path, keeps the highest-scoring
 * reason per target, and returns the top N (default 8).
 */

const COURSE_COMPLEMENTS = {
  dinner:    ['side', 'sauce', 'dessert', 'drink', 'appetizer'],
  lunch:     ['side', 'drink', 'dessert'],
  breakfast: ['drink'],
  snack:     ['drink'],
  appetizer: ['dinner', 'drink'],
  side:      ['dinner', 'lunch'],
  sauce:     ['dinner', 'side'],
  dessert:   ['drink'],
  drink:     ['dessert', 'breakfast'],
  bread:     ['dinner', 'lunch', 'side'],
  stock:     [],
};

function pickBest(scoreMap) {
  // For each path key, keep the highest-scoring entry (and its reason).
  const best = new Map();
  for (const cand of scoreMap) {
    const prev = best.get(cand.path);
    if (!prev || cand.score > prev.score) best.set(cand.path, cand);
  }
  return [...best.values()];
}

/**
 * Build pairings for a single recipe.
 *   recipe:          the source entry (must be type === 'recipe' for full results)
 *   entries:         all entries
 *   hubMembers:      Map<hub_path, count>     (from cards.mjs)
 *   inHubs:          Map<entry_path, [{title, path}]>
 *   ingredientBySlug, techniqueBySlug: lookup maps
 *
 * Returns: Array<{ path, title, category, type, desc, reason, score }>, sorted desc by score, capped at 8.
 */
export function computePairings(recipe, entries, ctx, max = 8) {
  if (!recipe || recipe.type !== 'recipe') return [];
  const { hubMembers, inHubs, ingredientBySlug, techniqueBySlug } = ctx;

  // Index recipes by cuisine and by course for cheap lookup
  const recipes = entries.filter(e => e.type === 'recipe' && e.status === 'complete' && e.path !== recipe.path);
  const byCuisine = new Map();
  const byCourse = new Map();
  for (const r of recipes) {
    if (r.cuisine) {
      const k = r.cuisine.toLowerCase();
      if (!byCuisine.has(k)) byCuisine.set(k, []);
      byCuisine.get(k).push(r);
    }
    if (r.course) {
      if (!byCourse.has(r.course)) byCourse.set(r.course, []);
      byCourse.get(r.course).push(r);
    }
  }

  const candidates = [];

  // 1. Same cuisine, DIFFERENT course
  if (recipe.cuisine) {
    const cuisineMates = byCuisine.get(recipe.cuisine.toLowerCase()) || [];
    for (const r of cuisineMates) {
      if (r.course && recipe.course && r.course !== recipe.course) {
        candidates.push({ path: r.path, title: r.title, category: r.category, type: r.type, desc: r.desc,
          reason: `${recipe.cuisine.toLowerCase()} · ${r.course}`, score: 8 });
      } else {
        // Same cuisine + same course: still useful but lower
        candidates.push({ path: r.path, title: r.title, category: r.category, type: r.type, desc: r.desc,
          reason: `same cuisine`, score: 5 });
      }
    }
  }

  // 2. Same hub (collection siblings)
  const myHubs = inHubs.get(recipe.path) || [];
  for (const h of myHubs) {
    const hubEntry = entries.find(e => e.path === h.path);
    if (!hubEntry) continue;
    const members = hubEntry.members || (hubEntry._fm && hubEntry._fm.members) || [];
    for (const m of members) {
      const slugStr = String(m.slug || m).replace(/^pages\//, '').replace(/\.html$/, '');
      const targetPath = `pages/${slugStr}.html`;
      if (targetPath === recipe.path) continue;
      const target = entries.find(e => e.path === targetPath);
      if (!target || target.status !== 'complete') continue;
      candidates.push({ path: target.path, title: target.title, category: target.category, type: target.type, desc: target.desc,
        reason: `in ${h.title.toLowerCase()}`, score: 7 });
    }
  }

  // 3. Course-complement (dinner → side/dessert/drink, etc.)
  const compCourses = COURSE_COMPLEMENTS[recipe.course] || [];
  for (const c of compCourses) {
    const list = byCourse.get(c) || [];
    for (const r of list) {
      candidates.push({ path: r.path, title: r.title, category: r.category, type: r.type, desc: r.desc,
        reason: `pair as ${c}`, score: 7 });
    }
  }

  // 4. Technique cross-link: recipes sharing a technique
  const myTechs = new Set([
    ...(recipe.techniques || []).map(t => String(t).replace(/^techniques\//, '')),
    ...((recipe.steps || []).map(s => s && s.technique).filter(Boolean).map(t => String(t).replace(/^techniques\//, ''))),
  ]);
  if (myTechs.size) {
    for (const r of recipes) {
      const theirTechs = new Set([
        ...(r.techniques || []).map(t => String(t).replace(/^techniques\//, '')),
        ...((r.steps || []).map(s => s && s.technique).filter(Boolean).map(t => String(t).replace(/^techniques\//, ''))),
      ]);
      const shared = [...myTechs].filter(t => theirTechs.has(t));
      if (shared.length) {
        const techTitle = (techniqueBySlug.get(shared[0]) || {}).title || shared[0];
        candidates.push({ path: r.path, title: r.title, category: r.category, type: r.type, desc: r.desc,
          reason: `shares ${techTitle.toLowerCase()}`, score: 5 + Math.min(shared.length - 1, 2) });
      }
    }
  }

  // 5. Ingredient cross-link: recipes sharing ≥2 ingredients
  const myIngs = new Set((recipe.ingredients || []).map(i => (i.slug || '').replace(/^ingredients\//, '')).filter(Boolean));
  if (myIngs.size >= 2) {
    for (const r of recipes) {
      const theirIngs = (r.ingredients || []).map(i => (i.slug || '').replace(/^ingredients\//, '')).filter(Boolean);
      const shared = theirIngs.filter(i => myIngs.has(i));
      if (shared.length >= 2) {
        candidates.push({ path: r.path, title: r.title, category: r.category, type: r.type, desc: r.desc,
          reason: `${shared.length} shared ingredients`, score: 4 + Math.min(shared.length - 2, 3) });
      }
    }
  }

  // 6. Featured techniques (links to technique pages — learn the method)
  for (const t of myTechs) {
    const target = techniqueBySlug.get(t);
    if (!target || target.status !== 'complete') continue;
    candidates.push({ path: target.path, title: target.title, category: target.category, type: target.type, desc: target.desc,
      reason: `the technique`, score: 4 });
  }

  // 7. Cuisine page (regional context)
  if (recipe.cuisine) {
    const cuisineEntry = entries.find(e => e.type === 'cuisine' && e.status === 'complete' &&
      e.title && e.title.toLowerCase() === recipe.cuisine.toLowerCase());
    if (cuisineEntry) {
      candidates.push({ path: cuisineEntry.path, title: cuisineEntry.title, category: cuisineEntry.category, type: cuisineEntry.type, desc: cuisineEntry.desc,
        reason: `regional context`, score: 4 });
    }
  }

  // 8. Key ingredient deep-dive: pick the most-distinctive ingredient (one with
  //    a slug AND with the lowest usedInCount across the corpus, i.e. the one
  //    most idiosyncratic to this recipe).
  const myIngSlugs = (recipe.ingredients || [])
    .map(i => (i.slug || '').replace(/^ingredients\//, ''))
    .filter(Boolean);
  if (myIngSlugs.length) {
    let best = null, bestScore = Infinity;
    for (const s of myIngSlugs) {
      const target = ingredientBySlug.get(s);
      if (!target || target.status !== 'complete') continue;
      const uses = (target._card && target._card.usedInCount) || 0;
      if (uses < bestScore) { bestScore = uses; best = target; }
    }
    if (best) {
      candidates.push({ path: best.path, title: best.title, category: best.category, type: best.type, desc: best.desc,
        reason: `key ingredient`, score: 3 });
    }
  }

  // Dedupe by path (keep highest-scoring reason per target)
  const deduped = pickBest(candidates);
  // Don't include the source recipe itself
  const filtered = deduped.filter(c => c.path !== recipe.path);
  filtered.sort((a, b) => b.score - a.score);

  // Diversify: cap any single category at half the slots so the section never
  // reads as 8 identical recipe cards. Surfaces technique/ingredient/cuisine
  // links alongside recipe pairings even when score-rank would skip them.
  const perCatCap = Math.ceil(max / 2);
  const counts = {};
  const out = [];
  // First pass: fill respecting the cap
  for (const c of filtered) {
    const k = c.category;
    if ((counts[k] || 0) >= perCatCap) continue;
    out.push(c);
    counts[k] = (counts[k] || 0) + 1;
    if (out.length >= max) break;
  }
  // Second pass: if still below max, fill from remaining (cap was too tight)
  if (out.length < max) {
    const taken = new Set(out.map(c => c.path));
    for (const c of filtered) {
      if (taken.has(c.path)) continue;
      out.push(c);
      if (out.length >= max) break;
    }
  }
  return out;
}
