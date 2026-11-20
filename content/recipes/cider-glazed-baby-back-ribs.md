---
type: 'recipe'
category: 'recipes'
status: 'complete'
content_review: 'pending'

title: 'Cider-glazed baby back ribs'
desc: 'Two racks of baby back ribs, dry-brined overnight, rubbed with brown sugar, smoked paprika, mustard, fennel and sage, cooked low until a probe slides between the bones, then lacquered with a reduced apple cider and mustard glaze. Smoke them on any smoker, or slow-bake them the day before and glaze them in a hot oven, or do one rack each way.'
metaDesc: 'Tender baby back ribs two ways: smoked at 121 °C or slow-baked at 135 °C, with a sage and fennel rub and a reduced cider-mustard glaze. Make-ahead friendly.'
tags: ['pork', 'smoky', 'glaze', 'holiday', 'make-ahead', 'weekend-project']
updated: '2026-11-19'

servings: 6
yield_note: '2 racks, about 26 ribs; feeds 8 beside a second main'
time:
  prep_min: 30
  cook_min: 300
  total_min: 1080
  active_min: 60
difficulty: 'medium'
cuisine: 'American'
course: 'dinner'

source:
  name: 'Built on American barbecue practice for baby back ribs (smoke, wrap, glaze) and the oven-braised rib method'
  note: 'The rub and glaze are pitched for a holiday table rather than a barbecue plate: sage and fennel instead of chili heat, and an apple cider reduction with mustard instead of a tomato sauce, so the ribs sit next to turkey, gravy and cranberry without fighting them.'

choices:
  heading: 'Choose your method'
  toc: 'Method'
  intro: 'Pick the smoker, the oven, or both. With both on (the default), smoke one rack and bake the other; every quantity below already covers two racks. The steps show only the methods you pick.'
  groups:
    - label: 'Method'
      options:
        - { key: 'smoker', label: 'Smoker', note: 'on the day, about 5 hours', default: true }
        - { key: 'oven', label: 'Oven', note: 'baked the day before, glazed on the day', default: true }

before_you_start:
  - 'Dry-brine the racks the night before, 12 to 24 hours, uncovered on a wire rack over a sheet pan in the fridge. Salt needs that long to move from the surface into the meat.'
  - 'Smoker: the ribs need about 5 hours on the smoker. Once tender, they hold sealed in their foil for up to 2 hours in a preheated dry cooler, and are glazed in the last 30 minutes. Put them on 6 hours before you want to eat. In cold or windy weather a smoker runs slow, so allow an extra 30 to 60 minutes.'
  - 'Oven: bake the ribs the day before (3 hours at 135 °C / 275 °F), cool them in their foil and refrigerate them within 2 hours. On the day they need 35 to 45 minutes in a 220 °C / 425 °F oven to reheat and 15 minutes to glaze.'
  - 'Make the glaze up to 3 days ahead and keep it in a lidded jar in the fridge. Warm it before brushing so it spreads thin.'
  - 'Tenderness is judged with a probe, not a clock. A thermometer probe pushed between two bones should slide in with almost no resistance, at about 93 to 96 °C / 200 to 205 °F.'

