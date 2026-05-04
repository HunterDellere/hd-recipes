# Recipe drafting spec — hd-recipes

This document is the authoring guide. Every recipe in `content/recipes/<slug>.md`
follows the structure below. Most recipes have **no body** — the entire page
renders from frontmatter. If you want to inject custom prose (a paragraph above
the steps, a story), you can author HTML in the body and the build will inject
the auto-generated sections after it.

## Voice & approach (the generator prompt)

Recipes are written in the voice of a specialist in molecular gastronomy and
nutritional biochemistry. Authoritative, clinical, technique-driven —
Serious Eats / America's Test Kitchen, not Bon Appétit. Engineer flavor through
layering, pH balance, and thermal kinetics.

**Operational directives:**

1. **Naming rule** — `title` is the dish name, full stop. No filler.
2. **Anti-bland mandate** — excellent technique is baseline, not "upgrade." Maximize flavor through Maillard browning, blooming, enzymatic transformation, reduction, fermentation. No "for a flavor boost, you can…" — bake it in.
3. **Ingredient selection — best form in the recipe, substitution if the cook may not have it.** For every ingredient: (1) read `content/ingredients/<slug>.md` and check the `substitutions` section — it documents which form is correct for which application. (2) Choose the form that produces the best outcome in this specific recipe, not the most common or default form. (3) If the best-form ingredient is specialty or less common, add a `substitutions` entry pointing to the accessible fallback.
    The principle: the recipe itself always uses the best ingredient. Substitutions exist for the cook who doesn't have it, not as an excuse to default to a lesser ingredient from the start.
    Known cases where the default is wrong:
    - **Vanilla**: `vanilla bean paste` in any visible or lightly cooked application (pancakes, waffles, custard, ice cream, frosting, cookies, panna cotta) — seeds read and aromatic load is higher. `vanilla extract` only where vanilla is a background note in a heavily flavored bake (brownies, chocolate cake) or where sustained heat would drive off volatiles regardless. Read `content/ingredients/vanilla-extract.md` → substitutions for the full decision tree.
    - **Salt**: `fine sea salt` in batters, doughs, and emulsions (dissolves evenly). `kosher salt` (Diamond Crystal) for brining, dry-brining, pasta water, seasoning in layers. Never specify bare "salt."
    - **Sugar**: specify which — `granulated sugar`, `light brown sugar`, or `dark brown sugar`. Each has a distinct moisture, browning, and flavor profile. "Sugar" is not an ingredient.
    - **Butter**: ask whether brown butter earns its complexity before defaulting to plain unsalted. If yes, call it in the steps and reference the `brown-butter` technique.
4. **Umami + acid requirement** — savory recipes MUST include a glutamate source (parmesan, anchovy, miso, soy, tomato paste, fish sauce, mushroom) and a finishing acid (lemon, vinegar, lime). These are non-negotiable phases, not "modifications."
5. **Seasoning curve** — instruct the cook to season at every stage. Explain how salt + heat interact at each phase.
6. **Measurement integrity** — every ingredient gets BOTH measurements: standard and grams. The schema field `qty` should be the gram value (numeric, scalable). Use the `note` field for the standard equivalent in parens, e.g. `note: '(1 tbsp / 15g)'` — or just put the standard form in the `prep` field. **Bake measurements into the steps too.** A step that names an ingredient ("season with salt", "add the butter") must include the qty inline ("season with 6 g / 1 tsp salt", "add 60 g / 4 tbsp butter"). A cook with floured / sauced / dirty hands shouldn't have to scroll back to the mise to find a number. The validator (`validate-formatting.mjs`) flags any step that names an ingredient without a measurement.
7. **Linguistic precision** — concise, specific verbs: render, emulsify, bloom, sweat, temper, hydrate. No flowery filler. No "it's not X, it's Y."
8. **Modifications are pivots, not patches** — `substitutions` are for genuine alternatives (texture contrast, regional variant, dietary swap). Never use this section to fix bland baseline recipes.
9. **Flat structure** — `steps[]` is a flat numbered list. `ingredients[]` is a flat list grouped by phase via the `group` field. No nesting.
10. **Homemade alternatives are mandatory** — when a recipe lists a store-bought ingredient that has a reasonable homemade version (chicken stock, mayo, ricotta, hot sauce, BBQ sauce, hummus, breadcrumbs, fresh pasta, curry paste, pie crust, etc.), populate `homemade_alternatives` with a link to a recipe page that teaches it. **Workflow during intake:**
    1. After drafting the main recipe, scan its ingredients for store-bought items with reasonable homemade counterparts. The validator (`validate-formatting.mjs`) flags common ones automatically.
    2. **Offer to draft each homemade recipe in the same session.** Ask the user once per item — accept yes/no — then either (a) draft a full recipe page for items they want now, or (b) create a quality stub for the rest.
    3. Stubs use `status: 'stub'` and follow the stub template at the bottom of this file. Each stub is a placeholder with enough framing that a future drafting session can fill it in without rebuilding the conceptual scaffolding.
    4. Either way, link from the calling recipe via `homemade_alternatives: [{ for: '<as the recipe lists it>', recipe_slug: 'recipes/<slug>', why: '<one sentence on why bother>' }]`.
    5. Add anything left as a stub to `local/homemade-queue.md` so it surfaces for follow-up.

