/**
 * Compute related entries for hd-recipes.
 *
 * Tag scoring: weighted Jaccard with IDF (rare tags count more).
 * Structural bonuses:
 *   - Same category
 *   - Shared cuisine
 *   - Recipe ↔ Ingredient (recipe uses ingredient)
 *   - Recipe ↔ Technique (recipe uses technique)
 *   - Ingredient ↔ Recipe (backlinks)
 */

const MAX_RELATED = 8;
const MIN_SCORE = 0.15;
const MIN_PER_PAGE = 4;
const FALLBACK_MIN_SCORE = 0.05;

const BONUS_SAME_CATEGORY = 0.08;
const BONUS_SHARED_CUISINE = 0.20;
const BONUS_USES_INGREDIENT = 0.40;
const BONUS_USES_TECHNIQUE = 0.30;
const BONUS_SAME_COURSE = 0.06;

const META_TAGS = new Set(['recipe', 'ingredient', 'technique', 'cuisine', 'equipment', 'hub']);

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
  if (!A.size || !B.size) return 0;
  let shared = 0, union = 0;
  const all = new Set([...A, ...B]);
  for (const t of all) {
    const w = idf.get(t) || 0;
    if (A.has(t) && B.has(t)) shared += w;
    union += w;
  }
  return union > 0 ? shared / union : 0;
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

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildRelations(entries) {
  const complete = entries.filter(e => e.status === 'complete');
  const { idf } = buildTagStats(complete);

  // Build slug→entry map for ingredient/technique lookups
  const bySlug = new Map();
  for (const e of complete) {
    const slug = e.path.split('/').pop().replace(/\.html$/, '');
    bySlug.set(`${e.category}/${slug}`, e);
    bySlug.set(slug, e);
  }

  const map = new Map();
  for (const a of complete) {
    const scored = [];
    for (const b of complete) {
      if (a.path === b.path) continue;
      let score = tagScore(a, b, idf);
      let reason = score > 0 ? 'tag' : null;

      if (a.category === b.category) score += BONUS_SAME_CATEGORY;
      if (a.cuisine && a.cuisine === b.cuisine) { score += BONUS_SHARED_CUISINE; reason = reason || 'cuisine'; }
      if (a.course && a.course === b.course) score += BONUS_SAME_COURSE;

      // Recipe → Ingredient: a is recipe and uses b (ingredient)
      if (a.type === 'recipe' && b.type === 'ingredient') {
        const usesIt = (a.ingredients || []).some(i => i.slug === b._slug || i.slug === `ingredients/${b._slug}`);
        if (usesIt) { score += BONUS_USES_INGREDIENT; reason = 'uses'; }
      }
      // Ingredient → Recipe: backlink
      if (a.type === 'ingredient' && b.type === 'recipe') {
        const usedIn = (b.ingredients || []).some(i => i.slug === a._slug || i.slug === `ingredients/${a._slug}`);
        if (usedIn) { score += BONUS_USES_INGREDIENT; reason = 'used-in'; }
      }
      // Recipe → Technique
      if (a.type === 'recipe' && b.type === 'technique') {
        const usesIt = (a.techniques || []).includes(b._slug);
        if (usesIt) { score += BONUS_USES_TECHNIQUE; reason = 'uses'; }
      }
      if (a.type === 'technique' && b.type === 'recipe') {
        const usedIn = (b.techniques || []).includes(a._slug);
        if (usedIn) { score += BONUS_USES_TECHNIQUE; reason = 'used-in'; }
      }

      if (score > 0) scored.push({ entry: b, score, reason: reason || 'tag' });
    }
    scored.sort((x, y) => y.score - x.score);
    let kept = scored.filter(s => s.score >= MIN_SCORE);
    if (kept.length < MIN_PER_PAGE) kept = scored.filter(s => s.score >= FALLBACK_MIN_SCORE);
    map.set(a.path, kept.slice(0, MAX_RELATED));
  }
  return map;
}

export function buildAdjacency(entries) {
  // Sort by category then title for prev/next nav within a category
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

const REASON_LABEL = {
  tag: 'shared tag',
  cuisine: 'same cuisine',
  uses: 'uses this',
  'used-in': 'used in',
};

export function renderRelatedHtml(related, fromPath, _opts = {}) {
  if (!related || !related.length) return '';
  const cards = related.map(({ entry, reason }) => {
    const href = relPath(fromPath, entry.path);
    const reasonLabel = REASON_LABEL[reason] || 'related';
    return `
      <a class="related-card" href="${escapeHtml(href)}" data-category="${escapeHtml(entry.category)}">
        <span class="rl-cat">${escapeHtml(entry.category)}</span>
        <span class="rl-title">${escapeHtml(entry.title || '')}</span>
        ${entry.desc ? `<span class="rl-desc">${escapeHtml(entry.desc.slice(0, 110))}</span>` : ''}
        <span class="rl-reason rl-reason-${escapeHtml(reason)}">${escapeHtml(reasonLabel)}</span>
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
