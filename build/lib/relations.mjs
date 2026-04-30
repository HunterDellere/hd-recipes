/**
 * Compute related entries for hd-recipes.
 *
 * Scoring (per pair a → b):
 *   tagScore   = IDF-weighted Jaccard over shared tags (weight 1.0)
 *   ingScore   = (shared_ingredients / max_ings) × INGREDIENT_WEIGHT
 *   techScore  = (shared_techniques / max_techs) × TECHNIQUE_WEIGHT
 *   directLink = recipe ↔ ingredient/technique that's actually used here (DIRECT_BONUS)
 *   structural = same cuisine / same course / same category (small bonuses)
 *
 * Reasons (most informative first):
 *   uses-direct    → recipe page → its ingredient/technique pages, or backlinks
 *   shared-ings    → recipes that overlap on multiple ingredients
 *   shared-tech    → recipes that share a technique
 *   cuisine        → same cuisine (when cuisine is specific, not "American")
 *   tag            → tag-only match
 *
 * The reason text is specific: "uses pecorino, butter" (top 2 shared ings),
 * not "shared tag".
 */

// Single page can show up to 8 cards total, split across three groups:
// recipes, ingredients, techniques. We keep more raw candidates per page so
// the renderer can balance the three groups even when one group is sparse.
const MAX_RELATED = 8;
const MAX_RAW_PER_PAGE = 16; // raw candidate pool before split rendering
const MIN_SCORE = 0.12;
const MIN_PER_PAGE = 4;
const FALLBACK_MIN_SCORE = 0.04;

const TAG_WEIGHT = 1.0;
const INGREDIENT_WEIGHT = 1.6;   // ingredient overlap dominates
const TECHNIQUE_WEIGHT = 1.4;
const BONUS_DIRECT = 1.5;        // ingredient/technique is literally used here
const BONUS_SHARED_CUISINE = 0.30;
const BONUS_SAME_COURSE = 0.10;
const BONUS_SAME_CATEGORY = 0.06;

const META_TAGS = new Set(['recipe', 'ingredient', 'technique', 'cuisine', 'equipment', 'hub']);

// ── helpers ──────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

