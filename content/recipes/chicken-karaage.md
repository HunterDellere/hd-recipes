---
type: 'recipe'
category: 'recipes'
status: 'complete'
content_review: 'pending'

title: 'Chicken karaage (Japanese fried chicken)'
desc: 'Boneless chicken thighs cut into 4 cm chunks, marinated in soy sauce, sake, grated ginger, and grated garlic for 30 to 60 minutes, then double-tossed in potato starch (not flour) and double-fried in 170°C oil for an audibly shatter-crisp shell around juicy bite-sized pieces. Served with a lemon wedge and Kewpie mayo. The izakaya canonical, the bento favorite, and the case study in why double-frying produces crispier crust than single-frying.'
metaDesc: 'Japanese chicken karaage: soy-sake-ginger-garlic marinated boneless thighs, potato-starch coated, double-fried in 170°C oil to shatter-crisp. Izakaya canonical, lemon-and-Kewpie finish.'
tags: ['chicken', 'fried', 'comfort', 'weeknight']
updated: '2026-05-17'

servings: 4
yield_note: 'serves 4 as an appetizer or 3 as a main with rice and salad'
time:
  prep_min: 15
  cook_min: 20
  total_min: 75
  active_min: 30
difficulty: 'easy'
cuisine: 'Japanese'
course: 'appetizer'
diet: ['dairy-free']

source:
  name: 'Japanese izakaya and home tradition'
  note: 'Karaage (唐揚げ, literally "Chinese-style frying") is the canonical Japanese fried chicken, distinct from American Southern fried chicken in cut (boneless bite pieces vs. bone-in pieces), coating (potato starch vs. seasoned flour), and marinade (soy-sake-ginger-garlic vs. buttermilk brine). The dish is izakaya menu standard, bento box ubiquitous, and home cooking common throughout Japan. Tatsuta-age is a closely related dish with the same marinade but coated in potato starch only and producing a slightly different texture; the line between karaage and tatsuta-age is blurry.'

safety_notes:
  - for: 'pulling chicken thighs at internal 75°C / 167°F'
    ref: 'safety/meat-doneness#poultry'
    why: 'The 4 cm boneless thigh chunks cook through quickly in the second fry; pulling at 75°C internal (slightly above the USDA published-safe 74°C / 165°F target) gives properly cooked thighs with the connective tissue softened. The double-fry plus the 1 minute rest carries the meat through pasteurization equivalency by a wide margin.'

before_you_start:
  - 'Use boneless skin-on chicken thighs only. Skinless thighs work but lose the crispy-skin-meets-crispy-batter texture that defines great karaage. Breast meat is wrong (too dry); bone-in is wrong (uneven cook in the small chunks).'
  - 'Marinate 30 to 60 minutes, no longer. Past 90 minutes, the soy sauce salt over-penetrates and the chicken interior reads salty rather than seasoned. The 30 to 60 minute window is the calibrated sweet spot.'
  - 'Have a thermometer in the oil. The first fry is at 160°C / 320°F, the second fry at 180°C / 355°F; the temperature change between fries is structural. Mixing them up produces soggy or burnt karaage.'
  - 'Use potato starch (片栗粉 katakuriko), not cornstarch. Potato starch produces a thinner, more shatter-crisp shell; cornstarch is a passable substitute but reads slightly denser. Find at any Japanese or Korean grocery; some American supermarkets carry it as Bob''s Red Mill potato starch.'

