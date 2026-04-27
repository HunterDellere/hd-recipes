---
type: 'recipe'
category: 'recipes'
status: 'complete'
content_review: 'pending'

title: 'Green curry pork'
desc: 'A coconut-based green curry augmented from store-bought paste with fresh lemongrass, ginger, and shrimp paste. Chinese eggplant absorbs the curry liquor; bamboo and shimeji carry the texture. Two cans of full-fat coconut milk give the dish enough lipid phase to braise without diluting with stock.'
metaDesc: 'Thai green curry with pork tenderloin, Chinese eggplant, bamboo shoots, and shimeji, augmented store-bought paste cracked in coconut cream. Serves 4.'
tags: ['weeknight', 'thai', 'pork', 'spicy', 'umami', 'stew']
updated: '2026-04-27'

servings: 4
time:
  prep_min: 15
  cook_min: 30
  total_min: 45
  active_min: 35
difficulty: 'medium'
cuisine: 'Thai'
course: 'dinner'

source:
  name: 'Adapted from Central Thai green curry tradition'
  url: ''
  note: 'Augments store-bought paste rather than pounding from scratch; doubles the coconut milk to extend the lipid phase for the eggplant braise.'

ingredients:
  # Buying unit: two 400 ml cans of full-fat coconut milk. Inherits density
  # 1.00 g/ml and pack size 13.5 oz / 400 ml from the ingredient page. The
  # cream/remainder split happens in the per-phase mise breakdown below as
  # derived rows, which the build skips for nutrition + shopping list.
  - id: 'coconut-milk'
    item: 'full-fat coconut milk'
    slug: 'coconut-milk'
    qty: 800
    unit: 'ml'
    note: 'Aroy-D or Chaokoh — two-ingredient brands only (coconut, water).'

  - group: 'Phase 1, augmented paste bloom'
    item: 'green curry paste (store-bought)'
    qty: 48
    unit: 'g'
    note: '(3 tbsp)'
  - group: 'Phase 1, augmented paste bloom'
    item: 'lemongrass, white part only, minced fine'
    qty: 15
    unit: 'g'
    note: '(1 stalk)'
  - group: 'Phase 1, augmented paste bloom'
    item: 'fresh ginger, grated'
    slug: 'ginger'
    qty: 5
    unit: 'g'
    note: '(1 tsp)'
  - group: 'Phase 1, augmented paste bloom'
    item: 'shrimp paste (kapi)'
    qty: 6
    unit: 'g'
    note: '(1 tsp)'
  - group: 'Phase 1, augmented paste bloom'
    derive_from: 'coconut-milk'
    item: 'coconut cream, skimmed off the cans'
    qty: 180
    unit: 'g'
    note: '(¾ cup, the thick layer at the top of each can)'
  - group: 'Phase 1, augmented paste bloom'
    item: 'kosher salt'
    qty: 1
    unit: 'g'
    note: '(small pinch)'

  - group: 'Phase 2, base & eggplant'
    derive_from: 'coconut-milk'
    item: 'remaining coconut liquid'
    qty: 575
    unit: 'g'
    note: '(everything left in the cans after skimming, ~2¼ cups)'
  - group: 'Phase 2, base & eggplant'
    item: 'fish sauce'
    qty: 15
    unit: 'g'
    note: '(1 tbsp)'
  - group: 'Phase 2, base & eggplant'
    item: 'makrut lime leaves, bruised'
    qty: 3
    unit: 'g'
    note: '(4 leaves)'
  - group: 'Phase 2, base & eggplant'
    item: 'fresh galangal, one coin'
    qty: 5
    unit: 'g'
    note: '(1 slice)'
  - group: 'Phase 2, base & eggplant'
    item: 'Chinese eggplant, cut in 1-inch oblique chunks'
    qty: 300
    unit: 'g'
    note: '(2 medium)'

  - group: 'Phase 3, vegetables & pork'
    item: 'bamboo shoots, drained and rinsed'
    qty: 150
    unit: 'g'
    note: '(1 cup)'
  - group: 'Phase 3, vegetables & pork'
    item: 'shimeji mushrooms, trimmed into small clusters'
    qty: 100
    unit: 'g'
    note: '(1 package)'
  - group: 'Phase 3, vegetables & pork'
    item: 'pork tenderloin, sliced thin against the grain'
    qty: 450
    unit: 'g'
    note: '(1 lb)'
  - group: 'Phase 3, vegetables & pork'
    item: 'kosher salt'
    qty: 1.5
    unit: 'g'
    note: '(¼ tsp)'
  - group: 'Phase 3, vegetables & pork'
    derive_from: 'coconut-milk'
    item: 'reserved coconut cream, off heat'
    qty: 45
    unit: 'g'
    note: '(3 tbsp set aside before Phase 1)'
  - group: 'Phase 3, vegetables & pork'
    item: 'Thai basil leaves'
    qty: 10
    unit: 'g'
    note: '(small handful)'

  - group: 'Phase 4, acid & finish'
    item: 'fresh lime juice'
    qty: 22
    unit: 'g'
    note: '(1.5 tbsp)'
  - group: 'Phase 4, acid & finish'
    item: 'palm sugar (or light brown sugar)'
    qty: 4
    unit: 'g'
    note: '(1 tsp)'
  - group: 'Phase 4, acid & finish'
    item: 'fresh Thai chiles, sliced'
    qty: 5
    unit: 'g'
    note: '(1 to 2 chiles)'
  - group: 'Phase 4, acid & finish'
    item: 'jasmine rice, cooked'
    qty: 600
    unit: 'g'
    note: '(as base, ~3 cups cooked)'

