/**
 * shop-section — classify an ingredient row into a grocery-aisle section
 * so the shopping list groups by where the cook actually picks the item up,
 * not by which cooking phase uses it.
 *
 * Resolution order:
 *   1. Per-recipe-line override: `shop_section:` on the ingredients[] row
 *   2. Ingredient-page override:  `shop_section:` on the linked ingredient
 *   3. Hard map by slug (this file)
 *   4. Keyword fallback on the item text (for unlinked rows)
 *   5. 'other'
 *
 * The canonical section keys and display labels live in SECTIONS below.
 * That same ordering drives the rendered shop panel.
 */

export const SECTIONS = [
  { key: 'produce',  label: 'Produce' },
  { key: 'meat',     label: 'Meat & seafood' },
  { key: 'dairy',    label: 'Dairy, eggs & refrigerated' },
  { key: 'bakery',   label: 'Bakery' },
  { key: 'frozen',   label: 'Frozen' },
  { key: 'spices',   label: 'Spices & dried herbs' },
  { key: 'pantry',   label: 'Pantry' },
  { key: 'other',    label: 'Other' },
];

export const SECTION_ORDER = SECTIONS.map(s => s.key);
export const SECTION_LABEL = Object.fromEntries(SECTIONS.map(s => [s.key, s.label]));