ingredients:
  - group: 'Phase 1, marinade'
    item: 'boneless skin-on chicken thighs, cut into 4 cm chunks'
    slug: 'chicken-thigh'
    qty: 700
    unit: 'g'
    prep: 'cut into rough 4 cm cubes, skin attached to each piece if possible (the skin shrinks and crisps around the chunks in the fry)'
    note: '(~1.5 lb; 6 to 8 boneless thighs)'
  - group: 'Phase 1, marinade'
    item: 'soy sauce (Japanese koikuchi shoyu)'
    slug: 'light-soy-sauce'
    qty: 45
    unit: 'g'
    note: '(3 tbsp; the salt-and-umami base)'
  - group: 'Phase 1, marinade'
    item: 'sake'
    slug: 'sake'
    qty: 30
    unit: 'g'
    note: '(2 tbsp; tenderizes the meat and adds aromatic depth)'
  - group: 'Phase 1, marinade'
    item: 'mirin'
    slug: 'mirin'
    qty: 15
    unit: 'g'
    note: '(1 tbsp; the sweet balance)'
  - group: 'Phase 1, marinade'
    item: 'fresh ginger, grated on a microplane'
    slug: 'ginger'
    qty: 20
    unit: 'g'
    note: '(1½ inch knob)'
  - group: 'Phase 1, marinade'
    item: 'garlic cloves, grated on a microplane'
    slug: 'garlic'
    qty: 15
    unit: 'g'
    note: '(4 cloves)'
  - group: 'Phase 1, marinade'
    item: 'sugar (granulated)'
    slug: 'granulated-sugar'
    qty: 4
    unit: 'g'
    note: '(1 tsp; lifts the umami)'
  - group: 'Phase 1, marinade'
    item: 'toasted sesame oil'
    slug: 'toasted-sesame-oil'
    qty: 5
    unit: 'g'
    note: '(1 tsp; aromatic finish on the marinade)'

  - group: 'Phase 2, coating'
    item: 'potato starch (片栗粉 katakuriko)'
    qty: 100
    unit: 'g'
    note: '(¾ cup; the canonical Japanese fry coating; cornstarch is a passable substitute)'

  - group: 'Phase 3, fry'
    item: 'neutral oil (canola, vegetable, peanut, or rice bran) for deep-frying'
    slug: 'neutral-oil'
    qty: 1200
    unit: 'g'
    note: '(~5 cups; enough for a 4 to 5 quart Dutch oven at 5 cm depth)'

  - group: 'Phase 4, serve'
    item: 'lemon wedges'
    qty: 4
    unit: 'each'
    note: '(1 lemon cut into 4 wedges; the canonical acid finish)'
  - group: 'Phase 4, serve'
    item: 'Kewpie mayonnaise'
    qty: 40
    unit: 'g'
    note: '(~3 tbsp; offered on the side as the canonical Japanese dip; American mayo + a splash of rice vinegar substitutes)'
  - group: 'Phase 4, serve'
    item: 'green cabbage, very thinly shredded (the canonical accompaniment)'
    qty: 200
    unit: 'g'
    prep: 'shredded thin, soaked in ice water 5 minutes, drained'
    note: '(optional but canonical; the cool raw cabbage refreshes the palate between bites)'
    optional: true

steps:
  - text: 'Marinate the chicken. In a medium bowl, whisk together the 45 g soy sauce, 30 g sake, 15 g mirin, 20 g grated ginger, 15 g grated garlic, 4 g sugar, and 5 g sesame oil. Add the 700 g chicken thigh chunks; toss with your hands to coat every piece. Cover and refrigerate 30 to 60 minutes. Do not marinate longer than 90 minutes; the soy salt over-penetrates the meat past this window and the karaage reads salty rather than seasoned.'
    time_min: 45
  - time_min: 8
    text: 'Heat the oil and prep the coating. Pour 1200 g neutral oil into a heavy 4 to 5 quart Dutch oven to a depth of 5 cm. Clip a deep-fry thermometer to the side. Heat over medium-high until the oil reads 160°C / 320°F (the FIRST fry temperature). Pour the 100 g potato starch into a wide shallow bowl or pie plate. Set a wire rack over a sheet pan for the post-fry rest.'
  - text: 'Coat the chicken. Lift the marinated 700 g chicken chunks out of the marinade with tongs, letting excess marinade drip off (the chicken should be wet but not dripping). Drop into the potato starch in batches of 8 to 10 pieces; toss with your hands to coat every surface, including the skin folds. Lift each piece, gently shake off excess starch, and set on a plate. The coating should be a thin uniform white dust; thick crusts of starch will burn before the chicken cooks.'
    time_min: 5
  - text: 'First fry, batch 1 (8 to 10 pieces). Drop the coated chicken into the 160°C oil one piece at a time, pulling away from yourself. The oil should bubble immediately but gently. Fry 90 seconds; the chicken will turn opaque on the surface and the coating will go pale-tan but NOT crispy. This first fry par-cooks the chicken and sets the coating. Lift out with tongs or a spider; let drain on the wire rack. Repeat with the rest of the chicken in 2 to 3 more batches. Let all the par-fried chicken rest 5 minutes on the rack.'
    technique: 'shallow-frying'
    time_min: 10
  - text: 'Heat oil to second-fry temperature. Increase the heat under the oil to bring it to 180°C / 355°F (the SECOND fry temperature). This is the higher fry that develops the shatter-crisp shell and finishes cooking the chicken interior.'
    time_min: 3
  - text: 'Second fry, batch 1. Drop the par-fried chicken back into the 180°C oil in batches of 8 to 10. Fry 90 seconds to 2 minutes; the chicken will turn deep golden-brown and the coating will go audibly crispy when knocked against the side of the pot with a spider. Check internal temperature in the thickest chunk; the target is 75°C / 167°F. Lift out and drain on the wire rack. Repeat with all remaining chicken.'
    technique: 'shallow-frying'
    time_min: 8
  - text: 'Rest and serve. Let the karaage rest 60 to 90 seconds on the wire rack; the carryover brings the interior to 76 to 78°C and the crust crisps further as residual oil drains. Pile the karaage on a serving platter. Tuck the 4 lemon wedges around the pile. Set a small bowl of 40 g Kewpie mayo on the side. Mound 50 g shredded raw cabbage to the side per portion if using. Serve immediately while hot and audibly crispy; karaage is best within 5 minutes of frying. Each diner squeezes lemon over their portion at the table and dips into the Kewpie if desired.'
    time_min: 2

