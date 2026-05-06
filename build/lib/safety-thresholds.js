/**
 * USDA published-safe instantaneous internal-temperature thresholds, in °F.
 * Source of truth for validate-safety. When FSIS revises a number (as it
 * did with pork in 2011), update here and re-run npm run validate:all to
 * surface any recipes whose published targets now sit below the new line.
 *
 * The validator treats a temperature reading at or above the threshold as
 * "USDA-clean, no annotation needed." A reading below the threshold needs
 * a safety_notes[] entry pointing into content/safety/ explaining the
 * pasteurization-equivalency or technique reason it is still safe.
 */

export const USDA_THRESHOLD_F = {
  // Whole-muscle protein
  poultry: 165,            // chicken, turkey, duck, goose, game birds — instantaneous
  pork:    145,            // whole-muscle pork (USDA 2011 revision; +3-min rest)
  beef:    145,            // whole-muscle steaks and roasts (+3-min rest)
  lamb:    145,            // whole-muscle (+3-min rest)
  veal:    145,
  fish:    145,            // fin fish

  // Ground / mechanically tenderized — different rules, surface contamination
  // is now distributed throughout the mass.
  'ground-beef':    160,
  'ground-pork':    160,
  'ground-lamb':    160,
  'ground-poultry': 165,

  // Egg dishes that aren't categorically cooked-through (custards, sauces).
  egg: 160,
};

/**
 * Protein keyword → threshold key. Used by the regex scanner to map a hit
 * to the USDA threshold to compare against. Keep this list lowercase.
 */
export const PROTEIN_KEYWORDS = {
  chicken:    'poultry',
  turkey:     'poultry',
  duck:       'poultry',
  goose:      'poultry',
  poultry:    'poultry',
  pork:       'pork',
  tenderloin: 'pork',     // most-common context in this library
  'pork loin': 'pork',
  'pork chop': 'pork',
  'pork shoulder': 'pork',
  beef:       'beef',
  steak:      'beef',
  ribeye:     'beef',
  brisket:    'beef',
  lamb:       'lamb',
  veal:       'veal',
  salmon:     'fish',
  tuna:       'fish',
  cod:        'fish',
  halibut:    'fish',
  trout:      'fish',
  fish:       'fish',
};