## Frontmatter shape (recipe)

```yaml
---
type: 'recipe'
category: 'recipes'
status: 'complete'                    # 'stub' | 'draft' | 'complete'
content_review: 'pending'             # 'pending' | 'verified' | 'needs-work'

title: 'Brown butter cacio e pepe'    # the dish name
desc: 'Two-sentence overview of the logic and flavor profile.'
metaDesc: 'SEO description, ~155 chars.'
tags: ['weeknight', 'pasta', 'italian', 'umami']
updated: '2026-04-26'
last_made: '2026-04-20'               # optional
rating: 5                             # optional, 1-5

servings: 2
yield_note: 'or 1 hungry serving'     # optional
time:
  prep_min: 5
  cook_min: 12
  total_min: 17
  active_min: 12                      # optional, hands-on time
difficulty: 'easy'                    # 'easy' | 'medium' | 'hard'
cuisine: 'Italian'
course: 'dinner'                      # see schema for full enum
diet: ['vegetarian']                  # see schema for full enum

source:
  name: 'Adapted from Roman tradition'
  url: ''
  note: 'Brown butter is the divergence; classic uses olive oil only.'

ingredients:
  - group: 'Phase 1 — pasta water'
    item: 'kosher salt'
    qty: 25
    unit: 'g'
    note: '(2 tbsp Diamond Crystal)'
  - group: 'Phase 1 — pasta water'
    item: 'water'
    qty: 1500
    unit: 'ml'
    note: '(6 cups)'

  - group: 'Phase 2 — emulsion'
    item: 'pecorino romano'
    slug: 'pecorino-romano'           # links to ingredients/pecorino-romano.md
    qty: 90
    unit: 'g'
    prep: 'finely grated on microplane'
    note: '(1 cup)'
  - group: 'Phase 2 — emulsion'
    item: 'unsalted butter'
    slug: 'butter'
    qty: 60
    unit: 'g'
    note: '(4 tbsp / ½ stick)'
  - group: 'Phase 2 — emulsion'
    item: 'black peppercorns'
    qty: 6
    unit: 'g'
    prep: 'cracked coarse'
    note: '(1½ tbsp whole)'

  - group: 'Phase 3 — pasta'
    item: 'tonnarelli or spaghetti'
    qty: 200
    unit: 'g'
    note: '(7 oz dried)'

steps:
  - text: 'Set a 4-quart pot of water to boil with the salt — taste it; it must be aggressively saline like the sea, because this water will season the dish from the inside out.'
    time_min: 8
  - text: 'While the water heats, melt butter in a wide stainless skillet over medium-low. Cook past the foaming stage until the milk solids turn deep amber and smell like toasted hazelnut, ~4 minutes. Pull off heat.'
    technique: 'brown-butter'
    time_min: 4
  - text: 'Bloom the cracked pepper directly in the brown butter — return the pan to low heat for 30 seconds until fragrant. The fat carries the piperine; this is non-negotiable.'
    time_min: 1
  - text: 'Drop the pasta. Cook 1 minute shy of al dente. Reserve 200ml (¾ cup) of starchy pasta water in a heatproof measuring cup.'
    time_min: 8
  - text: 'Transfer pasta directly into the skillet with tongs (carrying water with it). Add 60ml (¼ cup) reserved pasta water. Toss vigorously over low heat for 30 seconds to emulsify.'
    technique: 'pan-emulsion'
    time_min: 1
  - text: 'Pull from heat. Add pecorino in three additions, tossing constantly between each. The temperature is critical: too hot and the cheese seizes into clumps; too cool and it doesn''t hydrate. The sauce should coat the back of a spoon like cream.'
    time_min: 1
  - text: 'The Adjustment: if the sauce is too thick, splash more pasta water; if it''s broken/grainy, more water + harder tossing rebuilds the emulsion. Taste — pecorino brings salt and umami; if it tastes flat, more cracked pepper. No finishing acid here; the pecorino lactic tang carries.'

techniques: ['brown-butter', 'pan-emulsion']
equipment: ['microplane', 'wide-skillet']

# Modifications: pivots that change the dish's character. Render as cards
# with a kind chip ('regional' | 'dietary' | 'protein' | 'texture' | 'heat' | 'occasion').
# Each entry needs `for` (what's changing), `to` (what it becomes), `how` (the
# actual technique change). Use this for variations where the cook has to do
# something materially different, not for ingredient-for-ingredient swaps.
modifications:
  - for: 'protein'
    to: 'add 4 oz / 110g pancetta, diced'
    how: 'Render in the same pan before melting butter; pour off all but 2 tbsp / 28g rendered fat and proceed with butter. The dish is now adjacent to carbonara without the eggs.'
    kind: 'protein'
  - for: 'cuisine'
    to: 'gricia-leaning'
    how: 'Use rendered guanciale fat instead of brown butter; halve the pecorino. Lean into pork-fat aromatics over Maillard milk-solid notes.'
    kind: 'regional'

# Substitutions: 1:1 ingredient swaps where the dish stays fundamentally the same.
# If the swap requires technique or timing changes, it belongs in `modifications`.
substitutions:
  - for: 'pecorino romano'
    use: 'parmigiano reggiano'
    note: 'Less sharp, more nutty. Bump black pepper to compensate for the missing aggressive salt-tang.'
  - for: 'tonnarelli'
    use: 'bucatini'
    note: 'Different mouthfeel — the hollow holds sauce differently. Cooks ~2 min longer.'

# Optional: homemade alternatives. Surfaces as the "Make it from scratch"
# section. Each entry must point to a recipe page (full or stub).
homemade_alternatives:
  - for: 'tonnarelli or spaghetti'
    recipe_slug: 'recipes/fresh-egg-pasta'
    why: 'Fresh egg dough holds the brown butter differently — silkier mouthfeel, more starch into the sauce.'

notes: |
  The dish lives or dies on emulsion. If you skip the brown butter and pepper bloom, you have boiled pasta with cheese, not cacio e pepe.

  Why brown butter: the Maillard products in the milk solids replace the missing pancetta of carbonara as a savory anchor without adding meat.
---
```

