// ============================================
// Translated category name
//
// Categories are stored in the database with a French name
// ("Beauté & Cosmétiques"). Displayed as-is, that name stayed French
// even when the interface was in English or Italian.
//
// We therefore translate from the `slug`, which is stable and language
// independent. If an unknown category shows up (added to the database
// later), we fall back cleanly to its original name.
// ============================================

import { getTranslation } from '../locales/translations';

// database slug → translation key
export const CATEGORY_LABEL_KEYS = {
  restaurant: 'app.activities.catRestaurants',
  coiffeur:   'app.activities.catHair',
  epicerie:   'app.activities.catGrocery',
  mode:       'app.activities.catFashion',
  beaute:     'app.activities.catBeauty',
  service:    'app.activities.catServices',
};

/**
 * Returns the category name in the current language.
 *
 * @param {Object} category  The category object ({ slug, name })
 * @param {string} language  'en' | 'fr' | 'it'
 * @returns {string}
 */
export function getCategoryLabel(category, language) {
  if (!category) return '';

  const key = CATEGORY_LABEL_KEYS[category.slug];
  if (!key) return category.name || '';

  const translated = getTranslation(key, language);
  // getTranslation returns the key itself when a translation is missing
  return translated === key ? (category.name || '') : translated;
}

export default getCategoryLabel;
