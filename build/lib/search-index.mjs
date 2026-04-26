/**
 * Build a weighted inverted index for hd-recipes.
 *
 * Output shape: { paths: string[], index: { token: [[pathId, score], ...] } }
 *
 * Field weights:
 *   title       × 15
 *   tags        × 10
 *   ingredients ×  8   (recipe ingredient items + ingredient page titles)
 *   desc        ×  6
 *   category    ×  4
 *   cuisine     ×  4
 *   body        ×  1
 */

const STOPWORDS = new Set([
  'the','and','for','with','from','that','this','into','onto','over','under','when',
  'what','where','which','whose','there','their','they','them','these','those','about',
  'have','has','had','will','would','could','should','been','being','some','such','than',
  'then','also','very','just','only','more','most','much','many','any','all','but','not',
  'are','was','were','one','two','three','out','can','may','via','per','let','its',
  'of','to','in','it','is','as','on','or','by','an','at','be','he','we','so','if',
  'do','up','no','us','my','our','who','way','see','how','now','use','his','her',
  'him','she','too','off','own','yet','why','say','new','old','get','got',
  'you','nor','day','add','mix','cut','put','set','let','top','low','hot','pan'
]);

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function* tokens(text, { minLen = 2 } = {}) {
  if (!text) return;
  const arr = normalize(text)
    .replace(/[·—–,;:!?()[\]{}'"\/\\.]/g, ' ')
    .split(/\s+/)
    .filter(t => t && t.length >= minLen && !STOPWORDS.has(t));
  for (const t of arr) yield t;
}

export function buildSearchIndex(entries, bodies = {}) {
  const paths = [];
  const pathToId = new Map();
  for (const entry of entries) {
    if (entry.status !== 'complete') continue;
    pathToId.set(entry.path, paths.length);
    paths.push(entry.path);
  }

  const index = new Map();
  function add(token, pathId, weight) {
    if (!token) return;
    let scores = index.get(token);
    if (!scores) { scores = new Map(); index.set(token, scores); }
    scores.set(pathId, (scores.get(pathId) || 0) + weight);
  }

  const FW = { title: 15, tags: 10, ingredients: 8, desc: 6, category: 4, cuisine: 4, body: 1 };

  for (const entry of entries) {
    if (entry.status !== 'complete') continue;
    const pathId = pathToId.get(entry.path);

    for (const t of tokens(entry.title)) add(t, pathId, FW.title);
    for (const t of tokens(entry.desc))  add(t, pathId, FW.desc);
    if (entry.category) add(normalize(entry.category), pathId, FW.category);
    if (entry.cuisine)  add(normalize(entry.cuisine),  pathId, FW.cuisine);
    if (entry.course)   add(normalize(entry.course),   pathId, FW.cuisine);

    if (Array.isArray(entry.tags)) {
      for (const tag of entry.tags) {
        for (const t of tokens(tag)) add(t, pathId, FW.tags);
        add(normalize(tag), pathId, FW.tags);
      }
    }

    if (Array.isArray(entry.ingredients)) {
      for (const ing of entry.ingredients) {
        for (const t of tokens(ing.item)) add(t, pathId, FW.ingredients);
        if (ing.slug) add(normalize(ing.slug), pathId, FW.ingredients);
      }
    }

    const slug = entry.path.split('/').pop().replace(/\.html$/, '');
    for (const t of tokens(slug.replace(/[-_]/g, ' '))) add(t, pathId, FW.title);

    const body = bodies[entry.path];
    if (body) for (const t of tokens(body, { minLen: 4 })) add(t, pathId, FW.body);
  }

  const MAX_POSTINGS = 40;
  const outIndex = {};
  for (const [token, scores] of index) {
    outIndex[token] = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_POSTINGS);
  }

  return { paths, index: outIndex };
}
