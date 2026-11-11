---
type: 'recipe'
category: 'recipes'
status: 'complete'
content_review: 'pending'

title: 'Temaki (hand rolls)'
desc: 'A make-your-own sushi night: a bowl of warm seasoned sushi rice, crisp half-sheets of nori, and a spread of fish, cooked proteins, vegetables, and sauces that everyone rolls into cones at the table. Pick three proteins and three or four vegetables from the menu below; the notes give tested combinations and the pairing logic so you can improvise.'
metaDesc: 'Temaki hand rolls for an at-home sushi night: how much rice and nori per person, how to cut fish, a full filling and topping menu, and the combinations that work.'
tags: ['japanese', 'fish', 'seafood', 'rice', 'share-plate', 'wrap']
updated: '2026-11-11'

servings: 4
yield_note: 'about 20 hand rolls, 5 per person; scale up for big eaters'
time:
  prep_min: 40
  cook_min: 5
  total_min: 100
  active_min: 45
difficulty: 'easy'
cuisine: 'Japanese'
course: 'dinner'
diet: ['pescatarian', 'dairy-free']

before_you_start:
  - 'Start the sushi rice first, about 80 minutes before you want to eat. It needs a 30-minute soak, cooking, a rest, and fanning to body temperature. Prep every filling while it soaks and cooks.'
  - 'Choose your menu before shopping: three proteins and three or four vegetables are plenty for 4 people. Every protein and vegetable below is marked optional; the quantities assume you pick about that many. See the notes for combinations that work.'
  - 'Buy raw fish only from a counter that sells it explicitly as sashimi-grade (see the safety note), on the day you serve it, and keep it in the coldest part of the fridge until the table is set.'
  - 'Make the gari at least a day ahead if you are making it yourself. Store-bought is fine.'
  - 'Keep the nori sealed in its bag until the moment you cut it. It absorbs humidity from the air within minutes and goes leathery.'

source:
  name: 'Adapted from Japanese home temaki-zushi practice'
  note: 'Temaki-zushi is a party format in Japanese homes: the host sets out rice, nori, and fillings, and everyone builds their own. The spread here mixes traditional fillings (tuna, yellowtail, shiso, cucumber, tamagoyaki) with the American sushi-bar additions people expect (avocado, crab with mayo, spicy mayo, mango). The notes say which is which.'

safety_notes:
  - for: 'Serving raw tuna, salmon, and yellowtail'
    ref: 'safety/seafood-doneness#parasites-when-raw-fish-needs-to-be-frozen-first'
    why: '"Sushi-grade" is not a regulated term. Buy salmon and yellowtail from a fishmonger who can confirm it was frozen for parasite control or is parasite-free farmed fish; large tuna species are exempt. An ordinary grocery-store salmon fillet is not safe to eat raw however fresh it looks. Vulnerable diners (pregnant, immunocompromised) should stick to the cooked proteins.'
  - for: 'Raw tuna and yellowtail cold chain'
    ref: 'safety/seafood-doneness#scombroid-histamine-the-toxin-no-temperature-fixes'
    why: 'Tuna and yellowtail build up histamine if held warm, and no amount of freshness after the fact undoes it. Keep the fish refrigerated until the table is set, and put leftovers back in the fridge within 2 hours.'

