# hd · recipes

Personal recipe library. Static site, markdown content, Node build pipeline.

- Every recipe scales (client-side).
- Recipes ↔ ingredients ↔ techniques are crosslinked.
- Macros and micros come from USDA FoodData Central (free, validated, cached).
- Shopping list export to clipboard.
- Admin dashboard at `/pages/_admin/review.html` for managing review state.

## Quickstart

```bash
npm install
npm run build
python3 -m http.server 8080
```

## Add a recipe

```bash
npm run draft recipe my-slug
# edit local/drafts/recipes/my-slug.md (see templates/_drafting/RECIPE.md)
mv local/drafts/recipes/my-slug.md content/recipes/
npm run build
```

## Refresh nutrition data

Get a free USDA API key at https://fdc.nal.usda.gov/api-key-signup.html, then:

```bash
USDA_API_KEY=... npm run refresh:nutrition
```

This fetches new USDA records into `data/_reference/usda-cache.json`. The build never hits the network on its own.

## Verify before pushing

```bash
npm run verify
```

## Architecture

See `CLAUDE.md` and `templates/_drafting/RECIPE.md`.