function normSlug(s) {
  if (!s) return null;
  return s.replace(/^(ingredients|techniques|equipment)\//, '');
}

function ingredientSlugs(entry) {
  if (entry.type !== 'recipe' || !Array.isArray(entry.ingredients)) return [];
  return entry.ingredients
    .map(i => normSlug(i.slug))
    .filter(Boolean);
}

function techniqueSlugs(entry) {
  if (entry.type !== 'recipe' || !Array.isArray(entry.techniques)) return [];
  return entry.techniques.map(normSlug).filter(Boolean);
}

function buildTagStats(entries) {
  const N = entries.length;
  const df = new Map();
  for (const e of entries) {
    for (const t of (e.tags || [])) {
      if (META_TAGS.has(t)) continue;
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  const idf = new Map();
  for (const [t, c] of df) idf.set(t, Math.log((N + 1) / (c + 1)));
  return { idf };
}

function tagScore(a, b, idf) {
  const A = new Set((a.tags || []).filter(t => !META_TAGS.has(t) && idf.has(t)));
  const B = new Set((b.tags || []).filter(t => !META_TAGS.has(t) && idf.has(t)));
  if (!A.size || !B.size) return { score: 0, shared: [] };
  let shared = 0, union = 0;
  const sharedTags = [];
  const all = new Set([...A, ...B]);
  for (const t of all) {
    const w = idf.get(t) || 0;
    if (A.has(t) && B.has(t)) { shared += w; sharedTags.push({ tag: t, idf: w }); }
    union += w;
  }
  // sort shared by IDF desc — rare tags are more interesting reasons
  sharedTags.sort((x, y) => y.idf - x.idf);
  return { score: union > 0 ? shared / union : 0, shared: sharedTags };
}

// ── main scorer ──────────────────────────────────────────────────────────

export function buildRelations(entries) {
  const complete = entries.filter(e => e.status === 'complete');
  const { idf } = buildTagStats(complete);

  // Slug → entry lookup
  const bySlug = new Map();
  for (const e of complete) {
    if (e._slug) bySlug.set(e._slug, e);
  }

  // Pre-compute ing + tech slug arrays for every recipe (avoid recomputing in O(n²))
  const ingMap = new Map();
  const techMap = new Map();
  for (const e of complete) {
    if (e.type === 'recipe') {
      ingMap.set(e.path, ingredientSlugs(e));
      techMap.set(e.path, techniqueSlugs(e));
    }
  }

  // Document frequency of each ingredient slug across recipes. Used to rank
  // shared-ingredient labels in reason text — common ingredients (salt, water)
  // are uninformative reasons, so we surface rarer shared items first.
  const ingDocFreq = new Map();
  for (const [, slugs] of ingMap) {
    for (const s of new Set(slugs)) {
      ingDocFreq.set(s, (ingDocFreq.get(s) || 0) + 1);
    }
  }

  const map = new Map();

  for (const a of complete) {
    const scored = [];
    const aIngs = ingMap.get(a.path) || [];
    const aTechs = techMap.get(a.path) || [];

    for (const b of complete) {
      if (a.path === b.path) continue;

      let score = 0;
      let reason = null;
      let reasonText = null;

      // ── Direct usage: ingredient/technique IS used by this recipe ────
      if (a.type === 'recipe' && b.type === 'ingredient') {
        if (aIngs.includes(b._slug)) {
          score += BONUS_DIRECT;
          reason = 'uses'; reasonText = 'in this recipe';
        }
      }
      if (a.type === 'recipe' && b.type === 'technique') {
        if (aTechs.includes(b._slug)) {
          score += BONUS_DIRECT;
          reason = 'uses'; reasonText = 'used in this recipe';
        }
      }
      // Ingredient/Technique → Recipe: backlink (b is a recipe that uses a)
      if (a.type === 'ingredient' && b.type === 'recipe') {
        if ((ingMap.get(b.path) || []).includes(a._slug)) {
          score += BONUS_DIRECT;
          reason = 'used-in'; reasonText = `uses ${a.title.toLowerCase()}`;
        }
      }
      if (a.type === 'technique' && b.type === 'recipe') {
        if ((techMap.get(b.path) || []).includes(a._slug)) {
          score += BONUS_DIRECT;
          reason = 'used-in'; reasonText = `uses ${a.title.toLowerCase()}`;
        }
      }

      // ── Recipe ↔ Recipe: shared ingredients & techniques ────────────
      if (a.type === 'recipe' && b.type === 'recipe') {
        const bIngs = ingMap.get(b.path) || [];
        const bTechs = techMap.get(b.path) || [];

        // Dedupe shared ingredients (a recipe can list the same slug across
        // multiple phases — e.g. salt in two phases) so we don't score the
        // same overlap twice or render "shares salt, salt" in the reason.
        const sharedSet = new Set(aIngs.filter(s => bIngs.includes(s)));
        const sharedIngs = [...sharedSet];
        const aIngSet = new Set(aIngs);
        const bIngSet = new Set(bIngs);
        if (sharedIngs.length > 0 && (aIngSet.size || bIngSet.size)) {
          // Jaccard-style normalization, weighted, against deduped counts.
          const overlap = sharedIngs.length / Math.max(aIngSet.size, bIngSet.size);
          score += overlap * INGREDIENT_WEIGHT;
          // Build reason text: prefer "rare" shared ingredients (not water/salt).
          // Rank shared ingredients by how rarely they appear across the corpus,
          // so the reason highlights the meaningful overlap rather than the
          // ubiquitous one. Salt-and-water style overlaps still contribute to
          // score, but the labels surface the distinctive shared items.
          const ranked = sharedIngs
            .map(slug => ({ slug, ent: bySlug.get(slug), df: ingDocFreq.get(slug) || 1 }))
            .sort((x, y) => x.df - y.df);
          const recipeCount = ingMap.size;
          // "Distinctive" = appears in fewer than half of all recipes. This
          // strips ubiquitous ingredients (salt, butter, oil) from the
          // reason label when there's a more interesting shared item.
          const distinctive = ranked.filter(r => r.df < Math.max(2, recipeCount / 2));
          const pick = (distinctive.length ? distinctive : ranked).slice(0, 2);
          const labels = pick.map(r => r.ent ? r.ent.title.toLowerCase() : r.slug.replace(/-/g, ' '));
          if (sharedIngs.length >= 2 && labels.length >= 2) {
            reason = 'shared-ings';
            reasonText = `shares ${labels.join(', ')}`;
          } else if (!reason) {
            reason = 'shared-ings';
            reasonText = `also uses ${labels[0]}`;
          }
        }

        const sharedTechs = aTechs.filter(s => bTechs.includes(s));
        if (sharedTechs.length > 0) {
          const overlap = sharedTechs.length / Math.max(aTechs.length || 1, bTechs.length || 1);
          score += overlap * TECHNIQUE_WEIGHT;
          if (!reason || reason === 'tag') {
            reason = 'shared-tech';
            const ent = bySlug.get(sharedTechs[0]);
            const label = ent ? ent.title.toLowerCase() : sharedTechs[0].replace(/-/g, ' ');
            reasonText = `same technique: ${label}`;
          }
        }
      }

      // ── Tag overlap ──────────────────────────────────────────────────
      const tg = tagScore(a, b, idf);
      score += tg.score * TAG_WEIGHT;
      if (!reason && tg.score > 0) {
        reason = 'tag';
        const top = tg.shared.slice(0, 2).map(t => t.tag);
        reasonText = top.length ? `${top.join(' · ')}` : 'shared tag';
      }

      // ── Cuisine + course bonuses ─────────────────────────────────────
      if (a.cuisine && a.cuisine === b.cuisine) {
        score += BONUS_SHARED_CUISINE;
        if (!reason || reason === 'tag') {
          reason = 'cuisine';
          reasonText = `also ${a.cuisine.toLowerCase()}`;
        }
      }
      if (a.course && a.course === b.course) score += BONUS_SAME_COURSE;
      if (a.category === b.category) score += BONUS_SAME_CATEGORY;

      if (score > 0) scored.push({ entry: b, score, reason: reason || 'tag', reasonText: reasonText || 'related' });
    }

    scored.sort((x, y) => y.score - x.score);
    let kept = scored.filter(s => s.score >= MIN_SCORE);
    if (kept.length < MIN_PER_PAGE) kept = scored.filter(s => s.score >= FALLBACK_MIN_SCORE);
    // Direct-use candidates (recipe → its ingredients/techniques, or the
    // backlinks) sit at the top of the score distribution and would otherwise
    // fill the entire raw pool, starving the renderer of lateral candidates
    // that the renderer wants to surface (siblings, shared-ingredient recipes,
    // shared-technique recipes). Partition them and pull a wider lateral pool.
    const direct = kept.filter(k => k.reason === 'uses' || k.reason === 'used-in');
    const lateral = kept.filter(k => k.reason !== 'uses' && k.reason !== 'used-in');
    map.set(a.path, [
      ...direct.slice(0, MAX_RAW_PER_PAGE),
      ...lateral.slice(0, MAX_RAW_PER_PAGE),
    ]);
  }
  return map;
}

export function buildAdjacency(entries) {
  const map = new Map();
  const byCat = new Map();
  for (const e of entries) {
    if (e.status !== 'complete') continue;
    if (!byCat.has(e.category)) byCat.set(e.category, []);
    byCat.get(e.category).push(e);
  }
  for (const [, list] of byCat) {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    for (let i = 0; i < list.length; i++) {
      map.set(list[i].path, {
        prev: i > 0 ? list[i - 1] : null,
        next: i < list.length - 1 ? list[i + 1] : null,
      });
    }
  }
  return map;
}

/**
 * Pick up to `total` cards globally by score, then bucket the survivors into
 * groups for display. This replaces the old fixed-quota approach (recipes 4,
 * ingredients 2, techniques 2) which capped strong candidates and padded with
 * weak ones to hit the quota. With score-driven selection, a technique page
 * can show 6 recipes that genuinely match and 2 sibling techniques, instead of
 * being forced to 4/2/2.
 *
 * Floors keep the section feeling balanced when one group dominates: at least
 * one card from each non-empty group, as long as the group has a candidate
 * scoring above MIN_SCORE.
 */
function splitRelatedByGroup(related, total = 8) {
  const buckets = { recipes: [], ingredients: [], techniques: [] };
  for (const item of related) {
    const cat = item.entry && item.entry.category;
    if (buckets[cat]) buckets[cat].push(item);
  }
  // Score-sorted globally already (input is from buildRelations, score-desc).
  // Reserve one slot per non-empty group so a strong-recipe page still surfaces
  // a sibling ingredient/technique if one exists.
  const out = { recipes: [], ingredients: [], techniques: [] };
  const reserves = ['recipes', 'ingredients', 'techniques']
    .filter(k => buckets[k].length > 0);
  let used = 0;
  for (const k of reserves) {
    if (used >= total) break;
    out[k].push(buckets[k][0]);
    used++;
  }
  // Fill remaining slots strictly by global score across whatever's left.
  const taken = new Set();
  for (const k of reserves) if (out[k][0]) taken.add(out[k][0].entry.path);
  const rest = related.filter(r => !taken.has(r.entry.path));
  for (const item of rest) {
    if (used >= total) break;
    const cat = item.entry && item.entry.category;
    if (!buckets[cat]) continue;
    out[cat].push(item);
    used++;
  }
  return out;
}

const GROUP_LABEL = {
  recipes: 'Recipes',
  ingredients: 'Ingredients',
  techniques: 'Techniques',
};

// A "strong" match is one whose score is in the top quartile of items rendered
// on this page. Used to bump the visual weight of standout cards.
function strongScoreThreshold(items) {
  if (items.length < 2) return Infinity;
  const sorted = items.map(i => i.score).sort((a, b) => b - a);
  return sorted[Math.max(0, Math.floor(sorted.length * 0.25) - 1)];
}

function renderRelatedGroup(label, slug, items, fromPath, strongCutoff) {
  if (!items.length) return '';
  const cards = items.map(({ entry, reason, reasonText, score }) => {
    const href = relPath(fromPath, entry.path);
    const strong = score >= strongCutoff ? ' is-strong' : '';
    return `
        <a class="rl-card${strong}" href="${escapeHtml(href)}" data-category="${escapeHtml(entry.category)}" data-reason="${escapeHtml(reason)}">
          <span class="rl-card-title">${escapeHtml(entry.title || '')}</span>
          <span class="rl-card-why">${escapeHtml(reasonText || 'related')}</span>
        </a>`;
  }).join('');
  return `
      <div class="rl-group" data-related-group="${escapeHtml(slug)}">
        <h3 class="rl-group-head">
          <span class="rl-group-label">${escapeHtml(label)}</span>
          <span class="rl-group-count">${items.length}</span>
        </h3>
        <div class="rl-cards rl-cards--${escapeHtml(slug)}">${cards}
        </div>
      </div>`;
}

export function renderRelatedHtml(related, fromPath, opts = {}) {
  if (!related || !related.length) return '';
  let scoped = related;
  // Strip direct-usage entries on the side of the relationship where they'd
  // duplicate an existing on-page section:
  //   - Recipe pages already list every ingredient/technique they use in the
  //     ingredients section, so `reason: 'uses'` is duplicate noise here.
  //   - Ingredient/equipment pages already render "Recipes using this" above
  //     Related, so `reason: 'used-in'` is duplicate noise there.
  // After filtering, Related only carries lateral connections — siblings,
  // shared flavor profiles, technique adjacency, cuisine peers.
  if (opts.fromType === 'recipe') {
    scoped = scoped.filter(r => r.reason !== 'uses');
  }
  if (opts.fromType === 'ingredient' || opts.fromType === 'equipment' || opts.fromType === 'technique') {
    scoped = scoped.filter(r => r.reason !== 'used-in');
  }
  if (!scoped.length) return '';
  const split = splitRelatedByGroup(scoped, 8);
  const flat = ['recipes', 'ingredients', 'techniques'].flatMap(k => split[k]);
  const cutoff = strongScoreThreshold(flat);
  const groups = ['recipes', 'ingredients', 'techniques']
    .map(k => renderRelatedGroup(GROUP_LABEL[k], k, split[k], fromPath, cutoff))
    .filter(Boolean)
    .join('\n');
  if (!groups.trim()) return '';
  return `
    <span class="section-anchor" id="related"></span>
    <div class="section-head"><h2>Related</h2><span class="sh-sub">${flat.length}</span></div>
    <div class="rl-groups">
${groups}
    </div>`;
}

export function renderAdjacencyHtml(adj, fromPath) {
  if (!adj || (!adj.prev && !adj.next)) return '';
  const link = (e, label) => {
    if (!e) return '<span class="adj-nav-empty"></span>';
    return `<a class="adj-nav-link" href="${escapeHtml(relPath(fromPath, e.path))}">
      <span class="adj-nav-label">${label}</span>
      <span class="adj-nav-title">${escapeHtml(e.title || '')}</span>
    </a>`;
  };
  return `<nav class="adj-nav">${link(adj.prev, '← Previous')}${link(adj.next, 'Next →')}</nav>`;
}