ingredients:
  - group: 'The base'
    item: 'sushi rice, freshly made and held at body temperature'
    qty: 1000
    unit: 'g'
    note: '(1 batch of the sushi rice recipe; about 50 g per roll)'
  - group: 'The base'
    item: 'toasted nori sheets (yaki-nori)'
    slug: 'nori'
    qty: 10
    unit: 'each'
    note: '(full 19 × 21 cm sheets, halved to make 20 rolls)'
  - group: 'The base'
    item: 'water (for tezu hand water)'
    slug: 'water'
    qty: 120
    unit: 'ml'
    note: '(½ cup)'
  - group: 'The base'
    item: 'rice vinegar (for tezu hand water)'
    slug: 'rice-vinegar'
    qty: 15
    unit: 'ml'
    note: '(1 tbsp)'

  - group: 'Raw fish (pick 1 to 3; sashimi-grade only)'
    item: 'tuna (yellowfin or bigeye), sashimi-grade'
    slug: 'tuna-loin'
    qty: 150
    unit: 'g'
    note: '(5 oz; lean, meaty, the most forgiving raw fish for beginners)'
    optional: true
  - group: 'Raw fish (pick 1 to 3; sashimi-grade only)'
    item: 'salmon, sashimi-grade'
    qty: 150
    unit: 'g'
    note: '(5 oz; skinless, fatty and buttery)'
    optional: true
  - group: 'Raw fish (pick 1 to 3; sashimi-grade only)'
    item: 'yellowtail (hamachi), sashimi-grade'
    qty: 150
    unit: 'g'
    note: '(5 oz; rich, clean, slightly sweet; often sold frozen in vacuum packs at Japanese markets)'
    optional: true

  - group: 'Cooked proteins (pick 1 to 3)'
    item: 'large shrimp, peeled and deveined'
    slug: 'shrimp'
    qty: 150
    unit: 'g'
    note: '(about 10 shrimp, 26/30 count)'
    optional: true
  - group: 'Cooked proteins (pick 1 to 3)'
    item: 'kosher salt (for the shrimp poaching water)'
    slug: 'kosher-salt'
    qty: 10
    unit: 'g'
    note: '(1 tbsp Diamond Crystal per 1 L water)'
    optional: true
  - group: 'Cooked proteins (pick 1 to 3)'
    item: 'cooked crab meat (lump blue crab or Dungeness)'
    qty: 150
    unit: 'g'
    note: '(5 oz; picked over for shell)'
    optional: true
  - group: 'Cooked proteins (pick 1 to 3)'
    item: 'tamagoyaki (Japanese rolled omelet)'
    qty: 150
    unit: 'g'
    note: '(1 small omelet; also sold ready-made at Japanese markets)'
    optional: true

  - group: 'Vegetables, herbs, and fruit (pick 3 or 4)'
    item: 'Japanese or Persian cucumber'
    slug: 'cucumber'
    qty: 150
    unit: 'g'
    note: '(1 Japanese or 2 Persian; thin skin, few seeds)'
    optional: true
  - group: 'Vegetables, herbs, and fruit (pick 3 or 4)'
    item: 'ripe Hass avocado'
    slug: 'avocado'
    qty: 300
    unit: 'g'
    note: '(2 medium; yields to gentle pressure)'
    optional: true
  - group: 'Vegetables, herbs, and fruit (pick 3 or 4)'
    item: 'lemon'
    slug: 'lemon'
    qty: 1
    unit: 'each'
    note: '(half to keep avocado green, half cut into wedges for salmon and yellowtail)'
    optional: true
  - group: 'Vegetables, herbs, and fruit (pick 3 or 4)'
    item: 'scallions'
    slug: 'scallion'
    qty: 30
    unit: 'g'
    note: '(3 or 4 scallions)'
    optional: true
  - group: 'Vegetables, herbs, and fruit (pick 3 or 4)'
    item: 'shiso leaves'
    qty: 10
    unit: 'each'
    note: '(green perilla; minty, citrusy, the classic sushi herb; at Japanese and Korean markets)'
    optional: true
  - group: 'Vegetables, herbs, and fruit (pick 3 or 4)'
    item: 'kaiware (daikon radish sprouts)'
    qty: 50
    unit: 'g'
    note: '(1 clamshell; peppery crunch)'
    optional: true
  - group: 'Vegetables, herbs, and fruit (pick 3 or 4)'
    item: 'ripe mango'
    slug: 'mango'
    qty: 150
    unit: 'g'
    note: '(1 small Ataulfo or half a large mango; American sushi-bar style)'
    optional: true

  - group: 'Sauces and toppings for the table'
    item: 'Japanese soy sauce (koikuchi shoyu)'
    qty: 80
    unit: 'ml'
    note: '(⅓ cup; Kikkoman or Yamasa; for dipping)'
  - group: 'Sauces and toppings for the table'
    item: 'wasabi'
    qty: 10
    unit: 'g'
    note: '(2 tsp; freshly grated hon-wasabi if you can find it, otherwise powdered wasabi mixed with water)'
  - group: 'Sauces and toppings for the table'
    item: 'pickled ginger (gari)'
    qty: 60
    unit: 'g'
    note: '(¼ cup; eaten between rolls, not in them)'
  - group: 'Sauces and toppings for the table'
    item: 'toasted sesame seeds'
    slug: 'sesame-seeds'
    qty: 10
    unit: 'g'
    note: '(1 tbsp)'
  - group: 'Sauces and toppings for the table'
    item: 'Kewpie mayonnaise'
    slug: 'mayonnaise'
    qty: 40
    unit: 'g'
    note: '(3 tbsp; 30 g for the crab, the rest for drizzling)'
    optional: true
  - group: 'Sauces and toppings for the table'
    item: 'spicy mayo (sriracha mayo)'
    qty: 80
    unit: 'g'
    note: '(⅓ cup; 20 g for spicy tuna, the rest for drizzling)'
    optional: true
  - group: 'Sauces and toppings for the table'
    item: 'tobiko (flying fish roe)'
    qty: 40
    unit: 'g'
    note: '(3 tbsp; salty, briny pop)'
    optional: true
  - group: 'Sauces and toppings for the table'
    item: 'furikake'
    qty: 10
    unit: 'g'
    note: '(1 tbsp)'
    optional: true