techniques: ['shallow-frying']
equipment: ['heavy-cast-iron-skillet', 'instant-read-thermometer', 'wire-rack-and-sheet-pan']

modifications:
  - for: 'cuisine'
    to: 'tatsuta-age (potato-starch only, no marinade dredge)'
    how: 'Use the same marinade. After marinating, drain the chicken on paper towels (do not rinse). Toss in potato starch (no flour mixed in). Single-fry at 170°C for 4 to 5 minutes (no double-fry). The dish reads as a lighter, less heavily coated cousin to karaage; the line between the two dishes is often blurred in Japanese restaurant menus.'
    kind: 'regional'
  - for: 'cuisine'
    to: 'Nagoya tebasaki (sweet-soy-glazed chicken wings)'
    how: 'Substitute 1 kg chicken wings (split into flats and drumettes) for the boneless thighs. Marinate the same way 30 minutes. Coat in potato starch, double-fry. Toss the hot fried wings in a glaze of 60 g soy sauce, 40 g mirin, 20 g sugar, 10 g grated ginger, and 5 g sesame oil simmered together for 2 minutes. Garnish with toasted sesame seeds. The dish is the Nagoya regional specialty made famous by Sekai no Yamachan; sweet-savory, sticky, addictive.'
    kind: 'regional'
  - for: 'cuisine'
    to: 'Hokkaido zangi (heartier, often with curry powder)'
    how: 'Add 5 g / 1½ tsp Japanese curry powder (S&B brand) and 5 g / 1 tsp grated onion to the marinade. Cut the chicken into slightly larger 5 cm chunks. Use bone-in thigh chunks if you want the true Hokkaido form. Double-fry as written. The dish is the Hokkaido north-island version of karaage, slightly more heavily spiced and chunkier.'
    kind: 'regional'

substitutions:
  - for: 'boneless skin-on chicken thighs'
    use: 'boneless skinless chicken thighs, chicken wings'
    note: 'Skinless thighs work but lose the crispy-skin contribution. Wings (split into flats and drumettes) make a closely related dish, especially with the Nagoya glaze (see modifications).'
  - for: 'potato starch (片栗粉 katakuriko)'
    use: 'cornstarch, mixed potato starch + flour (1:1)'
    note: 'Cornstarch produces a slightly denser coating; the 1:1 mix gives a middle texture. Potato starch alone is the canonical Japanese choice.'
  - for: 'sake'
    use: 'dry white wine, dry sherry'
    note: 'Sake is the canonical Japanese cooking wine. Dry sherry approximates the umami depth; dry white wine works but reads less Japanese.'
  - for: 'mirin (hon-mirin)'
    use: 'mirin-fu chōmiryō, or sake + sugar (sake plus extra sugar)'
    note: 'See gyoza notes. Acceptable substitutes; hon-mirin is the depth upgrade.'

