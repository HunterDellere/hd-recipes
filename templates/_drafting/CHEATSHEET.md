# Drafting cheatsheet — hd-recipes

Per-session quick reference for the gotchas that aren't obvious from `RECIPE.md` or `INGREDIENT.md` but will fail the validator. Read this first when drafting; it'll save a 4th-error verify cycle.

## Hard rules the validator enforces

These will hard-error `npm run verify`. The validator and the drafting spec do not fully overlap, so the spec alone is not enough.

### Em-dash limit: 2 per file, full stop

`build/validate-formatting.mjs` caps `—` (U+2014) at **2 occurrences per content file**. Long-form recipes routinely use 50+ if you draft naturally. **Default to commas, colons, periods, or parentheticals.** The two-dash budget is reserved for the strongest pauses.

Quick check before saving:
```
grep -c '—' content/recipes/<slug>.md
```

If you've exceeded the budget, the bulk fix is `sed -i '' 's/ — /, /g; s/—/, /g' <file>`. Re-read after to catch any awkward comma stacking.

Exempt: `type: 'family'` and `type: 'safety'` pages.

### Tags must exist in `content/_schema/tags.json`

Free-form tag strings hard-error. Before drafting, scan the existing tag set:
```
jq -r '.[].slug' content/_schema/tags.json | sort
```

If a tag you want doesn't exist, **add it to `tags.json` first**. Bulk-adding 5 new tags at once is fine; don't add them one-at-a-time as validate-errors surface.

Common tags you'll want that may not be there: regional sub-cuisines (`huaiyang`, `isan`, `sichuan`, `cantonese`), preparation style (`braised`, `air-fryer`, `quick`), texture/diet adjacent (`brassica`, `gluten-free` belongs in `diet:` not `tags:`).

### Course enum is closed

`course:` must be one of:
```
breakfast, lunch, dinner, snack, dessert, side, sauce, drink, stock, appetizer, bread
```

Common mistake: `course: 'main'` — there is no `main`. Use `dinner`.

### Diet enum is also closed

`diet:` must be a subset of:
```
vegetarian, vegan, gluten-free, dairy-free, nut-free, low-carb, pescatarian
```

`gluten-free` is a diet, not a tag. Same for `vegan`, `vegetarian`.

### Step text must inline ingredient measurements

Any step that names an ingredient ("toss with cornstarch", "add the panko") must include the qty inline ("toss with the 15 g / 2 tbsp cornstarch", "add the 30 g / ½ cup panko"). The validator scans step text against the ingredients list and flags bare ingredient mentions.

The cook reads steps with floured/sauced hands; they shouldn't have to scroll back to the mise.

### `homemade_alternatives[].recipe_slug` must resolve

Every `recipe_slug` in `homemade_alternatives` must point to an actual page in `content/recipes/`. The build hard-errors with `broken href` if the target doesn't exist.

Options when the homemade page doesn't exist yet:
1. **Draft the full recipe** in the same session (best when the homemade is straightforward).
2. **Drop a stub** at `content/recipes/<slug>.md` with `status: 'stub'` using the stub template at the bottom of `RECIPE.md`, and add a line to `local/homemade-queue.md`.
3. **Remove the `homemade_alternatives` entry** if the ingredient isn't actually worth a homemade version.

Do NOT leave a `recipe_slug` pointing to nowhere.

### `homemade_exempt` covers everything else

The validator flags ingredients that look like store-bought products. Once you've decided an ingredient doesn't warrant a homemade recipe link, add its exact `item:` string to `homemade_exempt: [...]`. Otherwise the validator emits an info-level finding for every flagged ingredient.

## YAML quoting traps

Single-quoted YAML strings (`'...'`) use a doubled-apostrophe to escape an apostrophe inside: `'don''t'`. Common mistakes:

- `'note: '(thin')` — extra closing quote breaks parsing. Should be `'note: '(thin)''`.
- Don't mix curly quotes ('`'`'/'`'`') and straight apostrophes in the same string.
- A bare `:` inside a single-quoted string is fine; a `:` followed by whitespace can confuse parsers in some YAML libraries. Wrap such strings carefully or use double-quotes.

When in doubt, quick parse-check:
```
node -e "const m=require('gray-matter');const f=require('fs').readFileSync('content/recipes/<slug>.md','utf8');console.log(m(f).data.title)"
```

If that errors with a column number, your frontmatter has a YAML problem.

## Ingredient slug references

`ingredients[].slug:` should point to an existing page in `content/ingredients/`. If the page doesn't exist, the validator warns (not errors) and the ingredient renders as plain text rather than a link.