## Frontmatter shape (ingredient)

```yaml
---
type: 'ingredient'
category: 'ingredients'
status: 'complete'
content_review: 'pending'
title: 'Pecorino romano'
desc: 'Hard sheep''s-milk cheese from Lazio. Salty, sharp, lactic.'
tags: ['dairy', 'umami', 'italian']
updated: '2026-04-26'

usda_fdc_id: 173417       # https://fdc.nal.usda.gov/fdc-app.html#/food-details/173417/nutrients

about: |
  Hard sheep's-milk cheese aged 5–8 months. Saltier and more aggressive than parmigiano (which is cow's milk). The lactic tang and salt level are why it's the canonical cheese for cacio e pepe and amatriciana.

seasonality: 'Year-round; lots produced in winter milk season have higher fat.'
storage: 'Wrap in parchment, then loose foil, in the cheese drawer. Lasts 3–4 weeks. Never plastic — it sweats.'

substitutions:
  - for: 'pecorino romano'
    use: 'parmigiano reggiano'
    note: 'Lower salt, less sharp. Add ~10% more salt.'
---
```

## Frontmatter shape (technique)

```yaml
---
type: 'technique'
category: 'techniques'
status: 'complete'
title: 'Brown butter (beurre noisette)'
desc: 'Cook butter past the foam to amber milk solids — yields hazelnut-aroma fat.'
tags: ['fat', 'maillard']
updated: '2026-04-26'

about: |
  Browning butter is a Maillard reaction on the milk-solid proteins (caseins) and lactose. As water boils off, the solids drop to the pan bottom and toast. The signal is color (amber) AND smell (hazelnut/nut-skin); pull at the first hint of nuttiness, not when it goes black.

  Use a stainless or light-colored pan so you can see the color through the foam. Non-stick masks the visual cue.
---
```