ingredients:
  - group: 'Phase 1, dry-brine (the night before)'
    item: 'baby back pork ribs'
    usda_fdc_id: 168299
    qty: 3000
    unit: 'g'
    prep: 'membrane removed, patted dry'
    note: '(2 racks of about 1.5 kg / 3¼ lb each)'
  - group: 'Phase 1, dry-brine (the night before)'
    item: 'kosher salt'
    slug: 'kosher-salt'
    qty: 22
    unit: 'g'
    note: '(2 tbsp + 2 tsp Diamond Crystal; 0.75% of the bone-in weight. If your racks weigh more or less, use 7.5 g / 2¾ tsp per kg)'

  - group: 'Phase 2, rub'
    item: 'Dijon mustard'
    slug: 'dijon-mustard'
    qty: 30
    unit: 'g'
    note: '(2 tbsp; the binder that holds the rub on)'
  - group: 'Phase 2, rub'
    item: 'light brown sugar'
    slug: 'light-brown-sugar'
    qty: 30
    unit: 'g'
    note: '(2½ tbsp packed)'
  - group: 'Phase 2, rub'
    item: 'smoked paprika'
    slug: 'smoked-paprika'
    qty: 8
    unit: 'g'
    note: '(1 tbsp)'
  - group: 'Phase 2, rub'
    item: 'black pepper, coarsely ground'
    slug: 'black-pepper'
    qty: 6
    unit: 'g'
    note: '(2½ tsp)'
  - group: 'Phase 2, rub'
    item: 'dry mustard powder'
    qty: 4
    unit: 'g'
    note: '(2 tsp)'
  - group: 'Phase 2, rub'
    item: 'garlic powder'
    qty: 4
    unit: 'g'
    shop_section: 'spices'
    note: '(1¼ tsp)'
  - group: 'Phase 2, rub'
    item: 'fennel seed, ground'
    slug: 'fennel-seed'
    qty: 3
    unit: 'g'
    prep: 'ground in a spice grinder or mortar'
    note: '(1½ tsp whole seed)'
  - group: 'Phase 2, rub'
    item: 'dried rubbed sage'
    qty: 2
    unit: 'g'
    shop_section: 'spices'
    note: '(1 tbsp)'
  - group: 'Phase 2, rub'
    item: 'cayenne pepper'
    qty: 1
    unit: 'g'
    note: '(½ tsp)'

  - group: 'Phase 3, cook'
    item: 'apple or cherry wood chunks'
    qty: 4
    unit: 'each'
    shop_section: 'other'
    note: '(fist-sized, about 450 g / 1 lb; or 2 large handfuls of pellets or chips for the smoker you have)'
    choice: 'smoker'
  - group: 'Phase 3, cook'
    item: 'apple cider, for spritzing'
    usda_fdc_id: 167771
    qty: 120
    unit: 'g'
    note: '(½ cup, mixed with the vinegar below in a spray bottle)'
    choice: 'smoker'
  - group: 'Phase 3, cook'
    item: 'apple cider vinegar, for spritzing'
    slug: 'apple-cider-vinegar'
    qty: 30
    unit: 'g'
    note: '(2 tbsp)'
    choice: 'smoker'
  - group: 'Phase 3, cook'
    item: 'unsalted butter, for the wrap'
    slug: 'butter'
    qty: 30
    unit: 'g'
    prep: 'cut into thin slices'
    note: '(2 tbsp)'
  - group: 'Phase 3, cook'
    item: 'honey, for the wrap'
    slug: 'honey'
    qty: 20
    unit: 'g'
    note: '(1 tbsp)'
  - group: 'Phase 3, cook'
    item: 'apple cider, for the wrap'
    usda_fdc_id: 167771
    qty: 60
    unit: 'g'
    note: '(¼ cup)'

  - group: 'Phase 4, cider-mustard glaze (up to 3 days ahead)'
    item: 'apple cider, unfiltered'
    usda_fdc_id: 167771
    qty: 360
    unit: 'g'
    note: '(1½ cups; fresh unsweetened cider, not hard cider and not apple juice)'
  - group: 'Phase 4, cider-mustard glaze (up to 3 days ahead)'
    item: 'honey'
    slug: 'honey'
    qty: 30
    unit: 'g'
    note: '(1½ tbsp)'
  - group: 'Phase 4, cider-mustard glaze (up to 3 days ahead)'
    item: 'Dijon mustard, for the glaze'
    slug: 'dijon-mustard'
    qty: 30
    unit: 'g'
    note: '(2 tbsp)'
  - group: 'Phase 4, cider-mustard glaze (up to 3 days ahead)'
    item: 'apple cider vinegar'
    slug: 'apple-cider-vinegar'
    qty: 15
    unit: 'g'
    note: '(1 tbsp)'
  - group: 'Phase 4, cider-mustard glaze (up to 3 days ahead)'
    item: 'soy sauce'
    slug: 'light-soy-sauce'
    qty: 10
    unit: 'g'
    note: '(2 tsp; the glutamate that keeps the glaze savory)'
  - group: 'Phase 4, cider-mustard glaze (up to 3 days ahead)'
    item: 'unsalted butter, for the glaze'
    slug: 'butter'
    qty: 15
    unit: 'g'
    note: '(1 tbsp)'
  - group: 'Phase 4, cider-mustard glaze (up to 3 days ahead)'
    item: 'black pepper, for the glaze'
    slug: 'black-pepper'
    qty: 1
    unit: 'g'
    note: '(½ tsp)'

