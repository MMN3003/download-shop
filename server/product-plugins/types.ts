/**
 * A product plugin adds smart behaviour to a product type: it reads the
 * uploaded main file and returns attribute values and preview items.
 * Products whose type has no plugin still work with plain files.
 */
export interface PluginMediaFile {
  name: string
  data: Uint8Array
}

export interface PluginPreview {
  /** Front-end component key, e.g. "anki-card" */
  kind: string
  data: Record<string, unknown>
  /** Media this preview references, saved to public storage by the core */
  media?: PluginMediaFile[]
}

export interface PluginAnalysis {
  /** Values keyed by attribute `key`; only keys defined on the type are saved. */
  attributes: Record<string, string | number | boolean | string[]>
  previews: PluginPreview[]
  /** Free-form summary stored on the file row */
  summary?: Record<string, unknown>
}

export interface ProductPlugin {
  key: string
  name: Record<string, string>
  /** File extensions this plugin understands, e.g. [".apkg"] */
  extensions: string[]
  /** Attribute keys this plugin fills, so admins can add them to a type in one click */
  providesAttributes: { key: string, kind: 'TEXT' | 'NUMBER' | 'BOOLEAN', name: Record<string, string> }[]
  analyze(file: Uint8Array, filename: string): Promise<PluginAnalysis>
}

/** Thrown when an uploaded file can't be read; shown to the uploader. */
export class PluginError extends Error {
  statusCode = 422
}
