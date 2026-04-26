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

const MAX_RELATED = 8;
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

        const sharedIngs = aIngs.filter(s => bIngs.includes(s));
        if (sharedIngs.length > 0 && (aIngs.length || bIngs.length)) {
          // Jaccard-style normalization, weighted
          const overlap = sharedIngs.length / Math.max(aIngs.length, bIngs.length);
          score += overlap * INGREDIENT_WEIGHT;
          if (sharedIngs.length >= 2) {
            reason = 'shared-ings';
            // Top 2 shared ingredients as reason text (look up titles for nice display)
            const labels = sharedIngs.slice(0, 2).map(slug => {
              const ent = bySlug.get(slug);
              return ent ? ent.title.toLowerCase() : slug.replace(/-/g, ' ');
            });
            reasonText = `shares ${labels.join(', ')}`;
          } else if (!reason) {
            reason = 'shared-ings';
            const ent = bySlug.get(sharedIngs[0]);
            const label = ent ? ent.title.toLowerCase() : sharedIngs[0].replace(/-/g, ' ');
            reasonText = `also uses ${label}`;
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
          reasonText = `${a.cuisine.toLowerCase()}`;
        }
      }
      if (a.course && a.course === b.course) score += BONUS_SAME_COURSE;
      if (a.category === b.category) score += BONUS_SAME_CATEGORY;

      if (score > 0) scored.push({ entry: b, score, reason: reason || 'tag', reasonText: reasonText || 'related' });
    }

    scored.sort((x, y) => y.score - x.score);
    let kept = scored.filter(s => s.score >= MIN_SCORE);
    if (kept.length < MIN_PER_PAGE) kept = scored.filter(s => s.score >= FALLBACK_MIN_SCORE);
    map.set(a.path, kept.slice(0, MAX_RELATED));
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

export function renderRelatedHtml(related, fromPath, _opts = {}) {
  if (!related || !related.length) return '';
  const cards = related.map(({ entry, reason, reasonText }) => {
    const href = relPath(fromPath, entry.path);
    return `
      <a class="related-card" href="${escapeHtml(href)}" data-category="${escapeHtml(entry.category)}">
        <span class="rl-cat">${escapeHtml(entry.category)}</span>
        <span class="rl-title">${escapeHtml(entry.title || '')}</span>
        ${entry.desc ? `<span class="rl-desc">${escapeHtml(entry.desc.slice(0, 110))}</span>` : ''}
        <span class="rl-reason rl-reason-${escapeHtml(reason)}">${escapeHtml(reasonText || 'related')}</span>
      </a>`;
  }).join('');
  return `
    <span class="section-anchor" id="related"></span>
    <div class="section-head"><h2>Related</h2></div>
    <div class="related-cards">${cards}
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