// Authoritative slug → section. Maintain by editing the bucket array, not the
// inverse map. Keep the buckets alphabetized within each section so it's easy
// to scan for a slug.
const BUCKETS = {
  produce: [
    'avocado', 'bananas', 'basil', 'beet-greens', 'bell-pepper', 'blood-orange',
    'broccoli', 'brussels-sprouts', 'burdock-root', 'calamansi', 'carrot',
    'cauliflower', 'cherry-tomato', 'chives', 'cilantro', 'cucumber', 'culantro', 'curry-leaf',
    'daikon', 'delicata-squash', 'dill', 'eggplant', 'fennel-bulb', 'fresh-thyme',
    'galangal', 'garlic', 'ginger', 'green-cabbage', 'green-chili', 'green-papaya',
    'green-plantain', 'haricots-verts', 'holy-basil', 'jalapeno',
    'kaffir-lime-leaves', 'lacinato-kale', 'leek', 'lemon', 'lemongrass', 'lime',
    'lotus-root', 'mango', 'mint', 'mung-bean-sprouts', 'napa-cabbage', 'nopales',
    'okra', 'orange', 'oyster-mushroom', 'pandan-leaves', 'parsley', 'pear',
    'pineapple', 'poblano-pepper', 'purslane', 'radish', 'rau-ngo', 'red-beet',
    'red-onion', 'romaine-lettuce', 'scallion', 'scotch-bonnet', 'serrano-chili',
    'shallot', 'shimeji-mushroom', 'sweet-potato', 'taro', 'taro-stem',
    'thai-basil', 'thai-chili', 'tomatillo', 'tomato', 'water-chestnut',
    'waxy-potato', 'white-onion', 'yardlong-bean', 'yellow-onion',
  ],
  meat: [
    'beef-brisket', 'beef-heart', 'catfish', 'chicken-thigh', 'chuck-eye-steak',
    'cod', 'dungeness-crab', 'ground-beef', 'ground-pork', 'halibut',
    'lamb-shoulder', 'littleneck-clams', 'mackerel', 'monkfish', 'mussels',
    'pork-belly', 'pork-shoulder', 'shrimp', 'squid', 'tuna-loin',
    'whole-white-fish',
  ],
  dairy: [
    'aburaage', 'bacon', 'butter', 'century-egg', 'cotija', 'eggs',
    'feta', 'firm-tofu', 'ghee', 'gorgonzola', 'greek-yogurt', 'heavy-cream',
    'mascarpone', 'niter-kibbeh', 'pancetta', 'parmigiano-reggiano',
    'pecorino-romano', 'queso-fresco', 'salted-duck-egg', 'samna',
    'silken-tofu', 'sour-cream', 'tofu-skin', 'whole-milk', 'yogurt',
  ],
  bakery: [
    'pita-bread', 'sourdough-bread',
  ],
  spices: [
    'allspice', 'bay-leaf', 'berbere', 'black-pepper', 'caraway-seed',
    'chaat-masala', 'chinese-five-spice', 'cinnamon-stick', 'cloves',
    'cumin-seeds', 'dried-chilies', 'dried-oregano', 'dried-osmanthus',
    'fennel-seed', 'garam-masala', 'gochugaru', 'green-cardamom',
    'ground-coriander', 'ground-cumin', 'hungarian-paprika',
    'kashmiri-chili-powder', 'mexican-oregano', 'monosodium-glutamate',
    'mustard-seeds', 'poppy-seeds', 'red-pepper-flakes', 'saffron',
    'sesame-seeds', 'sichuan-peppercorns', 'smoked-paprika', 'star-anise',
    'sumac', 'tandoori-masala', 'turmeric', 'urfa-biber', 'white-pepper',
  ],
  pantry: [
    'agar-agar', 'aji-amarillo-paste', 'aji-panca-paste', 'all-purpose-flour',
    'almonds', 'anchovy-fillets', 'apple-cider-vinegar', 'assam-tea',
    'atta-flour', 'avocado-oil', 'bagoong', 'baking-powder', 'baking-soda',
    'balsamic-vinegar', 'banana-ketchup', 'banh-trang', 'basmati-rice', 'black-beans',
    'bread-flour', 'calcium-lactate', 'candlenut', 'cane-vinegar',
    'canned-san-marzano-tomatoes', 'capers', 'ceylon-tea', 'chili-oil',
    'chinkiang-vinegar', 'chipotle-in-adobo', 'coconut-milk', 'coconut-sugar',
    'cornstarch', 'dark-brown-sugar', 'dark-chocolate', 'dark-soy-sauce',
    'dende-oil', 'desiccated-coconut', 'dijon-mustard', 'doenjang',
    'doubanjiang', 'douchi', 'dried-porcini', 'dried-shiitake',
    'dried-shrimp', 'dry-sherry',
    'dry-white-wine', 'dutch-process-cocoa', 'egusi-seeds', 'espresso-beans',
    'evaporated-milk', 'extra-virgin-olive-oil', 'farro', 'fine-sea-salt',
    'fish-sauce', 'genmaicha', 'glutinous-rice', 'glutinous-rice-flour',
    'gochujang', 'granulated-sugar', 'hazelnut', 'hoisin-sauce', 'hominy',
    'honey', 'instant-yeast', 'jameed', 'japanese-short-grain-rice',
    'jasmine-rice', 'katsuobushi', 'kecap-manis', 'kokum', 'kombu',
    'konnyaku', 'kosher-salt', 'lard', 'light-brown-sugar', 'light-soy-sauce',
    'maple-syrup', 'masa-harina', 'matcha', 'mayonnaise', 'millet', 'mirin',
    'mung-bean', 'muscovado-sugar', 'neutral-oil', 'nicoise-olives', 'nori',
    'palm-oil', 'palm-sugar', 'panko', 'peanuts', 'pepitas', 'pigeon-peas',
    'pistachio', 'pomegranate-molasses', 'potato-starch', 'preserved-radish',
    'red-miso', 'red-wine-vinegar', 'rice-vermicelli', 'rice-vinegar',
    'rock-sugar', 'sake', 'sauerkraut', 'sesame-paste', 'shanghai-noodles',
    'shaoxing-wine', 'sodium-alginate', 'sui-mi-ya-cai',
    'sweetened-condensed-milk', 'tahini', 'tamarind', 'tapioca-pearls',
    'tapioca-starch', 'teff-flour', 'terasi', 'toasted-rice-powder',
    'toasted-sesame-oil', 'tomato-paste', 'ube-halaya', 'vanilla-bean-paste', 'vanilla-extract',
    'wakame', 'walnuts', 'white-miso', 'white-rice-flour',
    'white-wine-vinegar', 'wood-ear-mushroom', 'worcestershire-sauce', 'yuzu',
  ],
};