steps:
  - text: 'Make the rice first. Start 1000 g of sushi rice about 80 minutes before you plan to eat (see the sushi rice recipe). Once it is seasoned and fanned to body temperature, keep it covered with a damp towel on the counter. Everything below happens while it soaks and cooks.'
    time_min: 80
  - text: 'Cut the raw fish. Keep the fish in the fridge until the moment you cut it. Pat the 150 g tuna, 150 g salmon, and 150 g yellowtail (whichever you chose) dry with paper towels. With your sharpest, longest knife, cut each into batons about 1 cm / ½ in square and 8 cm / 3 in long, using one long drawing stroke per cut instead of sawing; sawing tears the muscle and leaves ragged, mushy edges. Lay the batons on a chilled plate, cover, and refrigerate.'
    time_min: 10
  - text: 'Optional spicy tuna. Finely chop 75 g of the tuna batons and fold with 20 g spicy mayo and 5 g sliced scallion. Taste and add a few drops of soy if it needs more salt. Cover and refrigerate.'
    time_min: 3
  - text: 'Poach the shrimp. Bring 1 L water and the 10 g kosher salt to a boil, add the 150 g shrimp, and immediately turn off the heat. Leave 3 minutes, until the shrimp are just opaque and curled into a loose C (a tight O means overcooked). Transfer to a bowl of ice water for 2 minutes, drain, pat dry, and halve each shrimp lengthwise.'
    time_min: 6
  - text: 'Prepare the other cooked proteins. Fold the 150 g crab meat with 30 g Kewpie mayonnaise; it should be bound, not wet. Cut the 150 g tamagoyaki into batons about 1 cm / ½ in square.'
    time_min: 4
  - text: 'Prep the vegetables. Halve the 150 g cucumber lengthwise, scoop out any seeds with a spoon (seeds weep water onto the nori), and cut into 8 cm / 3 in matchsticks. Halve, pit, and peel the 300 g avocado, slice it 5 mm / ¼ in thick, and squeeze the juice of half the lemon over it; cut the other half of the 1 lemon into small wedges. Slice the 30 g scallions thinly on a bias. Rinse and pat dry the 10 shiso leaves. Trim the roots off the 50 g kaiware. Peel the 150 g mango and cut into batons.'
    time_min: 12
  - text: 'Set the table. Arrange the fish (straight from the fridge), cooked proteins, and vegetables on platters. Pour the 80 ml soy sauce into small dipping dishes and set out the 10 g wasabi, 60 g gari, 10 g sesame seeds, remaining Kewpie and spicy mayo, 40 g tobiko, and 10 g furikake. Mix the 120 ml water and 15 ml rice vinegar in a small bowl for wetting fingertips (tezu). Bring the rice to the table with a paddle.'
    time_min: 5
  - text: 'Cut the nori at the table. Cut each of the 10 nori sheets in half, parallel to the longer side, to give 20 rectangles about 10 × 19 cm / 4 × 7½ in. Keep the cut halves in the bag. If the nori feels soft rather than snapping, pass each sheet quickly over a gas flame or an electric burner on high for 5 seconds per side until it shifts to a brighter green and crisps.'
    time_min: 2
  - text: 'Roll a hand roll. Hold a nori half in a dry left hand, rough side up, long side running left to right. Dip your right fingertips in the tezu, then take about 50 g / a golf-ball-size portion of rice and spread it lightly over the left third of the nori, a thin layer you can see nori through in places; do not press it into a paste. Optional: dab a little wasabi along the rice. Lay 2 to 4 fillings diagonally across the rice, from the top-left corner down toward the bottom-center, letting the ends stick out of the top. Fold the bottom-left corner of the nori up over the fillings toward the top-center to start a cone, then keep rolling the cone to the right until the nori wraps around. Press a crushed grain of rice under the loose edge to seal.'
    time_min: 1
  - text: 'Eat it immediately, within about a minute, while the nori is still crisp. To season, dip the filling end in soy sauce rather than the rice, which falls apart and over-salts when soaked. Eat a slice of gari between rolls to reset your palate.'

