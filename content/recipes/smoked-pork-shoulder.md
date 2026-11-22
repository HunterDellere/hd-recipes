---
type: 'recipe'
category: 'recipes'
status: 'complete'
content_review: 'pending'

title: 'Smoked pork shoulder'
desc: 'Pulled smoked pork shoulder finished with a cider vinegar sauce, in two versions. Buy it from a barbecue restaurant and reheat it with stock and the sauce, or dry-brine a bone-in Boston butt, smoke it at 121 °C until a probe slides in, rest it and pull it.'
metaDesc: 'Smoked pork shoulder two ways: bought from a barbecue restaurant and reheated, or smoked at home at 121 °C. Finished with a cider vinegar sauce. Holiday friendly.'
tags: ['pork', 'smoky', 'holiday', 'make-ahead', 'weekend-project']
updated: '2026-11-22'

servings: 8
yield_note: 'about 1.4 kg / 3 lb pulled pork; feeds 8 beside a second main, with leftovers'
time:
  prep_min: 30
  cook_min: 660
  total_min: 2160
  active_min: 60
difficulty: 'medium'
cuisine: 'American'
course: 'dinner'
diet: ['dairy-free', 'nut-free']

source:
  name: 'Built on the eastern North Carolina tradition of pulled pork with a thin vinegar and pepper sauce'
  note: 'A vinegar sauce, not a sweet tomato sauce, so the pork sits beside turkey, gravy and cranberry without adding another sweet note to the plate.'

safety_notes:
  - for: 'Holding the cooked shoulder at 60 °C / 140 °F or more in a cooler (a hot-holding floor, not a doneness target)'
    ref: 'safety/meat-doneness#pork-whole-muscle'
    why: 'The shoulder is cooked to about 95 °C / 203 °F, far past the USDA 63 °C / 145 °F target for pork, before it rests. The 60 °C figure is the minimum hot-holding temperature that keeps cooked food out of the range where bacteria multiply; if it reads lower after the rest, reheat it to 74 °C / 165 °F before serving. Bought pork is reheated to 74 °C / 165 °F, the USDA figure for leftovers.'

choices:
  heading: 'Choose your version'
  toc: 'Version'
  intro: 'Bought is the default: pulled pork from a barbecue restaurant, reheated and finished at home in about an hour. Smoke it yourself if you have a smoker and a free day. The sauce is the same for both.'
  groups:
    - label: 'Version'
      select: 'one'
      options:
        - { key: 'bought', label: 'Bought', note: 'reheated, about 1 hour', default: true }
        - { key: 'smoke', label: 'Smoke it yourself', note: 'overnight brine, then 10 to 12 hours' }

before_you_start:
  - 'Bought: order ahead. Barbecue restaurants take holiday orders days in advance and many sell out. Ask for 1.4 kg / 3 lb of pulled pork shoulder with no sauce, with the bark mixed in and the juices in the container. Pick it up the day before, and refrigerate it within 2 hours.'
  - 'Bought: if the restaurant sells only whole smoked shoulders, buy one and pull it at home after reheating; whole meat stays moister than pulled meat. Reheat it wrapped in foil with the stock, 60 to 75 minutes, to 74 °C / 165 °F in the center.'
  - 'Make the vinegar sauce 1 to 7 days ahead. The pepper and sugar need a day to dissolve and soften the raw vinegar edge.'
  - 'Smoke it yourself: dry-brine the shoulder 12 to 24 hours ahead. On the day, it needs 10 to 12 hours on the smoker and at least 1 hour of rest, so put it on about 13 hours before you want to eat. Rested in a dry cooler, it holds hot for up to 4 hours.'