steps:
  - text: 'Combine green curry paste, minced lemongrass, grated ginger, and shrimp paste in a small bowl. Work together with the back of a spoon until fully integrated. You are pre-augmenting the paste so the bloom step extracts everything at once.'
    time_min: 3
  - text: 'Open both cans of full-fat coconut milk without shaking. Skim the thick cream from the top of each (about ¾ cup / 180g total) into a wide skillet or wok. Reserve the remaining liquid coconut milk and a final 3 tbsp / 45g of cream separately for the off-heat finish.'
    time_min: 3
  - text: 'Set the skillet over medium-high heat. Cook the cream until the fat splits and the surface shimmers with clear oil, 3 to 4 minutes. This is the canonical "cracking the cream" step: you need the oil released before the paste goes in or it will steam rather than fry.'
    time_min: 4
  - text: 'Add the augmented paste. Fry hard, pressing, folding, scraping the pan floor, for 3 to 4 full minutes until the paste darkens one shade and the surrounding oil runs green-tinged and clear. Season with a small pinch of kosher salt. Under-frying here is the single biggest reason home green curries taste flat.'
    time_min: 4
  - text: 'Pour in everything left in the cans (about 2¼ cups / 575g — the watery serum plus any cream you did not skim) and the fish sauce. Stir hard to lift the paste off the pan floor and integrate. Add the bruised makrut lime leaves and the galangal coin.'
    time_min: 1
  - text: 'Add the eggplant. Bring to a low, steady simmer at about 190°F (88°C). The doubled coconut volume means a hard boil at this fat-to-water ratio will permanently break the emulsion into greasy pools. Poach the eggplant 8 to 10 minutes until fully tender and curry-stained throughout.'
    time_min: 10
  - text: 'Add the bamboo shoots and shimeji clusters. Slice the pork thin against the grain, season with ¼ tsp / 1.5g kosher salt, and temper by spooning hot curry liquid over it before adding to the pan. Tempering prevents thermal shock and tightening.'
    time_min: 2
  - text: 'Add the pork. Cook 4 to 5 minutes to 145°F (63°C) internal, then pull from heat immediately. Pork tenderloin past 150°F goes tight and chalky.'
    time_min: 5
  - text: 'Off heat, stir in the reserved 3 tbsp / 45g coconut cream to restore body and silk; the cream gels back the emulsion that the simmer thinned. Fold in most of the Thai basil; the residual heat will release its anise compounds without bruising the leaves.'
    time_min: 1
  - text: 'Squeeze in the lime juice and stir in the palm sugar. Taste as a complete system. With two cans of coconut milk the base reads richer and slightly sweeter than a one-can curry; calibrate fish sauce in ¼ tsp increments and lime in ½ tbsp increments until salty, sour, sweet, and spicy land in proportion. Scatter sliced Thai chiles and remaining Thai basil over the top. Serve immediately over jasmine rice.'
    time_min: 2
  - text: 'The Adjustment: if the curry reads thin from the additional coconut volume, simmer uncovered an extra 5 minutes before adding the pork to reduce. If flat, fish sauce in ¼ tsp increments before reaching for more lime. If too rich or heavy, lime, not fish sauce. If pork reads tight, you overshot 145°F; slice thinner next time and pull at the first sign of opacity.'