techniques: []
equipment: []

modifications:
  - for: 'no raw fish'
    to: 'fully cooked spread'
    how: 'Skip the raw fish and pick three from shrimp, crab, tamagoyaki, and seared salmon. To sear salmon, cut a 150 g skin-on fillet into 2 cm / ¾ in strips, season with 1 g kosher salt, and sear in 5 ml neutral oil in a very hot skillet for 45 seconds per side so it stays rosy in the middle (or cook through for vulnerable diners). Cool slightly before rolling. Smoked salmon (cold-smoked lox) also works and needs no cooking.'
    kind: 'protein'
  - for: 'vegetarian'
    to: 'vegetable and egg hand rolls'
    how: 'Build the spread around tamagoyaki (make it with kombu-shiitake dashi to keep it vegetarian), avocado, cucumber, shiso, kaiware, and mango, plus 150 g blanched asparagus spears or sliced pickled daikon (takuan) for crunch. Season with sesame, furikake made without bonito, and spicy mayo.'
    kind: 'dietary'
  - for: 'format'
    to: 'chirashi bowls for leftovers or a smaller crowd'
    how: 'Skip rolling. Spoon 200 g sushi rice into each bowl, scatter strips of nori over it, and arrange the fish, vegetables, and toppings over the top. Season with soy sauce and wasabi mixed together and drizzled on. Same ingredients, half the work.'
    kind: 'occasion'

substitutions:
  - for: 'shiso leaves'
    use: 'Thai basil or a few mint leaves with a little cilantro'
    note: 'Nothing matches shiso exactly; this combination gets you the minty, citrusy lift that cuts fatty fish.'
  - for: 'kaiware (daikon radish sprouts)'
    use: 'radish microgreens or thinly sliced radish'
    note: 'Same peppery crunch.'
  - for: 'yellowtail (hamachi)'
    use: 'sashimi-grade scallops or albacore'
    note: 'Scallops are sweet and soft, good with tobiko and Kewpie; albacore is mild and pairs like yellowtail.'
  - for: 'Japanese soy sauce (koikuchi shoyu)'
    use: 'tamari'
    note: 'For gluten-free guests; most tamari is wheat-free. Slightly richer and thicker.'
  - for: 'cooked crab meat'
    use: 'imitation crab (kani kama)'
    note: 'The classic California-roll filling at many restaurants. Shred it by hand and fold with the same 30 g Kewpie.'

homemade_alternatives:
  - for: 'sushi rice'
    recipe_slug: 'recipes/sushi-rice'
    why: 'The rice is half of every bite; properly washed, seasoned, and fanned rice is what separates a good hand roll from a sad one.'
  - for: 'pickled ginger (gari)'
    recipe_slug: 'recipes/gari-pickled-ginger'
    why: 'Homemade gari from young ginger is crisp, naturally pink, and far less sugary than the dyed jarred kind.'
  - for: 'tamagoyaki (Japanese rolled omelet)'
    recipe_slug: 'recipes/tamagoyaki'
    why: 'A fresh dashi omelet is softer and more savory than the sweet, rubbery packaged blocks.'
  - for: 'Kewpie mayonnaise'
    recipe_slug: 'recipes/homemade-mayonnaise'
    why: 'Made with rice vinegar and a pinch of MSG, the Kewpie-style variant gives you the same rich, savory mayo.'
  - for: 'spicy mayo (sriracha mayo)'
    recipe_slug: 'recipes/sriracha-mayo'
    why: 'A 3-minute stir-together that tastes brighter than bottled versions, and you control the heat.'
  - for: 'furikake'
    recipe_slug: 'recipes/furikake'
    why: 'Uses up spent kombu and bonito from dashi and is far more savory than the shaker-jar version.'

