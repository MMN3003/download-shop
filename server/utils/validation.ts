import { z } from 'zod'
import { plainText } from '../../shared/utils/plain-text'

const plainValues = (v: Record<string, string>) => Object.fromEntries(Object.entries(v).map(([k, s]) => [k, plainText(s, 500)]))
/** { fa: '...', en: '...' } — at least one non-empty language. Names and titles are plain text, so tags are removed. */
export const localized = z.record(z.string(), z.string()).transform(plainValues).refine(v => Object.values(v).some(s => s), 'Required')
export const localizedOptional = z.record(z.string(), z.string()).nullish()
/** Optional text shown as plain text (SEO titles, short descriptions…): tags are removed. Rich HTML fields use localizedOptional and are sanitised where they are saved. */
export const localizedText = z.record(z.string(), z.string()).transform(v => Object.fromEntries(Object.entries(v).map(([k, s]) => [k, plainText(s, 2000)]))).nullish()
export const slugSchema = z.string().trim().min(1).max(100).regex(/^[\p{L}\p{N}-]+$/u, 'Use letters, numbers and dashes')

/** Storage key of an image uploaded through Admin → uploads; anything else (a URL, a script) is refused. */
export const imageKey = z.string().max(200).regex(/^images\/[\w./-]+$/, 'Upload the image first').refine(v => !v.includes('..'), 'Upload the image first')