ingredients:
  - group: 'Phase 1, vinegar sauce (up to a week ahead)'
    item: 'apple cider vinegar'
    slug: 'apple-cider-vinegar'
    qty: 160
    unit: 'g'
    note: '(⅔ cup)'
  - group: 'Phase 1, vinegar sauce (up to a week ahead)'
    item: 'light brown sugar'
    slug: 'light-brown-sugar'
    qty: 20
    unit: 'g'
    note: '(1½ tbsp packed)'
  - group: 'Phase 1, vinegar sauce (up to a week ahead)'
    item: 'kosher salt, for the sauce'
    slug: 'kosher-salt'
    qty: 6
    unit: 'g'
    note: '(2 tsp Diamond Crystal)'
  - group: 'Phase 1, vinegar sauce (up to a week ahead)'
    item: 'black pepper, coarsely ground'
    slug: 'black-pepper'
    qty: 2
    unit: 'g'
    note: '(1 tsp)'
  - group: 'Phase 1, vinegar sauce (up to a week ahead)'
    item: 'red pepper flakes'
    slug: 'red-pepper-flakes'
    qty: 1
    unit: 'g'
    note: '(½ tsp; mild enough for most children, or leave it out)'
  - group: 'Phase 1, vinegar sauce (up to a week ahead)'
    item: 'light soy sauce'
    slug: 'light-soy-sauce'
    qty: 10
    unit: 'g'
    note: '(2 tsp; the glutamate that keeps the sauce savory)'

  - group: 'Phase 2, bought pork'
    item: 'smoked pulled pork shoulder, unsauced'
    usda_fdc_id: 168259
    qty: 1400
    unit: 'g'
    shop_section: 'meat'
    note: '(3 lb from a barbecue restaurant, bark and juices included)'
    choice: 'bought'
  - group: 'Phase 2, bought pork'
    item: 'chicken stock, unsalted'
    qty: 120
    unit: 'g'
    note: '(½ cup)'
    choice: 'bought'

  - group: 'Phase 2, smoked pork'
    item: 'bone-in pork shoulder (Boston butt)'
    slug: 'pork-shoulder'
    usda_fdc_id: 167849
    qty: 3600
    unit: 'g'
    prep: 'fat cap trimmed to 5 mm, patted dry'
    note: '(about 8 lb)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'kosher salt, for the dry brine'
    slug: 'kosher-salt'
    qty: 36
    unit: 'g'
    note: '(4 tbsp + 1 tsp Diamond Crystal; 1% of the bone-in weight)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'Dijon mustard'
    slug: 'dijon-mustard'
    qty: 30
    unit: 'g'
    note: '(2 tbsp; the binder that holds the rub on)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'light brown sugar, for the rub'
    slug: 'light-brown-sugar'
    qty: 30
    unit: 'g'
    note: '(2½ tbsp packed)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'smoked paprika'
    slug: 'smoked-paprika'
    qty: 10
    unit: 'g'
    note: '(1 tbsp + 1 tsp)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'black pepper, for the rub'
    slug: 'black-pepper'
    qty: 8
    unit: 'g'
    note: '(1 tbsp)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'garlic powder'
    qty: 4
    unit: 'g'
    shop_section: 'spices'
    note: '(1¼ tsp)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'dry mustard powder'
    qty: 4
    unit: 'g'
    note: '(2 tsp)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'cayenne pepper'
    qty: 1
    unit: 'g'
    note: '(½ tsp)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'apple cider vinegar, for spritzing'
    slug: 'apple-cider-vinegar'
    qty: 60
    unit: 'g'
    note: '(¼ cup, mixed with ¼ cup water in a spray bottle)'
    choice: 'smoke'
  - group: 'Phase 2, smoked pork'
    item: 'hickory, oak or apple wood chunks'
    qty: 5
    unit: 'each'
    shop_section: 'other'
    note: '(fist-sized, about 550 g / 1¼ lb; or pellets or chips for the smoker you have)'
    choice: 'smoke'