homemade_exempt: ['rice vinegar', 'toasted nori sheets', 'Japanese soy sauce', 'wasabi', 'tobiko']

pairings:
  - recipe: 'recipes/sushi-rice'
    reason: 'The rice every hand roll is built on; start it first.'
  - recipe: 'recipes/miso-soup'
    reason: 'A small bowl of hot miso soup is the traditional companion and balances a cold, raw spread.'
  - recipe: 'recipes/gari-pickled-ginger'
    reason: 'The palate reset between rolls, especially after rich salmon and yellowtail.'

notes: |
  How to pair fillings. A good hand roll has three things: a main protein, something crisp or fresh, and one seasoning accent. Stop at three or four components; more than that tears the nori and muddies the flavor. Within that frame, a few rules do most of the work.

  Fatty fish wants sharp and green. Salmon and yellowtail are rich, so cut them with shiso, scallion, kaiware, a squeeze of lemon, or wasabi. Avocado on top of salmon is delicious but very rich; add cucumber or lemon to keep it from going heavy.

  Lean fish wants fat. Tuna is lean and meaty, so it shines with something rich: avocado, Kewpie, spicy mayo, or sesame.

  Sweet proteins want heat or crunch. Shrimp, crab, tamagoyaki, and mango are all sweet, so pair them with spicy mayo, tobiko, cucumber, kaiware, or scallion.

  Every roll needs one crunch. Cucumber, kaiware, tobiko, sesame, or a crisp edge of nori. Without it the roll eats soft and one-note.

  Sauce lightly. Mayo-based sauces go in a thin line, not a pile. If a roll already has spicy mayo or Kewpie, it usually does not need soy.

  Combinations that work (traditional Japanese):

  Tuna and scallion (negi-maguro): tuna, a lot of sliced scallion, a dab of wasabi, dipped in soy. Simple and the best test of good fish.

  Yellowtail and scallion (negi-hama): yellowtail, scallion, kaiware, a squeeze of lemon. Clean, rich, and peppery.

  Salmon and shiso: salmon, a whole shiso leaf laid under it, cucumber, a squeeze of lemon. The shiso cuts the fat.

  Tamago and cucumber: tamagoyaki, cucumber, shiso, sesame. Sweet, crisp, and fully cooked; good for kids.

  Cucumber and sesame (kappa): cucumber, shiso, sesame, a little wasabi. The light palate cleanser between richer rolls.

  Combinations that work (American sushi-bar style):

  Spicy tuna: spicy tuna mix, cucumber, scallion, sesame. Creamy heat with crunch.

  California: crab with Kewpie, avocado, cucumber, tobiko or sesame. Rich and sweet with a salty pop.

  Salmon avocado: salmon, avocado, kaiware, a squeeze of lemon, sesame. Lemon and sprouts keep it from going heavy.

  Shrimp and mango: shrimp, mango, avocado, a line of spicy mayo. Sweet, creamy, and hot.

  Tuna avocado: tuna, avocado, kaiware, a line of Kewpie or a dab of wasabi. Lean fish, rich fruit, peppery sprouts.

  Veggie: avocado, cucumber, shiso, mango, furikake. Proof that the rice and nori carry a lot.

  Shopping math. For 4 people, plan on about 5 rolls each: 1000 g seasoned rice (one batch of the sushi rice recipe), 10 nori sheets, about 450 g of protein total across your three picks, and three or four vegetables at the quantities listed. Heavy eaters, or a long, lingering dinner, call for 1.5 times the rice and nori.

  Why roll at the table. Nori starts absorbing moisture from the rice the moment they touch and goes from crisp to chewy within a few minutes. Rolling and eating immediately is the whole point of temaki; pre-rolling a platter for later gives you soggy cones.
---
