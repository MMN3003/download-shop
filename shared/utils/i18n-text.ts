/** Text stored in several languages: { fa: '...', en: '...' } */
export type LocalizedText = Record<string, string>

/** Pick the text for `locale`, falling back to Persian, English, then any value. */
export function localize(text: unknown, locale: string): string {
  if (text == null) return ''
  if (typeof text === 'string') return text
  const t = text as LocalizedText
  return t[locale] || t.fa || t.en || Object.values(t).find(Boolean) || ''
}

/**
 * Normalise text for search: Arabic ي/ك → Persian ی/ک, remove diacritics,
 * zero-width non-joiners and tatweel, convert Persian/Arabic digits, lowercase.
 */
export function normalizeSearch(input: string): string {
  return input
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[‌‍]/g, ' ')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(input: string): string {
  return normalizeSearch(input)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