equipment: ['wide-skillet', 'wok']

substitutions:
  - for: 'pork tenderloin'
    use: 'bone-in chicken thighs, skin removed'
    note: 'Differentiated pivot. Add in Phase 2 alongside the eggplant and extend the simmer to 25 minutes. Chicken thigh collagen partially hydrates into the curry, adding body that complements the doubled coconut volume.'
  - for: 'shrimp paste + fish sauce + pork (vegetarian)'
    use: 'white miso (1 tsp / 6g) + soy sauce (1 tbsp / 15g) + pressed extra-firm tofu, seared golden'
    note: 'Replaces the salt-funk axis. Sear tofu before adding in Phase 3 alongside bamboo and shimeji. Reduce fish-sauce-equivalent (soy) to 2 tsp / 10g if combining with miso to avoid over-salting.'
  - for: 'Chinese eggplant'
    use: 'Thai pea eggplant or Thai apple eggplant'
    note: 'Closer to the canonical Central Thai version. Pea eggplants stay firm and pop; apple eggplants quarter and braise. Either is more textural than Chinese eggplant.'
  - for: 'fresh galangal'
    use: 'frozen galangal'
    note: 'Frozen is acceptable and standard outside Thailand. Do not substitute ginger. Galangal is piney and citrusy where ginger is warm and pungent; the dish reads wrong.'

homemade_alternatives:
  - for: 'green curry paste (store-bought)'
    recipe_slug: 'recipes/thai-green-curry-paste'
    why: 'A pounded-fresh paste in a stone mortar releases oils and integrates aromatics in a way no jarred paste matches. The augmentation step in this recipe is a workaround; from-scratch paste eliminates the need for it entirely.'

homemade_exempt:
  - 'coconut milk'

notes: |
  Why two cans of coconut milk: the doubled lipid phase carries fat-soluble aromatic compounds (the terpenes from lemongrass and galangal, the capsaicinoids from chili, the indole and methyl chavicol from Thai basil) more thoroughly through the dish. The tradeoff is emulsion stability. At this fat-to-water ratio a hard boil drives permanent separation. Hold at a low simmer (around 190°F / 88°C) and the emulsion stays intact and silky rather than oily.

  On coconut milk and homemade alternatives: there is no reasonable home version. Coconut milk requires fresh mature coconut flesh and a press to extract the cream; outside the tropics, canned full-fat coconut milk from a brand with two ingredients (coconut, water) is the working standard. Quality matters more than provenance here; Aroy-D and Chaokoh are the canonical labels.

  Why augment store-bought paste: jarred green curry pastes are typically under-aromatic and short on shrimp paste. Adding fresh lemongrass, ginger, and a teaspoon of kapi reconstructs what the jar lost in pasteurization and shelf life. If you can pound your own paste, do that instead; the augmentation step exists to bring jarred paste up to spec.

  Why eggplant goes early, mushrooms and bamboo go late: eggplant needs full hydration in the curry to lose its raw spongy texture and absorb the surrounding liquid. Shimeji and bamboo are at their best with structural integrity preserved. Break shimeji into clusters rather than individual stems and add late so the cell walls do not fully collapse.

  Why temper the pork: dropping cold raw pork into hot curry causes the surface proteins to seize and tighten before the interior catches up. Spooning a few tablespoons of hot curry over the sliced pork brings it to a near-cooking temperature gradually so the muscle fibers stay relaxed when it hits the pan.

  Why finish with reserved coconut cream off heat: simmering thins the emulsion as some of the cream's fat globules coalesce and rise. A final cold-cream addition off heat reseats the emulsion and gives the surface that glossy, silky read that defines a finished Thai curry.
---
