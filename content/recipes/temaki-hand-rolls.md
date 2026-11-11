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
  prep_min: 45
  cook_min: 20
  total_min: 110
  active_min: 60
difficulty: 'easy'
cuisine: 'Japanese'
course: 'dinner'
diet: ['pescatarian', 'dairy-free']

before_you_start:
  - 'Start the sushi rice first, about 80 minutes before you want to eat. It needs a 30-minute soak, cooking, a rest, and fanning to body temperature. Prep every filling while it soaks and cooks.'
  - 'Choose your menu before shopping: three or four proteins and three or four vegetables are plenty for 4 people. The proteins come in four groups (raw, marinated and cured, cooked seafood, and meat, egg, and tofu); a good spread takes one or two from at least two groups, so there is a mix of raw and cooked, rich and lean. Everything is marked optional. The protein guide and combinations in the notes tell you what each one tastes like and what to pair it with.'
  - 'Buy raw fish only from a counter that sells it explicitly as sashimi-grade (see the safety note), on the day you serve it, and keep it in the coldest part of the fridge until the table is set.'
  - 'Make the gari at least a day ahead if you are making it yourself. Store-bought is fine.'
  - 'Order the protein prep by what holds: salmon skin and teriyaki chicken can be cooked up to 2 hours ahead and served at room temperature; the zuke marinade has to be cooled before the fish goes in; raw fish is cut last and goes straight back into the fridge; shrimp tempura is fried only after everyone sits down.'
  - 'Frozen unagi needs to thaw in the fridge overnight, or in its sealed pack in cold water for 30 minutes.'
  - 'Keep the nori sealed in its bag until the moment you cut it. It absorbs humidity from the air within minutes and goes leathery.'

source:
  name: 'Adapted from Japanese home temaki-zushi practice'
  note: 'Temaki-zushi is a party format in Japanese homes: the host sets out rice, nori, and fillings, and everyone builds their own. The spread here mixes traditional fillings (tuna, yellowtail, shiso, cucumber, tamagoyaki) with the American sushi-bar additions people expect (avocado, crab with mayo, spicy mayo, mango). The notes say which is which.'