const SLUG_TO_SECTION = (() => {
  const m = new Map();
  for (const [section, slugs] of Object.entries(BUCKETS)) {
    for (const s of slugs) m.set(s, section);
  }
  return m;
})();

// Keyword fallback for rows without a slug. Patterns run top to bottom; first
// hit wins. Order matters — most specific (frozen) before catch-alls. Whole
// strings are matched against the lowercased item text after trivial cleanup.
const KEYWORD_RULES = [
  // Frozen anything wins regardless of underlying ingredient
  { section: 'frozen', test: t => /\bfrozen\b/.test(t) },

  // Meat & seafood: cuts, fish, shellfish
  { section: 'meat', test: t => /\b(chicken|turkey|duck|goose|quail|chicken breast|chicken thigh|chicken wing|drumstick|skinless|boneless)\b/.test(t) },
  { section: 'meat', test: t => /\b(beef|steak|brisket|short rib|sirloin|ribeye|flank|skirt|ground beef|chuck|oxtail|tri-?tip|filet|chuck eye|chuck roast)\b/.test(t) },
  { section: 'meat', test: t => /\b(pork|ground pork|pork belly|pork shoulder|pork chop|pork loin|ribs|sausage|chorizo|andouille|kielbasa|salami|prosciutto|guanciale|capicola|coppa|mortadella|pancetta|lardons?|bacon)\b/.test(t) },
  { section: 'meat', test: t => /\b(lamb|mutton|veal|venison|rabbit|goat)\b/.test(t) },
  { section: 'meat', test: t => /\b(fish|salmon|tuna|cod|halibut|trout|snapper|sea bass|sea bream|tilapia|mahi[- ]mahi|swordfish|mackerel|sardine|sardines|monkfish|catfish|whiting|whole fish|fillet)\b/.test(t) && !/\b(anchovy|anchovies|sauce|paste|canned|tinned|dried|powder)\b/.test(t) },
  { section: 'meat', test: t => /\b(shrimp|prawn|prawns|crab|lobster|crawfish|crayfish|scallop|scallops|squid|calamari|octopus|mussel|mussels|clam|clams|oyster|oysters)\b/.test(t) && !/\bdried\b/.test(t) },

  // Dairy / refrigerated: cheeses, milks, creams, eggs, fresh tofu
  { section: 'dairy', test: t => /\b(milk|whole milk|2 ?%|skim|buttermilk|heavy cream|whipping cream|half[- ]and[- ]half|sour cream|crème fraîche|creme fraiche|yogurt|yoghurt|labneh|skyr|kefir)\b/.test(t) && !/\b(canned|evaporated|condensed|powdered|coconut|oat|almond|soy)\b/.test(t) },
  { section: 'dairy', test: t => /\b(unsalted butter|salted butter|cultured butter|butter|ghee|niter ?kibbeh|samna)\b/.test(t) },
  { section: 'dairy', test: t => /\b(cheese|parmesan|parmigiano|pecorino|romano|gruy[èe]re|comt[ée]|emmental|cheddar|mozzarella|burrata|ricotta|mascarpone|feta|cotija|queso|halloumi|paneer|brie|camembert|manchego|gorgonzola|stilton|roquefort|blue cheese|cream cheese|gouda|swiss|provolone|jack|pepper jack|asiago|fontina)\b/.test(t) },
  { section: 'dairy', test: t => /\b(egg|eggs|egg white|egg yolk)\b/.test(t) && !/\b(century|salted duck|tea egg|noodle|roll|wrapper|drop)\b/.test(t) },
  { section: 'dairy', test: t => /\b(silken tofu|firm tofu|extra[- ]firm tofu|aburaage|fried tofu|tofu skin|yuba)\b/.test(t) },

  // Bakery
  { section: 'bakery', test: t => /\b(bread|baguette|sourdough|brioche|focaccia|ciabatta|naan|pita|lavash|bun|buns|roll|rolls|tortilla|tortillas|english muffin|bagel|croissant|pretzel|biscuit)\b/.test(t) && !/\b(crumb|crumbs|flour|panko|crouton)\b/.test(t) },

  // Spices & dried herbs — handle BEFORE pantry catch-all
  { section: 'spices', test: t => /\b(ground|whole|toasted|dried)\s+(cumin|coriander|cardamom|fennel|fenugreek|caraway|mustard|allspice|cloves?|nutmeg|mace|black pepper|white pepper|cinnamon|ginger|turmeric|paprika)\b/.test(t) },
  { section: 'spices', test: t => /\b(allspice|bay leaf|cardamom pod|cinnamon stick|clove|coriander seed|cumin seed|fennel seed|fenugreek|grains of paradise|juniper|mustard seed|nigella|nutmeg|peppercorn|peppercorns|saffron|star anise|sumac|szechuan peppercorn|sichuan peppercorn|vanilla bean|vanilla pod)\b/.test(t) },
  { section: 'spices', test: t => /\b(paprika|chili powder|chili flake|red pepper flake|cayenne|gochugaru|aleppo|urfa|kashmiri|berbere|baharat|ras el hanout|garam masala|chaat masala|tandoori masala|chinese five[- ]spice|five[- ]spice|herbes de provence|italian seasoning|cajun seasoning|old bay|jerk seasoning|za'?atar|dukkah)\b/.test(t) },
  { section: 'spices', test: t => /\b(dried (thyme|oregano|rosemary|marjoram|basil|sage|tarragon|mint|dill|parsley|chive)|dried herb|dried herbs)\b/.test(t) },
  { section: 'spices', test: t => /\bsalt\b/.test(t) && /\b(kosher|sea|table|finishing|flaky|pink|himalayan|smoked|black)\b/.test(t) },

  // Pantry catch-alls
  { section: 'pantry', test: t => /\b(flour|cornmeal|polenta|semolina|masa|atta|teff|rice flour|tapioca starch|potato starch|cornstarch|arrowroot)\b/.test(t) },
  { section: 'pantry', test: t => /\b(sugar|brown sugar|granulated|muscovado|demerara|turbinado|powdered sugar|confectioner|coconut sugar|palm sugar|rock sugar|jaggery|honey|maple syrup|molasses|corn syrup|agave|sweetener)\b/.test(t) },
  { section: 'pantry', test: t => /\b(rice|jasmine|basmati|arborio|carnaroli|sushi rice|sticky rice|glutinous|short[- ]grain|long[- ]grain|brown rice|wild rice)\b/.test(t) },
  { section: 'pantry', test: t => /\b(pasta|noodle|noodles|spaghetti|fettuccine|linguine|penne|rigatoni|orzo|udon|soba|ramen|rice vermicelli|rice noodle|glass noodle|shirataki|lo mein|chow mein|shanghai)\b/.test(t) },
  { section: 'pantry', test: t => /\b(oil|olive oil|sesame oil|coconut oil|peanut oil|canola|grapeseed|vegetable oil|neutral oil|sunflower oil|avocado oil|palm oil|dendê|dende|lard|tallow|schmaltz|duck fat)\b/.test(t) },
  { section: 'pantry', test: t => /\b(vinegar|wine|sherry|mirin|sake|shaoxing|cooking wine)\b/.test(t) },
  { section: 'pantry', test: t => /\b(soy sauce|fish sauce|oyster sauce|hoisin|kecap|tamari|worcestershire|ponzu|teriyaki|sriracha|sambal|gochujang|doubanjiang|miso|tomato paste|tomato sauce|tomato puree|crushed tomato|whole tomato|peeled tomato|canned tomato|san marzano|salsa|harissa|chipotle|adobo|aji|tahini|hummus|olives?|capers?)\b/.test(t) },
  { section: 'pantry', test: t => /\b(canned|tinned|jarred|in a can|in syrup|in juice)\b/.test(t) },
  { section: 'pantry', test: t => /\b(broth|stock|bouillon|consomm[ée])\b/.test(t) },
  { section: 'pantry', test: t => /\b(beans|chickpea|lentil|split pea|dal|dahl|adzuki|cannellini|navy bean|pinto|kidney bean|black bean|lima bean|pigeon pea|mung bean|hominy)\b/.test(t) },
  { section: 'pantry', test: t => /\b(nuts?|almonds?|cashews?|hazelnuts?|pecans?|pistachios?|walnuts?|peanuts?|macadamias?|pine ?nuts?|chestnuts?|pepitas?|sunflower seeds?|pumpkin seeds?|sesame seeds?|chia|flax|hemp seeds?|poppy seeds?)\b/.test(t) && !/\b(milk|butter|oil)\b/.test(t) },
  { section: 'pantry', test: t => /\b(coconut milk|coconut cream|evaporated milk|condensed milk|sweetened condensed|nut milk|oat milk|almond milk|soy milk|rice milk)\b/.test(t) },
  { section: 'pantry', test: t => /\b(baking powder|baking soda|yeast|cream of tartar|gelatin|agar|cocoa|chocolate|\w+ extract|extract|flavoring|food coloring|cornflake|crouton|crumb|panko|breadcrumb|graham cracker)\b/.test(t) },
  { section: 'pantry', test: t => /\b(seaweed|nori|kombu|wakame|dulse|hijiki|katsuobushi|bonito|dashi)\b/.test(t) },
  { section: 'pantry', test: t => /\b(dried\s+\w+|tea|coffee|espresso)\b/.test(t) },
  { section: 'pantry', test: t => /\bsalt\b/.test(t) },

  // Produce catch-alls (kept last so spice/dried variants are excluded above)
  { section: 'produce', test: t => /\b(onion|shallot|leek|scallion|green onion|spring onion|chive|garlic|ginger|galangal|turmeric root|fresh turmeric|lemongrass|kaffir|curry leaf|pandan|holy basil|thai basil|basil|cilantro|coriander leaf|parsley|mint|dill|tarragon|chervil|fresh thyme|fresh oregano|fresh rosemary|fresh sage|fresh herb|culantro|rau ram|rau ngo)\b/.test(t) },
  { section: 'produce', test: t => /\b(tomato|cherry tomato|grape tomato|tomatillo|pepper|bell pepper|poblano|jalape[ñn]o|serrano|habanero|scotch bonnet|chili|chile|fresno|anaheim|shishito|padr[óo]n)\b/.test(t) && !/\b(dried|ground|powder|flake|paste|canned|smoked paprika|paprika)\b/.test(t) },
  { section: 'produce', test: t => /\b(potato|sweet potato|yam|taro|cassava|yuca|carrot|celery|celeriac|fennel|kohlrabi|turnip|rutabaga|parsnip|radish|daikon|jicama|burdock|lotus root)\b/.test(t) },
  { section: 'produce', test: t => /\b(lettuce|romaine|arugula|spinach|kale|chard|collard|mustard green|mizuna|tatsoi|bok choy|pak choi|napa|cabbage|sauerkraut|brussels sprout|broccoli|cauliflower|romanesco|asparagus|artichoke|leek|fennel)\b/.test(t) && !/\bsauerkraut\b/.test(t) /* sauerkraut is pantry */ },
  { section: 'produce', test: t => /\b(cucumber|zucchini|squash|pumpkin|delicata|kabocha|butternut|acorn|spaghetti squash|eggplant|aubergine|okra|nopal|cactus|water chestnut)\b/.test(t) },
  { section: 'produce', test: t => /\b(mushroom|button|cremini|portobello|shiitake|oyster mushroom|maitake|hen of the woods|enoki|shimeji|chanterelle|porcini|morel|king trumpet|wood ear|black fungus)\b/.test(t) && !/\bdried\b/.test(t) },
  { section: 'produce', test: t => /\b(lemon|lime|orange|grapefruit|tangerine|mandarin|clementine|calamansi|yuzu|kumquat|blood orange|meyer)\b/.test(t) && !/\b(juice|zest only|extract|paste|bottled)\b/.test(t) },
  { section: 'produce', test: t => /\b(apple|pear|peach|plum|nectarine|cherry|cherries|grape|grapes|fig|figs|mango|papaya|pineapple|melon|watermelon|cantaloupe|honeydew|kiwi|guava|passion fruit|lychee|longan|rambutan|dragonfruit|pomegranate|persimmon|date|dates|berry|berries|strawberry|strawberries|blueberry|blueberries|raspberry|raspberries|blackberry|blackberries|banana|plantain|avocado)\b/.test(t) && !/\b(dried|jam|preserve|chutney|extract|flavored|juice only|bottled)\b/.test(t) },
  { section: 'produce', test: t => /\b(corn|sweet corn|corn on the cob|edamame|snap pea|snow pea|green bean|long bean|yardlong|haricot vert|bean sprout|sprouts?|microgreens?)\b/.test(t) && !/\bdried\b/.test(t) },
];

function normalizeText(s) {
  return String(s || '').toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function bareSlug(slugRef) {
  if (!slugRef) return '';
  return String(slugRef).toLowerCase().replace(/^ingredients\//, '').trim();
}

/**
 * Classify an ingredient row into a section key.
 * @param {Object} row     — classified row from classifyIngredients(): { ing, page, ... }
 * @returns {string}       — section key (one of SECTION_ORDER), never null
 */
export function sectionFor(row) {
  if (!row || !row.ing) return 'other';
  const ing = row.ing;
  const page = row.page;

  // 1. Per-line explicit override
  if (typeof ing.shop_section === 'string' && ing.shop_section.trim()) {
    return normalizeSectionKey(ing.shop_section);
  }
  // 2. Ingredient-page override
  const pageFm = page && (page._fm || page.fm);
  if (pageFm && typeof pageFm.shop_section === 'string' && pageFm.shop_section.trim()) {
    return normalizeSectionKey(pageFm.shop_section);
  }
  // 3. Slug map
  const slug = bareSlug(ing.slug);
  if (slug && SLUG_TO_SECTION.has(slug)) return SLUG_TO_SECTION.get(slug);

  // 4. Keyword fallback on the displayed item text
  const text = normalizeText(ing.item);
  for (const rule of KEYWORD_RULES) {
    if (rule.test(text)) return rule.section;
  }
  // 5. Default
  return 'other';
}

function normalizeSectionKey(s) {
  const k = String(s).toLowerCase().trim();
  if (SECTION_LABEL[k]) return k;
  // friendly synonyms
  if (/^(produce|fresh)$/.test(k)) return 'produce';
  if (/^(meat|protein|seafood|fish|butcher)$/.test(k)) return 'meat';
  if (/^(dairy|fridge|refrigerated|eggs?)$/.test(k)) return 'dairy';
  if (/^(bakery|bread)$/.test(k)) return 'bakery';
  if (/^(frozen|freezer)$/.test(k)) return 'frozen';
  if (/^(spice|spices|herb|herbs|spices? and herbs?|seasonings?)$/.test(k)) return 'spices';
  if (/^(pantry|dry goods|shelf[- ]stable|condiments?|oils?|vinegars?|canned|cans?)$/.test(k)) return 'pantry';
  return 'other';
}
