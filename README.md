# hd · recipes

A personal recipe library. Static site, markdown content, Node build pipeline.

Recipes are written in the voice of a molecular-gastronomy specialist: clinical, technique-driven, nothing flowery. Every dish scales client-side, ingredients and techniques are crosslinked, nutrition comes from USDA FoodData Central, photos drop in by convention.

This README is the entry point for using and contributing to the site over time. Deeper authoring rules live in `CLAUDE.md` and `templates/_drafting/RECIPE.md`.

---

## Quickstart

```bash
npm install
npm run build
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

For active editing, use the watcher instead. It rebuilds on any change to `content/` or `templates/` and serves on `:8080`:

```bash
npm run watch
```

---

## What's on the site

- **Recipes**: tested dishes with full ingredients, steps, scaling, and computed nutrition.
- **Ingredients**: single-ingredient pages with about, seasonality, storage, substitutes, USDA id.
- **Techniques**: methods used across recipes (brown butter, pan emulsion, cracking coconut cream).
- **Cuisines**: regional pantry / flavor-base / reading-paths pages.
- **Equipment**: tools, what they do, when to use.
- **Hubs**: curated reading paths (collections of recipes around a theme).

Each lives in `content/<category>/<slug>.md`. The build emits a static page per file plus index data, search index, sitemap, RSS, and OG cards.

---

## Folder layout

```
hd-recipes/
├── content/                      # SOURCE: one .md per page
│   ├── recipes/
│   ├── ingredients/
│   ├── techniques/
│   ├── cuisines/
│   ├── equipment/
│   ├── hubs/
│   ├── images/                   # photos: see "Adding photos"
│   ├── _reference/
│   │   └── cuisines/             # regional briefings loaded at intake time
│   ├── _schema/                  # entry.schema.json, tags.json
│   └── _featured/                # daily.json rotation
│
├── templates/
│   ├── _layout.html              # head / nav / footer / scripts
│   └── _drafting/RECIPE.md       # authoring spec; read before writing recipes
│
├── build/                        # build pipeline
│   ├── build.mjs
│   ├── validate.mjs
│   ├── check.mjs
│   ├── draft.mjs
│   ├── watch.mjs
│   └── lib/
│       ├── recipe-render.mjs     # recipe / ingredient / technique / hub renderers
│       ├── images.mjs            # responsive photo pipeline (sharp)
│       ├── search-index.mjs
│       ├── relations.mjs
│       ├── nutrition.mjs
│       ├── units.mjs             # qty parsing, unit normalization, packs
│       └── og.mjs                # OG card SVG generator (fallback)
│
├── scripts/                      # client-side
│   ├── recipe.js                 # scaling, units toggle, shopping list
│   ├── lightbox.js               # photo lightbox
│   ├── enhance.js                # SW, theme, share, reading progress
│   ├── toc-scroll.js             # TOC scroll-spy + mobile sidebar
│   └── refresh-nutrition.mjs     # USDA fetch CLI
│
├── pages/                        # GENERATED: never hand-edit
├── data/                         # GENERATED: entries.json, search-index.json, etc.
│   └── _reference/
│       └── usda-cache.json       # nutrition cache (committed)
├── assets/images/                # GENERATED: responsive image variants
├── og/                           # GENERATED: per-entry OG SVGs
│
├── style.css                     # base stylesheet
├── style-home.css                # homepage-only
├── index.html                    # shell
├── 404.html, random.html
├── sw.js                         # service worker
└── local/                        # gitignored: drafts, prompts, notes
```

`pages/`, `data/`, `assets/images/`, `og/`, `sitemap.xml`, `feed.xml`, `robots.txt`, `manifest.webmanifest`, and the OG card files are all generated. Don't hand-edit them.

---

## Build commands

```bash
npm run build              # generate pages/, data/, og/, assets/images/ from content/
npm run validate           # schema-check all content files
npm run check              # post-build invariants + link/anchor resolution + admin smoke test
npm run verify             # validate + build + check (run before any push)
npm run validate:all       # all validators (relations, search, formatting); emits findings to admin
npm run refresh:nutrition  # fetch USDA FDC records for ingredient pages
npm run draft <type> <slug>  # scaffold a new draft in local/drafts/
npm run watch              # dev server with rebuild-on-change at :8080
```

`npm run verify` is the gate before pushing. It runs schema validation, builds, then runs invariants and the formatting checker (em-dashes, missing anchors, store-bought ingredients without homemade alternatives, etc.).

---

## Authoring a recipe

1. Scaffold the draft.

   ```bash
   npm run draft recipe brown-butter-cacio-e-pepe
   ```

   This creates `local/drafts/recipes/brown-butter-cacio-e-pepe.md` with the right frontmatter shape pre-filled.

2. Read `templates/_drafting/RECIPE.md`. The voice and structure rules are non-negotiable. Briefly: clinical molecular-gastronomy voice, every ingredient gets standard + grams, savory dishes need a glutamate source and a finishing acid, modifications are pivots not patches, em-dashes capped at 2 per recipe.

3. Fill in frontmatter. Most recipes are frontmatter-only; the entire page renders from it. Add a body only when you want custom prose above the auto-generated sections.

4. Move the draft into place and build.

   ```bash
   mv local/drafts/recipes/brown-butter-cacio-e-pepe.md content/recipes/
   npm run build
   ```

5. Run `npm run verify`. Fix any errors before pushing.

For ingredients referenced by `slug:` in the recipe, scaffold the ingredient page if it does not exist:

```bash
npm run draft ingredient pecorino-romano
```

Techniques, cuisines, equipment, hubs follow the same pattern.

---

## Adding photos

Convention-based, no frontmatter required. Drop JPEGs into the recipe's image folder using these names:

```
content/images/recipes/<slug>/
├── hero.jpg          # the dish; appears right of title (desktop) or below (mobile)
├── step-1.jpg        # appears full-width below step 1
├── step-2.jpg        # appears full-width below step 2
└── step-N.jpg        # ...
```

Skip whichever step numbers you don't have a photo for. Step indices are 1-based and match the step order in the recipe frontmatter.

Run `npm run build`. The pipeline:

- Generates AVIF + WebP + JPEG variants at 480w, 960w, and 1600w into `assets/images/recipes/<slug>/`.
- Strips EXIF, auto-rotates by orientation, embeds a tiny base64 LQIP for blur-up.
- Content-hash caches each source, so re-runs on unchanged photos are a no-op.
- Prefers a real hero photo over the SVG fallback for OG / Twitter social cards.

Hero ratio is 3:2; step images keep their native ratio. Tap any photo to open the lightbox; arrow keys or swipe between all photos on the page; Esc closes.

---

## Schema rules

- `status: 'complete'` only when fully authored. `'draft'` while in flight. `'stub'` for placeholders.
- `tags` must exist in `content/_schema/tags.json`. To add a new tag, add it there first; the validator rejects free-form tags.
- `updated` (`YYYY-MM-DD`) drives "Recently added" and last-modified.
- Ingredient `slug:` refs accept either bare slug (`pecorino-romano`) or `ingredients/pecorino-romano`. The build resolves both.

### Modifications vs substitutions

Two distinct sections on every recipe page. They render differently because they're different things.

- **`modifications[]`**: pivots that change the dish's character. Each entry has `for` (what's changing, e.g. protein, cuisine, dietary), `to` (what it becomes), `how` (the technique or timing change with quantities), and an optional `kind` from this enum: `regional | dietary | protein | texture | heat | occasion`. Renders as colored-accent cards with a kind chip.
- **`substitutions[]`**: 1:1 ingredient swaps where the dish stays the same dish. `for` / `use` / `note`. Use this only when the cook does not have to change anything else. Renders as a compact list.

If a swap requires a technique change, it belongs in modifications, not substitutions.

### Homemade alternatives

When a recipe lists a store-bought ingredient that has a reasonable homemade version (chicken stock, mayo, ricotta, hot sauce, BBQ, pesto, breadcrumbs, fresh pasta, hummus, curry paste, pie crust, granola, tortillas, etc.), populate `homemade_alternatives` with a link to a recipe page that teaches it. The page can be a stub at first; the link should always resolve.

Use `homemade_exempt: ['coconut milk']` for store-bought ingredients with no reasonable homemade form, to suppress the validator warning.

### Cuisine references

Before drafting a dish in an identifiable regional tradition, read the matching file in `content/_reference/cuisines/`:

- `east-asian.md`: Chinese, Japanese, Korean, Taiwanese
- `southeast-asian.md`: Thai, Vietnamese, Indonesian, Malaysian, Filipino, Cambodian, Lao, Singaporean
- `south-asian.md`: Indian (regional), Pakistani, Bangladeshi, Sri Lankan, Nepali
- `mediterranean-european.md`: Italian (regional), Spanish, Greek, Portuguese, southern French
- `northern-central-european.md`: French (north), German, British, Scandinavian, Polish, Hungarian
- `latin-american.md`: Mexican (regional), Central American, Caribbean, South American
- `middle-eastern-north-african.md`: Levantine, Persian, Turkish, Maghrebi, Egyptian
- `west-and-sub-saharan-african.md`: West African, East African, Ethiopian / Eritrean

These are descriptive briefings (pantry foundations, defining techniques, common Western drift). Use them to ground ingredient choices and call out drift. If a dish is regional enough that the continental note feels too coarse and a region-specific file does not yet exist, write one.

---

## Nutrition

Per-recipe macros and micros are computed at build time, not at runtime.

1. Recipe references ingredients via `slug:` on each ingredient row, or per-row override `usda_fdc_id`.
2. Each ingredient page provides `usda_fdc_id` (look up at https://fdc.nal.usda.gov/).
3. `data/_reference/usda-cache.json` holds the cached USDA records. **Commit this file.**
4. `npm run refresh:nutrition` fetches missing records (requires `USDA_API_KEY` from https://fdc.nal.usda.gov/api-key-signup.html).
5. Build computes `(per-100g × ingredient grams) → recipe total → ÷ servings`.

The build itself never hits the network. Refreshing nutrition is an explicit, deliberate action.

```bash
USDA_API_KEY=... npm run refresh:nutrition
```

For accurate density-based conversions and nutrition computation on volume-measured ingredients, set `density_g_per_ml` on the ingredient frontmatter. For piece-measured ingredients (`unit: 'each'` / `clove` / `pod` / `stick`), set `grams_per_unit`.

---

## Scaling, units, and shopping list

`scripts/recipe.js` handles client-side interactions on the recipe page:

- **Scaling**: multiplies all ingredient quantities by `target_servings / base_servings`. Best fidelity comes from `qty` as a number in grams; put any narrative measurement in `note` like `note: '(1 tbsp / 15g)'`.
- **Units toggle**: metric ↔ imperial, computed from gram values plus density.
- **Shopping list export**: copies a markdown list to clipboard, excluding any items checked off. Pack rows roll up to whole purchase units (`2 × 13.5 oz can`).

For pack-aware shopping (cans, bottles, bricks), set `pack: { size_ml, size_g, size_label }` on the ingredient page; the recipe row inherits and the shop view aggregates.

---

## Cook's view

A focus mode for actually cooking. Tap the "Cook's view" button in the recipe hero; the interface dims everything except the active step, scales up step text, keeps the screen on (where supported), and moves the unit toggle and step navigation into a bottom bar within thumb reach. Tap any ingredient row to mark it staged; tap any step number to jump to it. Designed for messy hands and a phone propped against the backsplash.

---

## Admin dashboard

Generated each build at `pages/_admin/review.html`. Bookmark it. Not linked from public surfaces.

Filterable table of all entries with status, review state, findings, and nutrition coverage. Findings come from `validate-relations`, `validate-search`, and `validate-formatting` (run via `npm run validate:all`). They're written to `data/_admin/findings.json` and surfaced in the admin table.

`content_review` flips from `'pending'` to `'verified'` once the recipe has been cooked at least twice with consistent results, or you have a trusted source to anchor it. Bump `updated` and populate `content_sources` when you flip.

---

## Verify before pushing

```bash
npm run verify
```

This runs:

1. **`validate.mjs`**: schema check on every content file.
2. **`build.mjs`**: full site build.
3. **`check.mjs`**: post-build invariants (every entry has a generated page, every internal link resolves to an anchor or page).
4. **`validate-formatting.mjs`**: em-dash limit (max 2 per recipe), section anchor presence for TOC scroll-spy, store-bought ingredients without homemade alternatives.
5. **`test-admin.mjs`**: smoke test on the admin dashboard.

Everything must come back green except for the explore-page anchor warnings, which are pre-existing and known.

---

## Site URL and deployment

Update `SITE_URL` in `build/build.mjs` to your actual domain. The build emits `sitemap.xml`, `robots.txt`, `feed.xml`, and `manifest.webmanifest` based on it.

The site is fully static. Any static host works. The service worker (`sw.js`) caches the shell for offline reading.

---

## Conventions for future contributions

- **Source of truth is `content/`.** Anything in `pages/`, `data/`, `assets/images/`, or `og/` is generated; don't hand-edit.
- **One small file beats one big file.** When a renderer or library file passes ~400 lines, split it.
- **Em-dashes are scarce.** Hard limit 2 per recipe. Use colons, periods, parentheticals, or restructure.
- **No marketing voice.** No "delicious," "amazing," "perfect," "elevate," "level up." Specific verbs and clinical reasoning instead.
- **Adding a generated artifact?** Add the source folder to git, the generated folder to `.gitignore`. Pattern: `content/images/` is committed, `assets/images/` is not. `data/_reference/usda-cache.json` is committed (slow to regenerate, costs an API key).
- **Run `npm run verify` before every push.** Build artifacts must match source.

For voice and structure rules in detail: `templates/_drafting/RECIPE.md`. For drafting workflow context (cuisine references, homemade alternatives intake, photo conventions): `CLAUDE.md`.