safety_notes:
  - for: 'Serving raw tuna, salmon, yellowtail, scallops, and zuke (marinated, still raw)'
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

  - group: 'Proteins A, raw fish and shellfish (sashimi-grade only)'
    item: 'tuna (yellowfin or bigeye), sashimi-grade'
    slug: 'tuna-loin'
    qty: 150
    unit: 'g'
    note: '(5 oz; lean, meaty, the most forgiving raw fish for beginners; a block cut from the loin, not a steak)'
    optional: true
  - group: 'Proteins A, raw fish and shellfish (sashimi-grade only)'
    item: 'salmon, sashimi-grade'
    qty: 150
    unit: 'g'
    note: '(5 oz; skinless, fatty and buttery; ask for the skin separately if you want crispy salmon skin)'
    optional: true
  - group: 'Proteins A, raw fish and shellfish (sashimi-grade only)'
    item: 'yellowtail (hamachi), sashimi-grade'
    qty: 150
    unit: 'g'
    note: '(5 oz; rich, clean, slightly sweet; often sold frozen in vacuum packs at Japanese markets)'
    optional: true
  - group: 'Proteins A, raw fish and shellfish (sashimi-grade only)'
    item: 'sea scallops (hotate), sashimi-grade, dry-packed'
    qty: 150
    unit: 'g'
    note: '(5 oz; about 5 large; sweet and soft; "dry-packed" means no phosphate soak, which tastes soapy raw)'
    optional: true

  - group: 'Proteins B, marinated, cured, and roe'
    item: 'Japanese soy sauce (for the zuke marinade)'
    qty: 30
    unit: 'ml'
    note: '(2 tbsp; zuke marinates the tuna or salmon from group A)'
    optional: true
  - group: 'Proteins B, marinated, cured, and roe'
    item: 'mirin (for the zuke marinade)'
    slug: 'mirin'
    qty: 15
    unit: 'ml'
    note: '(1 tbsp)'
    optional: true
  - group: 'Proteins B, marinated, cured, and roe'
    item: 'sake (for the zuke marinade)'
    slug: 'sake'
    qty: 15
    unit: 'ml'
    note: '(1 tbsp)'
    optional: true
  - group: 'Proteins B, marinated, cured, and roe'
    item: 'cold-smoked salmon (lox-style)'
    qty: 120
    unit: 'g'
    note: '(4 oz; silky and salty, zero prep; the easiest raw-feeling option)'
    optional: true
  - group: 'Proteins B, marinated, cured, and roe'
    item: 'ikura (cured salmon roe)'
    qty: 60
    unit: 'g'
    note: '(2 oz; buy soy-marinated (shoyu-ikura) or salt-cured; bursting, briny, a luxury topping)'
    optional: true

  - group: 'Proteins C, cooked seafood'
    item: 'large shrimp, peeled and deveined'
    slug: 'shrimp'
    qty: 150
    unit: 'g'
    note: '(about 10 shrimp, 26/30 count)'
    optional: true
  - group: 'Proteins C, cooked seafood'
    item: 'kosher salt (for the shrimp poaching water)'
    slug: 'kosher-salt'
    qty: 10
    unit: 'g'
    note: '(1 tbsp Diamond Crystal per 1 L water)'
    optional: true
  - group: 'Proteins C, cooked seafood'
    item: 'shrimp tempura'
    qty: 8
    unit: 'each'
    note: '(2 per person; fried from the shrimp tempura recipe right before eating)'
    optional: true
  - group: 'Proteins C, cooked seafood'
    item: 'cooked crab meat (lump blue crab or Dungeness)'
    qty: 150
    unit: 'g'
    note: '(5 oz; picked over for shell)'
    optional: true
  - group: 'Proteins C, cooked seafood'
    item: 'salmon skin'
    qty: 100
    unit: 'g'
    note: '(skin from about a 500 g fillet; many fishmongers will give it to you if you ask)'
    optional: true
  - group: 'Proteins C, cooked seafood'
    item: 'kosher salt (for the salmon skin)'
    slug: 'kosher-salt'
    qty: 1
    unit: 'g'
    note: '(¼ tsp Diamond Crystal)'
    optional: true
  - group: 'Proteins C, cooked seafood'
    item: 'unagi kabayaki (grilled eel), with its sauce packet'
    qty: 150
    unit: 'g'
    note: '(1 frozen vacuum pack from a Japanese or Korean market; sweet, smoky, rich)'
    optional: true

  - group: 'Proteins D, meat, egg, and tofu'
    item: 'boneless, skin-on chicken thighs'
    slug: 'chicken-thigh'
    qty: 300
    unit: 'g'
    note: '(2 thighs; for teriyaki chicken)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'kosher salt (for the chicken)'
    slug: 'kosher-salt'
    qty: 2
    unit: 'g'
    note: '(½ tsp Diamond Crystal)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'neutral oil (for searing the chicken)'
    slug: 'neutral-oil'
    qty: 5
    unit: 'ml'
    note: '(1 tsp)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'Japanese soy sauce (for the teriyaki glaze)'
    qty: 30
    unit: 'ml'
    note: '(2 tbsp)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'mirin (for the teriyaki glaze)'
    slug: 'mirin'
    qty: 30
    unit: 'ml'
    note: '(2 tbsp)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'sake (for the teriyaki glaze)'
    slug: 'sake'
    qty: 30
    unit: 'ml'
    note: '(2 tbsp)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'granulated sugar (for the teriyaki glaze)'
    slug: 'granulated-sugar'
    qty: 10
    unit: 'g'
    note: '(2½ tsp)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'tamagoyaki (Japanese rolled omelet)'
    qty: 150
    unit: 'g'
    note: '(1 small omelet; also sold ready-made at Japanese markets)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'inari age (seasoned fried tofu pouches)'
    slug: 'aburaage'
    qty: 80
    unit: 'g'
    note: '(about 6 pouches, canned or refrigerated; sweet-savory and juicy)'
    optional: true
  - group: 'Proteins D, meat, egg, and tofu'
    item: 'natto, with its sauce and mustard packets'
    qty: 90
    unit: 'g'
    note: '(2 small tubs; fermented soybeans, sticky and funky; a traditional Japanese favorite)'
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
    qty: 70
    unit: 'g'
    note: '(5 tbsp; 30 g for the crab, 20 g for spicy scallop, the rest for drizzling)'
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
    note: '(3 tbsp; 10 g for spicy scallop, the rest for topping)'
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
  - text: 'Prepare the scallops. Peel the small, tough side muscle off each of the 150 g scallops (it feels like a rubbery tab on the edge). Either slice each scallop horizontally into 3 coins for laying flat in the roll, or chop coarsely for spicy scallop: fold the chopped scallops with 20 g Kewpie mayonnaise and 10 g tobiko. Cover and refrigerate.'
    time_min: 4
  - text: 'Optional spicy tuna. Finely chop 75 g of the tuna batons and fold with 20 g spicy mayo and 5 g sliced scallion. Taste and add a few drops of soy if it needs more salt. Cover and refrigerate.'
    time_min: 3
  - text: 'Optional zuke (soy-marinated tuna or salmon). Bring the 15 ml mirin and 15 ml sake to a boil in a small pan for 30 seconds to cook off the alcohol, take off the heat, and stir in the 30 ml soy sauce. Cool completely (set the pan in a bowl of ice water to speed it up). Lay up to 150 g tuna or salmon batons in a shallow dish, pour the marinade over, and marinate 10 minutes, turning once. No longer: the salt starts curing the surface firm and dark. Lift out, pat dry, and refrigerate.'
    time_min: 15
  - text: 'Cured fish and roe. Tear the 120 g smoked salmon into strips about 2 cm / ¾ in wide. Keep the 60 g ikura in its container in the fridge and set it out with a small spoon at serving time.'
    time_min: 2
  - text: 'Poach the shrimp. Bring 1 L water and the 10 g kosher salt to a boil, add the 150 g shrimp, and immediately turn off the heat. Leave 3 minutes, until the shrimp are just opaque and curled into a loose C (a tight O means overcooked). Transfer to a bowl of ice water for 2 minutes, drain, pat dry, and halve each shrimp lengthwise.'
    time_min: 6
  - text: 'Crisp the salmon skin (can be done 2 hours ahead). Heat the oven to 200 °C / 400 °F. Scrape off any flesh or scales left on the 100 g salmon skin with the back of a knife and pat it very dry. Lay it flat on a parchment-lined sheet pan, sprinkle with the 1 g kosher salt, cover with a second sheet of parchment and a second sheet pan to keep it flat, and bake 15 minutes, until golden and rigid. Cool on a rack (it crisps further as it cools), then cut into strips 1 cm / ½ in wide.'
    time_min: 18
  - text: 'Warm the unagi. Heat the broiler. Lay the 150 g eel skin side down on foil, brush with half its sauce packet, and broil 2 minutes, until the sauce bubbles and the edges just char. Brush with the rest of the sauce and cut across into strips 1 cm / ½ in wide. Serve warm.'
    time_min: 5
  - text: 'Teriyaki chicken. Pat the 300 g chicken thighs dry and season with the 2 g kosher salt. Put them skin side down in a cold skillet with the 5 ml neutral oil, set over medium heat, and cook 8 minutes, pressing them flat with a spatula, until the skin is deep golden and crisp and most of the fat has rendered. Flip and cook 3 minutes more, until cooked through (80 °C / 175 °F on an instant-read thermometer). Pour off the fat, then add the 30 ml soy sauce, 30 ml mirin, 30 ml sake, and 10 g sugar. Simmer, turning the chicken, about 2 minutes, until the glaze is syrupy and coats the meat. Rest 5 minutes, then slice into strips 1 cm / ½ in wide.'
    time_min: 20
  - text: 'Prepare the remaining proteins. Fold the 150 g crab meat with 30 g Kewpie mayonnaise; it should be bound, not wet. Cut the 150 g tamagoyaki into batons about 1 cm / ½ in square. Gently squeeze the 80 g inari age to press out excess syrup and slice into strips 1 cm / ½ in wide. For natto, open the 90 g tubs, add the sauce and mustard packets, and stir vigorously with chopsticks for 30 seconds until foamy and stringy, then fold in 5 g sliced scallion.'
    time_min: 6
  - text: 'Prep the vegetables. Halve the 150 g cucumber lengthwise, scoop out any seeds with a spoon (seeds weep water onto the nori), and cut into 8 cm / 3 in matchsticks. Halve, pit, and peel the 300 g avocado, slice it 5 mm / ¼ in thick, and squeeze the juice of half the lemon over it; cut the other half of the 1 lemon into small wedges. Slice the 30 g scallions thinly on a bias. Rinse and pat dry the 10 shiso leaves. Trim the roots off the 50 g kaiware. Peel the 150 g mango and cut into batons.'
    time_min: 12
  - text: 'Set the table. Arrange the fish (straight from the fridge), cooked proteins, and vegetables on platters. Pour the 80 ml soy sauce into small dipping dishes and set out the 10 g wasabi, 60 g gari, 10 g sesame seeds, remaining Kewpie and spicy mayo, 40 g tobiko, and 10 g furikake. Mix the 120 ml water and 15 ml rice vinegar in a small bowl for wetting fingertips (tezu). Bring the rice to the table with a paddle.'
    time_min: 5
  - text: 'Optional shrimp tempura, fried last. Once the table is set and everyone has started rolling, fry the 8 shrimp tempura following the shrimp tempura recipe and bring them to the table straight from the oil. Tempura goes soft within about 10 minutes, so it is the one protein you cannot make ahead.'
    time_min: 10
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
    how: 'Skip groups A and B and build the whole spread from cooked proteins: shrimp, shrimp tempura, crab, salmon skin, unagi, teriyaki chicken, tamagoyaki, and inari age. To add a seared fish, cut a 150 g skin-on salmon fillet into 2 cm / ¾ in strips, season with 1 g kosher salt, and sear in 5 ml neutral oil in a very hot skillet for 45 seconds per side so it stays rosy in the middle (or cook it through for pregnant or immunocompromised guests). Note that cold-smoked salmon and ikura are cured, not cooked.'
    kind: 'protein'
  - for: 'vegetarian'
    to: 'vegetable and egg hand rolls'
    how: 'Use inari age, natto, and tamagoyaki (made with kombu-shiitake dashi to keep it vegetarian) as the proteins, with avocado, cucumber, shiso, kaiware, and mango, plus 150 g blanched asparagus spears or sliced pickled daikon (takuan) for crunch. Season with sesame, furikake made without bonito, and spicy mayo. Inari and natto are both vegan; check that the natto sauce packet is bonito-free if that matters.'
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
  - for: 'shrimp tempura'
    recipe_slug: 'recipes/shrimp-and-vegetable-tempura'
    why: 'Frozen tempura shrimp bake up dense and bready; a cold, lumpy batter fried just before eating gives the shattering, lacy crust that makes a tempura hand roll worth it.'
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