steps:
  - text: 'Dry-brine (the night before). Slide a butter knife under the thin membrane on the bone side of each rack at one end, lift a corner, grip it with a paper towel and peel it off in one sheet. The membrane does not render and blocks the rub. Pat the racks dry and season both sides evenly with the 22 g / 2 tbsp + 2 tsp kosher salt (7.5 g / 2¾ tsp per kg if your racks weigh more or less than 3 kg), a little more on the meaty top than on the bone side. Set them meat side up on a wire rack over a sheet pan and refrigerate uncovered 12 to 24 hours.'
    technique: 'dry-brining'
    time_min: 720
  - text: 'Make the glaze (up to 3 days ahead). In a wide saucepan, boil the 360 g / 1½ cups apple cider over medium-high heat until it reduces to about 120 g / ½ cup and coats a spoon, 15 to 20 minutes; weigh the pan before and after if you can. Off the heat, whisk in the 30 g / 1½ tbsp honey, the 30 g / 2 tbsp Dijon mustard, the 15 g / 1 tbsp cider vinegar, the 10 g / 2 tsp soy sauce, the 15 g / 1 tbsp butter and the 1 g / ½ tsp black pepper. Taste: it should be sweet, then sharply sour, then savory. Cool and refrigerate in a lidded jar.'
    technique: 'reduction'
    time_min: 20
  - text: 'Mix the rub. Combine the 30 g / 2½ tbsp light brown sugar, 8 g / 1 tbsp smoked paprika, 6 g / 2½ tsp coarse black pepper, 4 g / 2 tsp dry mustard powder, 4 g / 1¼ tsp garlic powder, 3 g / 1½ tsp ground fennel seed, 2 g / 1 tbsp dried sage and 1 g / ½ tsp cayenne, breaking up any sugar lumps with your fingers. There is no salt in the rub; the dry brine has already seasoned the meat.'
    time_min: 5
  - text: 'Rub the racks. Brush a thin coat of the 30 g / 2 tbsp Dijon mustard over both sides of each rack, then scatter the rub evenly over both sides, about two thirds on the meat side. Press it on and let it stand 15 minutes, until the surface looks wet; the sugar and salt draw out enough moisture to fix the rub in place.'
    time_min: 20
  - text: 'Smoker: set up and smoke unwrapped. Heat the smoker to 121 °C / 250 °F with the 4 wood chunks (or your pellets or chips), and wait until the smoke runs thin and blue-gray rather than thick and white; thick white smoke deposits bitter creosote. Lay the racks meat side up on the grate, away from direct fire. Close the lid and smoke 2½ hours. After the first hour, spray the racks with the mixed 120 g / ½ cup cider and 30 g / 2 tbsp cider vinegar every 45 minutes wherever the surface looks dry. They are ready to wrap when the bark is a deep mahogany and the rub does not smear when you touch it.'
    choice: 'smoker'
    time_min: 150
  - text: 'Smoker: wrap. Tear a sheet of heavy-duty foil about 60 cm / 24 in long for each rack. On each, lay half the 30 g / 2 tbsp sliced butter and drizzle half the 20 g / 1 tbsp honey. Set a rack meat side down on top, pour half the 60 g / ¼ cup cider for the wrap around it, and fold the foil into a tight packet. (Smoking one rack and baking the other: each rack gets one sheet and one half.) Return the packets to the 121 °C smoker meat side down for 1½ to 2 hours, until a probe pushed between two bones slides in with almost no resistance (about 93 to 96 °C / 200 to 205 °F). The foil braises the meat in its own fat and the cider, which is where the tenderness comes from.'
    choice: 'smoker'
    time_min: 105
  - text: 'Smoker: hold if early. If the ribs are tender more than 45 minutes before dinner, leave them sealed in their foil. Fill a cooler with hot tap water for 10 minutes, empty and dry it, then put in the packets wrapped in old towels and close the lid. They hold up to 2 hours; check that they still read 60 °C / 140 °F or more before glazing. Hold them before glazing, not after: a glaze sealed in foil steams soft.'
    choice: 'smoker'
    time_min: 120
  - text: 'Smoker: glaze. About 30 minutes before dinner, open the packets, pour the juices into a cup, and lay the racks meat side up on the 121 °C grate. Brush with a thin coat of the warmed glaze, close the lid 15 minutes, brush again and cook 10 to 15 minutes more, until the glaze is tacky and set. If the smoker has gone out, glaze them in a 220 °C / 425 °F oven instead, 6 minutes per coat.'
    choice: 'smoker'
    time_min: 30
  - text: 'Oven: bake (the day before, or 3½ hours before dinner). Heat the oven to 135 °C / 275 °F. Set the rubbed racks meat side up on a foil-lined sheet pan and bake uncovered 30 minutes to set the rub. Then wrap each rack meat side down in heavy-duty foil with half the 30 g / 2 tbsp sliced butter, half the 20 g / 1 tbsp honey and half the 60 g / ¼ cup cider for the wrap, seal tightly, and bake 2 to 2½ hours more, until a probe slides between the bones with almost no resistance (about 93 to 96 °C / 200 to 205 °F). Without wood smoke, the smoked paprika carries the smoky note.'
    choice: 'oven'
    time_min: 180
  - text: 'Oven: cool and hold (if made the day before). Leave the racks sealed in their foil, let them cool on the counter 30 minutes, then refrigerate within 2 hours of coming out of the oven. Cooked in their juices, they keep 3 days.'
    choice: 'oven'
    time_min: 30
  - text: 'Oven: reheat and glaze (on the day). Heat the oven to 220 °C / 425 °F. Put the foil packets, still sealed, on a sheet pan on the middle rack for 35 to 45 minutes, until the thickest part reads 74 °C / 165 °F. Open the packets, pour off the juices, and set the racks meat side up on the foil. Brush with a thin coat of the warmed glaze, roast 6 minutes, brush again and roast 6 to 8 minutes more, until the glaze bubbles and darkens at the edges. Ribs baked the same day skip the reheat: glaze them straight after the wrapped bake.'
    choice: 'oven'
    time_min: 45
  - text: 'Rest and cut. Rest the racks 10 minutes on a board. Turn each rack bone side up, so you can see where the bones run, and cut between every bone with a long knife. Brush the cut ribs with the last of the glaze and taste one: the rub should read as savory and herbal, the glaze as sweet, then sour, then sharp. Serve with the cranberry mostarda alongside.'
    time_min: 15