Before drafting, check which ingredient pages exist:
```
ls content/ingredients/ | sed 's/\.md$//'
```

If a recipe needs an ingredient page that doesn't exist:
1. **Draft the full ingredient page** in the same session, following `INGREDIENT.md`. This is the right move when the ingredient is genuinely new to the site and will likely be reused.
2. **Skip the `slug:`** and let the ingredient render as plain text. Right for one-off or vague ingredients ("herbs of choice").

The validator doesn't hard-error, but a recipe with 8 unlinked ingredients reads less networked and undermines the site's cross-linking design.

## Technique references

`techniques[]` and `steps[].technique:` work similarly to ingredient slugs — they should point to a page in `content/techniques/<slug>.md`, but missing pages only warn.

Common techniques referenced often that may not exist yet: `myosin-extraction`, `panade`, `maillard-sear`, `fond-deglaze`, `pan-emulsion`, `braising`, `dry-toasting`. Creating these as proper technique pages (per `TECHNIQUE.md` workflow in the project README) is a follow-up improvement; until then, warnings are acceptable.

## No plastics in active instructions

The validator flags `silicone`, `plastic wrap`, `cling film`, `cling wrap`, and `saran` anywhere in step text on `content/recipes/` and `content/techniques/` pages. Defaults:

- **Mixing / scraping**: wooden spoon (flat-edged for pan-corner scraping during reductions), bench scraper, metal whisk. Not silicone spatula.
- **Bowl / dough covers**: damp tea towel, fitted lid, small plate, beeswax wrap. Not plastic wrap.
- **Surface seal for skin/oxidation prevention** (mustards, gochujang, custards): a circle of parchment paper pressed directly onto the surface. Not plastic wrap.
- **Fermentation weights**: glass fermentation weight, small ceramic ramekin. Not a zip-top bag of brine.
- **Freezer wrapping**: beeswax wrap, airtight glass container. Storage-section *descriptions* (e.g. "vacuum bag" as how an ingredient is sold) are fine; reader-facing wrap instructions should be non-plastic.

## No cross-recipe references — but DO crosslink when you mention another recipe

The validator flags drafting-session phrasings like "the X meatballs above", "the X version above", "as in the section above". Each recipe is published standalone; "above" only refers to earlier sections of the same page (modifications, phases).

When you legitimately need to contrast with another recipe, do both:

1. **Inline the actual title** so the auto-linker fires. Write "the 40 to 50 g format of Italian-American pork meatballs in tomato", not "the Italian-American meatball format". The link map is case-insensitive and matches each entry's `title:`.
2. **Add `related_recipes` frontmatter** so the page also surfaces it as a structural crosslink near the bottom:

   ```yaml
   related_recipes:
     - recipe_slug: 'recipes/italian-american-pork-meatballs-in-tomato'
       why: 'The Western-canon pork meatball, at 40 to 50 g each, the format reference point this dish deliberately deviates from.'
   ```

   The validator checks slug shape and self-reference; `check.mjs` catches unresolved targets. Keep the list short (2–3 entries max).

## Pre-flight checklist before `npm run verify`

Run these in order. Each one is fast.

```bash
# 1. Em-dash budget
for f in content/recipes/<new-slugs>.md content/ingredients/<new-slugs>.md; do
  echo "$f: $(grep -c '—' $f) em-dashes"
done

# 2. Tags exist in schema
node -e "const fs=require('fs');const matter=require('gray-matter');const tags=new Set(JSON.parse(fs.readFileSync('content/_schema/tags.json')).map(t=>t.slug));for(const f of process.argv.slice(1)){const d=matter(fs.readFileSync(f,'utf8')).data;for(const t of d.tags||[]){if(!tags.has(t))console.log(f+': missing tag '+t)}}" content/recipes/<new-slugs>.md

# 3. Course is valid
grep -h '^course:' content/recipes/<new-slugs>.md

# 4. homemade_alternatives targets exist
grep -h 'recipe_slug:' content/recipes/<new-slugs>.md | sed "s/.*recipes\///;s/'.*//" | while read slug; do
  test -f "content/recipes/$slug.md" || echo "MISSING: recipes/$slug.md"
done

# 5. The actual verify
npm run verify
```

## When in doubt

- Read `cast-iron-chuck-eye-steaks-with-shallot-pan-sauce.md` as the gold-standard reference recipe. It passes every validator with zero warnings and is structurally what your new recipes should look like.
- Run `npm run validate` (schema only, fast) before `npm run verify` (full build + checks, slower). Validate-first catches the cheap errors before you wait for a full build.
