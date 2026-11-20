/**
 * test-hub-shop — unit checks for the hub shopping-list merge
 * (build/lib/hub-shop.mjs), run from fixtures so they do not depend on
 * content. Exits non-zero on the first failed check.
 */
import assert from 'node:assert/strict';
import { aggregateHubShop } from './lib/hub-shop.mjs';

function recipe(slug, fm) {
  return [`pages/recipes/${slug}.html`, { type: 'recipe', path: `pages/recipes/${slug}.html`, _fm: fm }];
}

const entriesByPath = new Map([
  recipe('cake', {
    ingredients: [
      { item: 'butter', qty: 100, unit: 'g' },
      { item: 'crème fraîche, cold', qty: 120, unit: 'g' },
      { item: 'black pepper', qty: 'to taste' },
      { item: 'water', qty: 50, unit: 'g' },
    ],
    homemade_alternatives: [{ for: 'Crème fraîche', recipe_slug: 'recipes/creme-fraiche' }],
  }),
  recipe('roast', {
    ingredients: [
      { item: 'butter', qty: 0.5, unit: 'kg' },
      { item: 'beef', qty: 1400, unit: 'g' },
    ],
  }),
  recipe('creme-fraiche', {
    ingredients: [{ item: 'heavy cream', qty: 480, unit: 'g' }],
  }),
]);

const hub = {
  members: [
    { slug: 'recipes/cake' },
    { slug: 'recipes/creme-fraiche' },
    { slug: 'recipes/roast', backup: true },
  ],
};

const rows = aggregateHubShop(hub, entriesByPath, new Map());
const byName = (name) => rows.find(g => String(g.ing.item).toLowerCase().startsWith(name));

// Mass units merge into grams; the default total counts only menu dishes.
const butter = byName('butter');
assert.equal(butter.parts.length, 2, 'butter merges across recipes');
assert.equal(butter.totalQty, 100, 'butter shows the menu total');
assert.equal(butter.hidden, false);
assert.deepEqual(butter.parts.map(p => p.q), [100, 500], 'kg folds into g');

// Rows only a backup needs are emitted hidden.
assert.equal(byName('beef').hidden, true, 'backup-only row starts hidden');

// A homemade component on the menu cancels the store-bought row,
// matched case-insensitively and without the prep clause.
const cf = byName('crème fraîche');
assert.deepEqual(cf.parts[0].x, ['creme-fraiche'], 'store-bought row is cancelled by the component');
assert.equal(cf.hidden, true, 'store-bought crème fraîche starts hidden');

// The component's own ingredients count only while a dish that uses it is on.
const cream = byName('heavy cream');
assert.deepEqual(cream.parts[0].u, ['cake'], 'component parts list their users');
assert.equal(cream.hidden, false);

// Text quantities stay visible; water is never bought.
const pepper = byName('black pepper');
assert.equal(pepper.parts[0].t, 1, 'text quantity is flagged');
assert.equal(pepper.hidden, false, 'text-only row stays visible');
assert.equal(byName('water'), undefined, 'water is left off');

console.log('✓ test-hub-shop: 13 checks passed');
