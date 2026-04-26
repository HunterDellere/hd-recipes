#!/usr/bin/env node
/**
 * draft.mjs — scaffold a new content stub for hd-recipes.
 *
 * Usage:
 *   node build/draft.mjs recipe <slug>
 *   node build/draft.mjs ingredient <slug>
 *   node build/draft.mjs technique <slug>
 *   node build/draft.mjs hub <slug>
 *
 * Creates local/drafts/<category>/<slug>.md. Promote with:
 *   mv local/drafts/<cat>/<slug>.md content/<cat>/<slug>.md && npm run build
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);

const TYPE_MAP = {
  recipe: 'recipes', ingredient: 'ingredients', technique: 'techniques',
  cuisine: 'cuisines', equipment: 'equipment', hub: 'hubs',
};

function recipeStub(slug) {
  return `---
type: 'recipe'
category: 'recipes'
status: 'draft'
content_review: 'pending'
title: ''
desc: ''
metaDesc: ''
tags: []
updated: '${TODAY}'

servings: 4
time:
  prep_min: 15
  cook_min: 30
  total_min: 45
difficulty: 'medium'
cuisine: ''
course: 'dinner'
diet: []

source:
  name: ''
  url: ''
  note: ''

ingredients:
  - group: 'Phase 1'
    item: ''
    slug: ''            # optional: ingredients/<slug>.md
    qty: 1
    unit: 'tbsp'
    prep: ''            # e.g. 'finely diced'

steps:
  - text: ''
    technique: ''       # optional: techniques/<slug>.md
    time_min: 0

techniques: []          # slugs in techniques/
equipment: []           # slugs in equipment/

substitutions:
  - for: ''
    use: ''
    note: ''

notes: |
  Free-form notes.
---
`;
}

function ingredientStub(slug) {
  return `---
type: 'ingredient'
category: 'ingredients'
status: 'draft'
content_review: 'pending'
title: ''
desc: ''
tags: []
updated: '${TODAY}'

# Optional USDA FoodData Central id for nutrition lookup.
# Look up at https://fdc.nal.usda.gov/ — prefer "SR Legacy" or "Foundation" entries.
usda_fdc_id:

about: |
  What it is. How to choose it. Why it matters in cooking.

seasonality: ''
storage: ''

substitutions:
  - for: ''
    use: ''
    note: ''
---
`;
}

function techniqueStub(slug) {
  return `---
type: 'technique'
category: 'techniques'
status: 'draft'
content_review: 'pending'
title: ''
desc: ''
tags: []
updated: '${TODAY}'

about: |
  What this technique does, the underlying principle, common pitfalls.
---
`;
}

function hubStub(slug) {
  return `---
type: 'hub'
category: 'hubs'
status: 'draft'
title: ''
desc: ''
tags: []
updated: '${TODAY}'

members:
  - slug: 'recipes/example'
    label: ''
    note: ''
---
`;
}

function genericStub(category, slug) {
  return `---
type: '${category.replace(/s$/, '')}'
category: '${category}'
status: 'draft'
title: ''
desc: ''
tags: []
updated: '${TODAY}'
---
`;
}

const args = process.argv.slice(2);
const type = args[0];
const slug = args[1];
if (!type || !slug || !TYPE_MAP[type]) {
  console.error('Usage: node build/draft.mjs <recipe|ingredient|technique|hub|cuisine|equipment> <slug>');
  process.exit(1);
}

const category = TYPE_MAP[type];
const outDir = join(ROOT, 'local', 'drafts', category);
const outPath = join(outDir, `${slug}.md`);
if (existsSync(outPath)) {
  console.log(`Already exists: local/drafts/${category}/${slug}.md`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
const stub = type === 'recipe' ? recipeStub(slug)
  : type === 'ingredient' ? ingredientStub(slug)
  : type === 'technique' ? techniqueStub(slug)
  : type === 'hub' ? hubStub(slug)
  : genericStub(category, slug);
writeFileSync(outPath, stub, 'utf8');
console.log(`✓ local/drafts/${category}/${slug}.md`);
console.log(`\nNext: edit, then promote:`);
console.log(`  mv local/drafts/${category}/${slug}.md content/${category}/${slug}.md && npm run build`);
