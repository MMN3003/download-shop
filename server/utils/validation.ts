import { z } from 'zod'

/** { fa: '...', en: '...' } — at least one non-empty language */
export const localized = z.record(z.string(), z.string()).refine(v => Object.values(v).some(s => s.trim()), 'Required')
export const localizedOptional = z.record(z.string(), z.string()).nullish()
export const slugSchema = z.string().trim().min(1).max(100).regex(/^[\p{L}\p{N}-]+$/u, 'Use letters, numbers and dashes')