homemade_alternatives:
  - for: 'Kewpie mayonnaise'
    recipe_slug: 'recipes/homemade-mayonnaise'
    why: 'A homemade mayo made with egg yolks only and rice vinegar (the Kewpie profile) is achievable in 5 minutes with a stick blender; the result is fresher and more aromatic than the bottle, though Kewpie is reliable.'

homemade_exempt: ['boneless skin-on chicken thighs, cut into 4 cm chunks', 'potato starch (片栗粉 katakuriko)', 'neutral oil (canola, vegetable, peanut, or rice bran) for deep-frying', 'green cabbage, very thinly shredded (the canonical accompaniment)']

notes: |
  Double-frying is the structural technique. The single most important calibration in karaage is the two-temperature fry: first at 160°C to par-cook the chicken interior and set the coating, then a brief rest on a wire rack (which lets surface moisture escape rather than steam back into the crust), then a second fry at 180°C to finish cooking and crisp the shell. The result is a shatter-crisp coating that stays crispy for 5 to 10 minutes after frying, much longer than single-fried versions which go soft in 90 seconds. The technique is borrowed from (or shared with) Korean and Taiwanese fried chicken traditions, all of which use the double-fry to similar effect.

  Potato starch versus flour, the textural difference. Potato starch (katakuriko) fries up dramatically lighter and more shatter-crisp than wheat flour. The starch granules are larger and contain less protein; they gel quickly in the hot oil and create a thin glass-like shell. Wheat flour creates a denser, more bread-crumb-like coating that reads heavier. Cornstarch is intermediate. The choice of potato starch is what makes karaage texturally distinct from American or European fried chicken.

  The marinade is short by design. Japanese karaage marinates 30 to 60 minutes, not overnight. The soy sauce is salty enough (16% NaCl) to over-season the meat past 90 minutes; the chicken interior turns sharply salty rather than well-seasoned. Some recipes use less soy and longer marinades; the standard izakaya recipe uses the saltier shorter marinade for the clean Japanese flavor profile.

  Boneless thigh cut at 4 cm is the canonical bite. The 4 cm chunk size is calibrated to: (1) cook through in 90 seconds at 180°C, (2) be eatable in one or two bites with chopsticks, (3) maximize surface-area-to-interior ratio for crispy-shell-to-juicy-meat balance. Larger chunks cook unevenly; smaller chunks dry out. The skin attached to each chunk crisps in the fry and contributes the textural pop that defines proper karaage.

  Lemon and mayo at the end. The lemon wedge is the canonical Japanese acidic finish; the citrus brightness cuts the richness of the fried chicken. Kewpie mayo (egg-yolk-only, rice-vinegar-based) provides a creamy umami counter; many Japanese diners use both, squeezing lemon over the whole platter and dipping individual pieces in mayo. Other common dips: shichimi-spiced mayo, ponzu (soy + citrus + dashi), or just plain coarse salt.

  Make-ahead and reheat. Karaage is best within 5 to 10 minutes of frying; the crust softens as it cools. For bento or picnic use, fry just before packing; karaage at room temperature holds reasonably well for 2 to 3 hours. Refrigerated leftovers reheat in a 200°C oven on a wire rack for 6 to 8 minutes; the crust re-crisps acceptably (about 80% of fresh). Microwave reheating is the wrong move (the crust steams soft).

  Karaage in Japanese eating culture. Karaage is izakaya canonical (the small pile of fried chicken with lemon and beer is the universal Japanese pub starter), bento box ubiquitous (the 2 to 3 pieces nestled next to rice and pickles), and home-cooking common (a Friday-night dinner of karaage, rice, miso soup, and shredded cabbage salad). The dish translates to international audiences well because it sits in the familiar fried-chicken category while being recognizably its own thing.

  Day-2 cold karaage is acceptable but not great. Refrigerate up to 2 days. Cold karaage is fine in a bento or as a lunch component; reheated karaage as discussed above. The dish is fundamentally a hot-and-fresh preparation; if making for a crowd, fry in batches close to service rather than holding.
---