steps:
  - text: 'Make the vinegar sauce (1 to 7 days ahead). In a lidded jar, shake the 160 g / ⅔ cup apple cider vinegar, 20 g / 1½ tbsp light brown sugar, 6 g / 2 tsp kosher salt, 2 g / 1 tsp coarse black pepper, 1 g / ½ tsp red pepper flakes and 10 g / 2 tsp soy sauce until the sugar and salt dissolve. Refrigerate. Taste it the next day: sharp first, then salty and peppery, with only a trace of sweetness.'
    time_min: 5
  - text: 'Bought: store it. Refrigerate the 1.4 kg / 3 lb pulled pork in its container within 2 hours of pickup. If it is still hot, spread it in a shallow dish no more than 5 cm / 2 inches deep so it cools fast. It keeps 3 days.'
    choice: 'bought'
    time_min: 5
  - text: 'Bought: reheat. Take the pork out of the fridge 30 minutes ahead. Spread it in a 23 x 33 cm / 9 x 13 inch baking dish with its juices, pour the 120 g / ½ cup chicken stock and 60 g / ¼ cup of the vinegar sauce over it, and cover the dish tightly with foil. Bake on the middle rack at 220 °C / 425 °F (or at whatever temperature the oven is already running, from 165 °C / 325 °F up) for 35 to 45 minutes, stirring once, until the center reads 74 °C / 165 °F. The stock replaces the moisture the meat lost in the fridge, and the foil traps it as steam.'
    choice: 'bought'
    time_min: 45
  - text: 'Bought: crisp the top. Uncover the dish, toss the pork with tongs so the bark is spread through it, and return it uncovered for 8 to 10 minutes, until the strands on top are browned and crisp at the tips. Hold it covered on the counter for up to 20 minutes.'
    choice: 'bought'
    time_min: 10
  - text: 'Smoke it yourself: dry-brine (the night before). Pat the 3.6 kg / 8 lb shoulder dry and season every surface evenly with the 36 g / 4 tbsp + 1 tsp kosher salt (10 g / 3½ tsp per kg if yours weighs more or less). Set it on a wire rack over a sheet pan and refrigerate uncovered 12 to 24 hours. The salt dissolves into the surface moisture and diffuses inward, so the meat is seasoned deep instead of only at the crust.'
    technique: 'dry-brining'
    choice: 'smoke'
    time_min: 720
  - text: 'Smoke it yourself: rub. Mix the 30 g / 2½ tbsp rub brown sugar, 10 g / 1 tbsp + 1 tsp smoked paprika, 8 g / 1 tbsp black pepper, 4 g / 1¼ tsp garlic powder, 4 g / 2 tsp dry mustard powder and 1 g / ½ tsp cayenne. Brush the shoulder all over with the 30 g / 2 tbsp Dijon mustard, then pat the rub onto every surface. Let it stand 20 minutes, until the surface looks wet.'
    choice: 'smoke'
    time_min: 25
  - text: 'Smoke it yourself: smoke. Heat the smoker to 121 °C / 250 °F with the 5 wood chunks and wait for thin, blue-gray smoke. Set the shoulder fat side up away from the fire and close the lid. After 3 hours, spray any dry spots with the 60 g / ¼ cup cider vinegar mixed with ¼ cup water, every hour. At about 6 hours the internal temperature stalls near 70 to 75 °C / 160 to 165 °F, because evaporation from the surface is cooling the meat as fast as the smoker heats it.'
    choice: 'smoke'
    time_min: 360
  - text: 'Smoke it yourself: wrap and finish. Once the bark is deep mahogany and does not smear when touched, wrap the shoulder tightly in two layers of unwaxed butcher paper or heavy-duty foil. Wrapping stops the evaporation and pushes the meat through the stall. Return it to the 121 °C smoker for 3 to 5 hours more, until a probe slides into the thickest part with almost no resistance, at about 95 °C / 203 °F, and the blade bone wiggles freely.'
    choice: 'smoke'
    time_min: 270
  - text: 'Smoke it yourself: rest. Fill a cooler with hot tap water for 10 minutes, empty and dry it, then put in the wrapped shoulder, cover it with old towels and close the lid. Rest at least 1 hour and up to 4 hours; it should still read 60 °C / 140 °F or more when you open it. The rest lets the gelatin-rich juices thicken back into the meat instead of running onto the board.'
    choice: 'smoke'
    time_min: 60
  - text: 'Smoke it yourself: pull. Unwrap it over a rimmed tray, pull out the blade bone, and shred the meat with two forks or gloved hands, discarding any soft unrendered fat pockets. Chop the bark roughly and mix it through. Pour the juices from the wrap into a cup, spoon off the fat, and toss the pork with the defatted juices and 60 g / ¼ cup of the vinegar sauce.'
    choice: 'smoke'
    time_min: 20
  - text: 'Season and serve. Taste a strand from the middle of the dish: it should taste smoky and savory, then bright. If it tastes flat, add more vinegar sauce 15 g / 1 tbsp at a time before any salt. Serve the rest of the sauce (about 140 g / ½ cup) in a jug, with the cranberry sauces alongside.'
    time_min: 3

