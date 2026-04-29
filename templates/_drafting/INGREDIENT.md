# Ingredient drafting spec — hd-recipes

This document is the authoring guide for `content/ingredients/<slug>.md`.
Recipes have their own spec in `RECIPE.md`; this is the parallel spec for
single-ingredient pages, which behave differently from a recipe page in voice
and framing.

## What an ingredient page is for

An ingredient page is a **standalone reference**. A reader may arrive there
from a recipe link, from search, from the cuisines hub, or from another
ingredient page. They are not necessarily on the way to a specific dish, and
they do not need to be. The page has to make sense to a cook who has never
seen any recipe on this site.

This is the central rule, and most authoring failures violate it: **an
ingredient page is not the prose footnote of a recipe.** If the page reads
like an aside that fell out of a single recipe — "this is what's used in our
dandan noodles" — it is wrong. Rewrite it as if no specific recipe on the
site existed, then add recipes as examples where they help.

## Voice & approach

Same molecular-gastronomy specialist voice as recipes — clinical, technique-
driven, no Bon Appétit cheer. The differences are scope and stance:

- **Scope: the ingredient on its own terms.** Lead with chemistry, biology,
  or production — what the thing physically is, what makes it behave the way
  it behaves. Then move into how cooks deploy it: heat windows, pairings,
  failure modes, buying and storage. Recipes get cited as examples of the
  general behavior, never as the frame.
- **Stance: descriptive, not instructive.** A recipe page tells the cook
  what to do tonight. An ingredient page tells the cook what this thing is
  and what it does across the dishes that use it. Imperatives ("season at
  every stage") belong in recipes; ingredient pages explain the underlying
  reason a cook would issue that imperative.

## Frontmatter shape (ingredient)

```yaml
---
type: 'ingredient'
category: 'ingredients'
status: 'complete'                    # 'stub' | 'draft' | 'complete'
content_review: 'pending'             # 'pending' | 'verified' | 'needs-work'

title: 'Pecorino romano'              # the ingredient name
desc: 'One-line essence — what it is and what it brings.'
metaDesc: 'SEO description, ~155 chars.'
tags: ['dairy', 'umami', 'italian']
updated: '2026-04-26'

# Density and unit prefs feed scaling/conversion math. See entry.schema.json.
density_g_per_ml: 0.42                # only when measurable; defaults to 1.0
imperial_pref: 'cup'                  # cook's idiomatic unit for this thing
grams_per_unit: 4                     # for piece-counted things (cloves, eggs, pods)

# USDA FoodData Central record for nutrition. Look up at https://fdc.nal.usda.gov/
# A proxy is acceptable for items with no exact match — leave a comment.
usda_fdc_id: 171249                   # optional, but enables nutrition

about: |
  Two to four short paragraphs. Chemistry and behavior first, deployment
  second, buying and brand notes third. Recipes cited as examples, not framing.

seasonality: 'Year-round; lots from winter milk are richer.'  # optional
storage: 'How to store, how long it keeps, the failure mode and the smell or look that signals it.'

substitutions:
  - for: '<the use case being substituted>'
    use: '<what to use instead>'
    note: '<one or two sentences on tradeoffs>'
---
```

## The `about` section — structure that travels

Most ingredient pages benefit from this rough order, in plain prose (no
headings inside `about`). Pick the ones that apply; skip the ones that don't.

1. **What it physically is.** Species, cultivar, cut, percentage of fat or
   protein, pH, key compound. The single sentence that anchors everything
   downstream.
2. **What it does in cooking generally.** The functional role — leaven,
   emulsifier, glutamate source, finishing acid, structural fat, aromatic
   bridge. Use chemistry to explain *why* it does that role.
3. **How heat / time / cutting changes it.** The transformation curves and
   inflection points. "Holds an emulsion below 88 °C, breaks at a hard boil."
   "Allicin forms only after cell damage; degrades in 30 seconds of sweating."
4. **Where it fits in dishes.** Categories of application — braises,
   batters, dressings, finishers — with one or two specific dishes named
   as examples. Examples should span at least two contexts when possible.
   A single named dish is a hint that the page is too narrowly framed.
5. **Buying notes.** Brands, grades, marks, what to avoid, what counterfeit
   or downgraded versions look like.
6. **The common Western drift, if relevant.** What gets substituted in by
   default and what's lost in that swap.

## The `substitutions` section — by use case, not by recipe

This is the section that most often reads recipe-bound. The fix is a small
discipline: **the `for:` field names the use case the substitution is for,
not the recipe it would appear in.** When the ingredient does only one job,
the `for:` field is just the ingredient name. When it does several, each
job gets its own row.

Bad (recipe-bound):

```yaml
substitutions:
  - for: 'Chinese sesame paste'
    use: 'tahini + 1 tsp toasted sesame oil per 3 tbsp tahini'
    note: '...'
  - for: 'Chinese sesame paste'
    use: 'natural peanut butter'
    note: 'Different ingredient but works in dandan-style sauces. Pick unsweetened.'
```

The second row hangs on a recipe (dandan) without the reader knowing why
that's the relevant context for peanut butter. Rewrite as use cases:

Good (use-case framed):

```yaml
substitutions:
  - for: 'Chinese sesame paste (cold sesame sauces, dressings)'
    use: 'tahini + 1 tsp toasted sesame oil per 3 tbsp tahini'
    note: 'The sesame oil compensates for the missing toast depth.'
  - for: 'Chinese sesame paste (rich, savory noodle sauces)'
    use: 'unsweetened natural peanut butter'
    note: 'Different ingredient; works when the sauce is already heavy on chili and aromatics that mask the swap. Wrong for delicate cold sesame applications.'
```

Use cases worth naming when they apply: `cooking | finishing`,
`high heat | low heat`, `whipping | sauce | bake`, `raw | cooked`,
`bright accent | background depth`, `structure | flavor only`. When the
ingredient genuinely has only one use, the bare ingredient name is fine.

## Optional sections

These are not in every page; add when the ingredient warrants them.

- **`seasonality`** — for produce, dairy from grass-fed seasons, anything
  with a peak window.
- **`storage`** — almost always present. Name the spoilage mode and what it
  smells or looks like, not just the duration.
- **`pack`** — for canned/bottled ingredients. Sets the default purchase
  unit so the shopping list rolls up cleanly.

## Photos

Same convention as recipes:

```
content/images/ingredients/<slug>/hero.jpg
```

A hero is optional. Most pantry ingredients don't need one — the page works
on prose alone. Add a hero when the visual carries information (variety
identification, color comparison, cross-section).

## Stub template

For ingredients you know belong on the site but haven't fully drafted:

```yaml
---
type: 'ingredient'
category: 'ingredients'
status: 'stub'
content_review: 'pending'

title: '<name>'
desc: '<one sentence>'
tags: []
updated: '<today>'

about: |
  Stub: chemistry, role in cooking, heat behavior, and buying notes pending.
  Used in <recipe slug, recipe slug> so far.
---
```

A stub is acceptable as a link target. It is not acceptable as a page that
ships in a "what to read" surface. Promote to `draft` once a real `about`
exists, and to `complete` after the substitutions and storage sections are
populated and the validator is clean.