## Buying units (cans, bottles, bricks)

Some ingredients come in fixed packs that the cook buys whole — coconut milk in 400 ml cans, tomato paste in 6 oz tubes, mascarpone in 250 g tubs. Splitting them across phases by hand ("180 g cream skimmed, 360 g remainder") is internally inconsistent: the parts don't sum to a whole pack, scaling falsifies the cup conversions, and the shopping list reads as fractional grams instead of "buy 2 cans". The `pack` + `derive_from` schema fixes that.

**Pattern.** Declare one ingredient row as the buying-unit, with `id`, total `qty` in ml/g, and the `pack` annotation. Then split it into per-phase derived rows that reference the pack via `derive_from`. The build does the rest:

```yaml
ingredients:
  # Buying unit. Inherits density (1.00 g/ml) and pack size (13.5 oz / 400 ml)
  # from content/ingredients/coconut-milk.md. The shopping list shows this
  # as "2 × 13.5 oz / 400 ml can"; the mise breakdown skips it (the derived
  # rows below cover what each phase consumes).
  - id: 'coconut-milk'
    item: 'full-fat coconut milk'
    slug: 'coconut-milk'
    qty: 800
    unit: 'ml'

  - group: 'Phase 1, paste bloom'
    derive_from: 'coconut-milk'
    item: 'coconut cream, skimmed off the cans'
    qty: 180
    unit: 'g'

  - group: 'Phase 2, base'
    derive_from: 'coconut-milk'
    item: 'remaining coconut liquid'
    qty: 575
    unit: 'g'

  - group: 'Phase 3, finish'
    derive_from: 'coconut-milk'
    item: 'reserved coconut cream, off heat'
    qty: 45
    unit: 'g'
```

**Rules.**

