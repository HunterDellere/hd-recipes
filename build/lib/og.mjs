/**
 * Per-entry SVG OG card + favicon for hd-recipes.
 */

const CATEGORY_META = {
  recipes:     { glyph: '🍳', color: '#b8423a', label: 'Recipe' },
  ingredients: { glyph: '🥬', color: '#3a7a3a', label: 'Ingredient' },
  techniques:  { glyph: '🔥', color: '#a55a1a', label: 'Technique' },
  cuisines:    { glyph: '🌍', color: '#3a5a8a', label: 'Cuisine' },
  equipment:   { glyph: '🪓', color: '#5a4a3a', label: 'Equipment' },
  hubs:        { glyph: '📚', color: '#6b3a78', label: 'Collection' },
};

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderOgSvg(entry) {
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.recipes;
  const title = entry.title || entry.path;
  const desc = entry.desc || '';

  const titleSize = title.length > 40 ? 56 : title.length > 24 ? 72 : 88;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${meta.color}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#faf6ee" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#faf6ee"/>
  <rect width="1200" height="630" fill="url(#vignette)"/>
  <line x1="60" y1="60" x2="1140" y2="60" stroke="${meta.color}" stroke-width="3"/>
  <line x1="60" y1="570" x2="1140" y2="570" stroke="${meta.color}" stroke-width="3"/>
  <text x="80" y="100" font-family="Inconsolata, monospace" font-size="22" letter-spacing="6" fill="#6b5535">HD · RECIPES</text>
  <text x="1120" y="100" font-family="Inconsolata, monospace" font-size="22" letter-spacing="3" fill="#6b5535" text-anchor="end">${escXml(meta.label)}</text>
  <text x="600" y="320" font-family="EB Garamond, Georgia, serif" font-weight="700" font-size="${titleSize}" fill="${meta.color}" text-anchor="middle" dominant-baseline="middle">${escXml(title)}</text>
  ${desc ? `<text x="600" y="430" font-family="EB Garamond, Georgia, serif" font-style="italic" font-size="30" fill="#3a2e1e" text-anchor="middle" dominant-baseline="middle">${escXml(desc.slice(0, 90))}</text>` : ''}
</svg>`;
}

export function categoryFaviconDataUri(_category) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<rect width='100' height='100' rx='18' fill='#faf6ee'/>` +
    `<text x='50' y='50' text-anchor='middle' dominant-baseline='central'` +
    ` font-family='EB Garamond, serif' font-size='66' font-weight='700' fill='#b8423a'>R</text>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export { CATEGORY_META };