homemade_exempt: ['rice vinegar', 'toasted nori sheets', 'Japanese soy sauce', 'wasabi', 'tobiko', 'unagi kabayaki', 'inari age', 'natto', 'ikura', 'cold-smoked salmon']

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

  Protein guide. What each one tastes like, how to handle it, and what it wants beside it.

  Tuna (maguro): lean, meaty, mild, and iron-rich. The safest first raw fish. Cut it into thick batons so you taste the texture. Wants fat or allium: avocado, Kewpie, spicy mayo, scallion. A fatty cut (chutoro or otoro) needs nothing but scallion and wasabi.

  Salmon (sake): buttery and rich, with a clean sweetness. Wants something sharp or herbal to cut the fat: shiso, lemon, kaiware, cucumber. With ikura on top it becomes oyako, "parent and child".

  Yellowtail (hamachi): richer than tuna, cleaner than salmon, with a slight sweetness. Wants scallion, kaiware, lemon, or a little wasabi. Avoid heavy sauces; they bury it.

  Scallops (hotate): very sweet and soft, almost custardy. Raw coins are best with shiso and a few grains of salt or lemon. Chopped with Kewpie and tobiko they become spicy scallop, one of the best mayo-based fillings there is.

  Zuke (soy-marinated tuna or salmon): the Edo-era sushi-shop technique. A short soak in cooked-off mirin, sake, and soy seasons the fish all the way through and firms the surface, so it needs no dipping soy. Wants shiso, scallion, and sesame. Good for anyone nervous about the texture of plain raw fish.

  Cold-smoked salmon: silky, salty, and smoky. Already seasoned, so it wants cool and fresh partners: cucumber, avocado, a squeeze of lemon, scallion, and a little Kewpie. Skip the soy.

  Ikura (salmon roe): bursting pearls of salty, briny salmon flavor. Use it as a topping, a small spoonful on top of the open end of the roll, rather than as the main filling. Best with salmon, cucumber, and shiso.

  Poached shrimp: sweet and snappy. Wants heat and creaminess: spicy mayo, avocado, mango, or tobiko for a salty pop.

  Shrimp tempura: hot, crunchy, and rich; the most popular hand roll in American sushi bars. Wants something cool and creamy against it: avocado, cucumber, spicy mayo, or the eel sauce from the unagi pack. Let the tail stick out of the top of the cone.

  Crab with Kewpie: sweet, rich, and soft. Wants crunch and freshness: cucumber, avocado, tobiko, sesame. This is the California roll.

  Crispy salmon skin: crackling, salty, and savory, like a fish chicharrón. Wants something wet and fresh to balance the crunch: cucumber, kaiware, scallion, a little Kewpie or eel sauce.

  Unagi (grilled eel): sweet, smoky, rich, and soft, glazed in a soy-sugar tare. Wants cucumber and avocado (the dragon roll pairing) and sesame. Its own sauce is the seasoning; no soy needed.

  Teriyaki chicken: savory-sweet with crisp skin. Wants Kewpie (teri-mayo is a Japanese home classic), cucumber, scallion, and shiso. Serve it warm or at room temperature.

  Tamagoyaki: sweet, savory, and soft; the kid-friendly anchor. Wants cucumber, shiso, and kaiware.

  Inari age: juicy, sweet-savory fried tofu soaked in a soy-sugar dashi. Wants cucumber, sesame, shiso, and a little gari. The best vegan protein on the table.

  Natto: sticky, savory, and funky, with a nutty, almost cheesy depth. Polarizing, but a traditional Japanese temaki favorite. Wants scallion, shiso, cucumber, and the mustard from the packet. Roll it last; the strings get everywhere.

  Combinations that work (traditional Japanese):

  Tuna and scallion (negi-maguro): tuna, a lot of sliced scallion, a dab of wasabi, dipped in soy. Simple and the best test of good fish.

  Yellowtail and scallion (negi-hama): yellowtail, scallion, kaiware, a squeeze of lemon. Clean, rich, and peppery.

  Salmon and shiso: salmon, a whole shiso leaf laid under it, cucumber, a squeeze of lemon. The shiso cuts the fat.

  Tamago and cucumber: tamagoyaki, cucumber, shiso, sesame. Sweet, crisp, and fully cooked; good for kids.

  Cucumber and sesame (kappa): cucumber, shiso, sesame, a little wasabi. The light palate cleanser between richer rolls.

  Zuke tuna and shiso: zuke tuna, shiso, scallion, sesame. Deeply seasoned; no soy needed.

  Oyako (salmon and roe): salmon, cucumber, shiso, a spoonful of ikura on top. Two textures of the same fish.

  Scallop and shiso: scallop coins, shiso, a squeeze of lemon, a pinch of flaky salt. Sweet and clean.

  Natto and scallion: natto, scallion, shiso, cucumber. The Japanese home classic.

  Inari and cucumber: inari age, cucumber, sesame, a few slices of gari. Sweet, juicy, crunchy, and vegan.

  Combinations that work (American sushi-bar style):

  Spicy tuna: spicy tuna mix, cucumber, scallion, sesame. Creamy heat with crunch.

  California: crab with Kewpie, avocado, cucumber, tobiko or sesame. Rich and sweet with a salty pop.

  Salmon avocado: salmon, avocado, kaiware, a squeeze of lemon, sesame. Lemon and sprouts keep it from going heavy.

  Shrimp and mango: shrimp, mango, avocado, a line of spicy mayo. Sweet, creamy, and hot.

  Tuna avocado: tuna, avocado, kaiware, a line of Kewpie or a dab of wasabi. Lean fish, rich fruit, peppery sprouts.

  Shrimp tempura: shrimp tempura, avocado, cucumber, spicy mayo or eel sauce. Hot and crunchy against cool and creamy.

  Spicy scallop: spicy scallop mix, cucumber, scallion. Rich, sweet, with a salty pop from the tobiko.

  Unagi avocado (dragon): unagi, avocado, cucumber, sesame. Sweet, smoky, and creamy.

  Salmon skin: crispy salmon skin, cucumber, kaiware, a little eel sauce or Kewpie. Crunch on crunch, with savory fat.

  Teri-mayo chicken: teriyaki chicken, cucumber, shiso, a line of Kewpie. The crowd-pleaser for anyone avoiding fish.

  Smoked salmon and cucumber: smoked salmon, cucumber, avocado, a squeeze of lemon, a little Kewpie. Bagel-and-lox energy, Japanese format.

  Veggie: avocado, cucumber, shiso, mango, furikake. Proof that the rice and nori carry a lot.

  Building a balanced spread. For 4 people, choose one or two proteins from at least two of the groups, so there is a mix of raw and cooked and of rich and lean. Some sets that work: tuna, salmon, and shrimp tempura (a classic sushi-bar spread); zuke tuna, scallop, and tamagoyaki (traditional); smoked salmon, crab, and teriyaki chicken (no raw fish, kid-friendly); unagi, salmon skin, and shrimp (all cooked seafood); inari, natto, and tamagoyaki (vegetarian).

  Shopping math. For 4 people, plan on about 5 rolls each: 1000 g seasoned rice (one batch of the sushi rice recipe), 10 nori sheets, about 450 g of protein total across your three or four picks (use about half the listed quantity of each if you pick more than four), and three or four vegetables at the quantities listed. Heavy eaters, or a long, lingering dinner, call for 1.5 times the rice and nori.

  Why roll at the table. Nori starts absorbing moisture from the rice the moment they touch and goes from crisp to chewy within a few minutes. Rolling and eating immediately is the whole point of temaki; pre-rolling a platter for later gives you soggy cones.
---