techniques: ['dry-brining']
equipment: ['instant-read-thermometer', 'digital-scale']

substitutions:
  - for: 'smoked pulled pork shoulder, unsauced'
    use: 'sauced pulled pork, or a whole smoked shoulder'
    note: 'If it comes sauced with a sweet tomato sauce, skip the 60 g vinegar sauce in the reheat and serve the vinegar sauce on the side. A whole shoulder reheats wrapped in foil with the stock, 60 to 75 minutes, and is pulled after.'
  - for: 'chicken stock, unsalted'
    use: 'water'
    note: 'Same weight. Stock adds a little body and savory depth; water only restores moisture.'
  - for: 'hickory, oak or apple wood chunks'
    use: 'pecan or cherry'
    note: 'Lighter smoke. Hickory is the eastern North Carolina standard.'

modifications:
  - for: 'occasion'
    to: 'oven-roasted pulled pork, no smoker'
    how: 'After the rub, roast the shoulder on a rack in a roasting pan at 135 °C / 275 °F, uncovered 4 hours, then wrapped in foil 3 to 4 hours more, until a probe slides in at about 95 °C / 203 °F. Rest and pull it the same way. Without wood smoke, the smoked paprika carries the smoky note.'
    kind: 'occasion'
  - for: 'heat'
    to: 'a hotter table sauce'
    how: 'Raise the red pepper flakes in half the vinegar sauce to 3 g / 1½ tsp and label the jars. Keep the mild jar for children.'
    kind: 'heat'

homemade_alternatives:
  - for: 'chicken stock, unsalted'
    recipe_slug: 'recipes/chicken-stock'
    why: 'Homemade stock carries gelatin, which gives the reheated pork a glossy, juicy finish that boxed stock does not.'
  - for: 'Dijon mustard'
    recipe_slug: 'recipes/dijon-mustard'
    why: 'Homemade Dijon has a cleaner heat and more acidity under the rub.'

homemade_exempt: ['smoked pulled pork shoulder, unsauced']

pairings:
  - recipe: 'recipes/cranberry-mostarda'
    reason: 'Sharp, sweet and mustard-hot, it cuts the pork fat the way the vinegar sauce does.'
  - recipe: 'recipes/hasselback-potato-gratin'
    reason: 'Cream and gruyère soak up the pork juices and the vinegar sauce.'
  - recipe: 'recipes/jalapeno-cheddar-skillet-cornbread'
    reason: 'Corn, chile and cheddar are the classic company for pulled pork.'

notes: |
  Why a vinegar sauce. Pulled pork is fatty and smoky, and fat coats the palate. A thin, sharp vinegar sauce cuts the fat and lets the smoke taste clean. A thick, sweet tomato sauce would add a fourth sweet note to a plate that already has cranberry and pear on it.

  Why bought pork still gets reheated with liquid. Cold pulled pork loses moisture as its gelatin sets and its fat firms. Covered heat with stock melts the gelatin and fat back into the strands, and the uncovered finish restores the crisp edges a reheated dish usually loses.

  Why the shoulder turns tender. Shoulder is laced with collagen. Held between about 70 and 95 °C for hours, collagen turns into gelatin, which holds water. The meat is safe long before it is tender: at 74 °C it is chewy, and at about 95 °C it pulls apart. That is why the probe, not the clock, decides when it is done.

  Yield. A bone-in shoulder loses about half its weight to rendered fat, water and the bone, so 3.6 kg raw gives about 1.8 kg pulled meat.
---