1. Pack rows belong at the top of `ingredients[]`, before any rows that reference them.
2. The pack ingredient page (`content/ingredients/<slug>.md`) provides the canonical `density_g_per_ml` and a default `pack: { size_ml, size_label }`. The recipe row inherits those — only override on the recipe row when a specific recipe needs a different pack size.
3. Sum of derived `qty` (in grams, after density conversion) must land between 60% and 105% of the pack's total grams. The validator (`validate-formatting.mjs`) errors above 105% and warns below 60%. If the recipe genuinely uses less than 60% of the pack, lower the pack `qty` instead of leaving cans half-used.
4. Derived rows are display-only — the build skips them for nutrition and the shopping list; only the parent pack contributes.
5. When scaling, the pack count rounds up (you can't buy half a can). Derived rows scale linearly; the `<60% under-used` warning catches recipes where rounding up creates large leftovers.

**When NOT to use packs.** If an ingredient is used as a single contiguous quantity (one can, no per-phase split), skip the pack/derive machinery and write a normal row. The pack semantics earn their complexity only when an ingredient is split across phases.

## Ingredient density and verified math

Every ingredient page that has a meaningful volume↔mass relationship should declare `density_g_per_ml` from a verified source — USDA FoodData Central per-cup figures, peer-reviewed food density tables, or the brand's published nutrition panel weights. The build uses density for: (1) imperial unit display (cups → grams via density), (2) nutrition computation (volume → grams for per-100g USDA records), and (3) pack mass (pack volume × density = total grams). Density 1.0 (water-equivalent) is the silent default; explicit annotation beats default.

For piece-shaped ingredients (eggs, garlic cloves, star-anise pods), set `grams_per_unit` instead. Same rule: cite the source in the page's `about:` section so future maintenance sees the math is grounded.

## Workflow

1. `npm run draft recipe my-dish` — scaffolds `local/drafts/recipes/my-dish.md`
2. Fill in frontmatter (paste from your generator and adapt)
3. For ingredients you reference with a `slug:`, ensure `content/ingredients/<slug>.md` exists (or scaffold them too)
4. `mv local/drafts/recipes/my-dish.md content/recipes/my-dish.md`
5. `npm run build` — generates the page; admin dashboard updates
6. (optional) `npm run refresh:nutrition` — fetches USDA records for any new `usda_fdc_id`s

## Source attribution

If a recipe is adapted from a published source, fill `source.name` + `source.url`. The build renders these into the Sources block on the page. For your own original recipes, leave `source` empty.

`content_review` flips to `'verified'` only when you've made the recipe at least twice with consistent results, or you have a trusted source. Bump `updated` and (if applicable) populate `content_sources` when you flip.

## Homemade-alternatives stub template

When the user declines to fully draft a homemade alternative in the same session, create a stub page at `content/recipes/<slug>.md`. A good stub gives a future drafting session enough framing that it doesn't have to rebuild the conceptual scaffolding — premise, why-bother, the technique-shaped story.

```yaml
---
type: 'recipe'
category: 'recipes'
status: 'stub'                        # NOT 'complete' — stubs are placeholders
content_review: 'pending'

title: 'Chicken stock'                # the dish name
desc: 'A clear, gelatin-rich chicken stock — the base under every soup, braise, and risotto. Stub.'
metaDesc: 'Homemade chicken stock — clear, gelatinous, and dramatically better than store-bought. Stub recipe.'
tags: ['weekend-project', 'make-ahead', 'umami']
updated: '2026-04-26'

# Servings + time can be approximate on a stub; they exist to satisfy schema and
# give the cook orientation. Update on real draft.
servings: 8                           # ~ in cups, treat as yield
yield_note: 'about 2 L (~8 cups)'
time:
  prep_min: 15
  cook_min: 240
  total_min: 270
  active_min: 20
difficulty: 'easy'
cuisine: ''                           # leave blank when broadly applicable
course: 'stock'

# Sketch a full ingredients list at quantities you'd actually use. The point of
# a stub is that someone (you, future-you, or a draft session) can flesh out
# the prose and cook the recipe straight from this — no scaffolding work needed.
ingredients:
  - item: 'raw chicken bones (carcasses, backs, wings)'
    qty: 1500
    unit: 'g'
    note: '(~3 lb)'
  - item: 'cold water'
    qty: 3000
    unit: 'ml'
    note: '(~12 cups)'
  - item: 'yellow onion'
    qty: 1
    unit: 'each'
    prep: 'halved, skin-on'
  - item: 'carrots'
    qty: 2
    unit: 'each'
    prep: 'rough chunks'
  - item: 'celery'
    qty: 2
    unit: 'each'
    prep: 'rough chunks'
  - item: 'bay leaf'
    qty: 2
    unit: 'each'
  - item: 'black peppercorns'
    qty: 5
    unit: 'g'
    note: '(1 tsp)'

# Skeleton steps — enough that a cook can follow, but a real draft will deepen
# each step with the specific molecular/temperature reasoning.
steps:
  - text: 'Stub: rinse the bones, cover with cold water in a stockpot, bring to a bare simmer, skim off the gray scum that rises in the first 20 minutes.'
    time_min: 25
  - text: 'Stub: add aromatics (onion, carrot, celery, bay, peppercorns). Simmer at a tremor (not a boil) for 3–4 hours. Boiling emulsifies fat into the broth and clouds it; the goal is a clear, glossy liquid.'
    time_min: 220
  - text: 'Stub: strain through a fine-mesh sieve, then cheesecloth if you want it crystal. Cool quickly (ice bath or shallow pans), refrigerate. The fat layer that solidifies on top is gold — save separately.'
    time_min: 30

notes: |
  This is a stub. Flesh out: the gelatin-extraction reasoning (collagen → gelatin via slow heat), why cold-water start matters (extracts proteins gradually rather than searing them sealed), why no-boil (emulsified fat clouds the stock and tastes greasy), the difference between bones-only stock and broth (flesh-on bones), salt timing (don't salt the stock; salt the dish it goes into), freezing strategy (cubes for sauces, deli containers for soup base).
---
```

A stub at `status: 'stub'` is excluded from `data/entries.json` "complete" filters and the recently-added feed, but renders normally so the link from the calling recipe still resolves. The validator + admin dashboard will surface stubs as "unwritten" so they don't get forgotten.