techniques: ['dry-brining', 'reduction']
equipment: ['instant-read-thermometer', 'digital-scale']

substitutions:
  - for: 'baby back pork ribs'
    use: 'St. Louis-cut spare ribs'
    note: 'Larger, fattier and more forgiving. Add 1 to 1½ hours: about 3 hours unwrapped on the smoker and 2 hours wrapped, or 3½ to 4 hours in the oven.'
  - for: 'apple cider, unfiltered'
    use: 'unsweetened apple juice'
    note: 'Thinner and sweeter. Reduce it the same way and add an extra 5 g / 1 tsp cider vinegar to the glaze.'
  - for: 'dried rubbed sage'
    use: 'dried thyme'
    note: 'Same weight. Keeps the herbal note that ties the ribs to a sage-and-thyme holiday table.'
  - for: 'apple or cherry wood chunks'
    use: 'pecan, oak or hickory'
    note: 'Pecan and oak smoke lightly like the fruit woods. Hickory is stronger; use half as much.'

modifications:
  - for: 'heat'
    to: 'a spicier rack'
    how: 'Raise the cayenne to 3 g / 1½ tsp and add 2 g / 1 tsp red pepper flakes to the glaze. Keep the other rack mild if children are eating.'
    kind: 'heat'
  - for: 'occasion'
    to: 'a gas or charcoal grill instead of a smoker'
    how: 'Set the grill up for indirect heat (burners on one side, or coals banked to one side) and hold 121 to 135 °C / 250 to 275 °F at the grate on the cool side. Put the wood chunks over the fire, or chips in a foil pouch with holes poked in it. Follow the smoker steps; a grill holds heat less steadily, so check the lid thermometer every 30 minutes.'
    kind: 'occasion'

homemade_alternatives:
  - for: 'Dijon mustard'
    recipe_slug: 'recipes/dijon-mustard'
    why: 'Homemade Dijon has a cleaner heat and a wine acidity that keeps the cider glaze from tasting flat.'

pairings:
  - recipe: 'recipes/cranberry-mostarda'
    reason: 'Sharp, sweet and mustard-hot, it does for pork fat what cranberry sauce does for turkey.'
  - recipe: 'recipes/hasselback-potato-gratin'
    reason: 'Cream and gruyère soak up the rib juices and soften the glaze.'
  - recipe: 'recipes/arugula-pear-and-pomegranate-salad-with-goat-cheese'
    reason: 'Peppery leaves and acid cut through the pork fat.'

notes: |
  Why baby backs. They come from the top of the rib cage next to the loin, so they are leaner and become tender about 1½ hours sooner than spare ribs. Nearly every supermarket meat case has them, which makes them the reliable choice for a holiday cooked away from home.

  Why the ribs turn tender. Rib meat is laced with collagen. Held between about 70 and 95 °C for hours, collagen turns into gelatin, which holds water and makes the meat feel moist even when it is cooked well past done. The foil wrap traps steam and the cider, so the second half of the cook is a braise. That is why the probe test works: when the collagen has converted, the meat stops resisting. Ribs at 74 °C are safe but chewy; at 93 to 96 °C they are tender. Past about 98 °C or another hour in the wrap, the meat falls off the bone and the slices crumble.

  Why the glaze goes on last. The glaze is mostly sugar from the cider and honey, and sugar burns above about 175 °C. Brushed on at the start, it would char over 5 hours. On the smoker at 121 °C it sets into a lacquer in 25 minutes, and in a 220 °C oven it bubbles in 12. Thin coats set; a thick coat stays sticky and slides off.

  Flavors chosen for the holiday table. Sage and fennel are the seasonings of breakfast sausage, so the ribs taste like pork the way a turkey dinner expects. Mustard in the rub, in the glaze and in the mostarda gives one sharp line through the plate. The soy sauce in the glaze adds glutamate, which makes the glaze taste savory rather than candied, and the cider vinegar is the finishing acid.

  Smoke quality. Clean smoke from a hot, well-aired fire is thin and blue-gray. Thick white smoke comes from smoldering wood starved of air and leaves a bitter, acrid coating. Open the vents before you add more wood.
---
