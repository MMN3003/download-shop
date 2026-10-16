import type { ProductPlugin } from './types'
import { ankiPlugin } from './anki'

/** Register new plugins here (PDF, audio, video...). */
export const productPlugins: Record<string, ProductPlugin> = {
  [ankiPlugin.key]: ankiPlugin,
}

export function getPlugin(key: string | null | undefined): ProductPlugin | null {
  return key ? productPlugins[key] ?? null : null
}
