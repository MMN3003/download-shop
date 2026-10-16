import JSZip from 'jszip'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { decompress } from 'fzstd'
import { createRequire } from 'node:module'
import { PluginError, type PluginAnalysis, type PluginMediaFile, type PluginPreview, type ProductPlugin } from './types'
import { referencedMedia, renderTemplate, sanitizeCardHtml, type FieldMap } from './anki-render'

const PREVIEW_CARDS = 12
const MAX_PREVIEW_MEDIA_BYTES = 2 * 1024 * 1024

let sqlPromise: Promise<SqlJsStatic> | null = null
function sql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const require = createRequire(import.meta.url)
    const wasm = require.resolve('sql.js/dist/sql-wasm.wasm')
    sqlPromise = initSqlJs({ locateFile: () => wasm })
  }
  return sqlPromise
}

interface NoteType {
  id: string
  name: string
  css: string
  isCloze: boolean
  fields: string[]
  templates: { name: string, qfmt: string, afmt: string }[]
}

function rows<T = Record<string, unknown>>(db: Database, query: string): T[] {
  const res = db.exec(query)
  if (!res.length) return []
  const { columns, values } = res[0]!
  return values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]])) as T)
}

function hasTable(db: Database, name: string): boolean {
  return rows(db, `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`).length > 0
}

/** Note types from the legacy JSON column (Anki 2.0/2.1 exports, genanki). */
function legacyNoteTypes(db: Database): NoteType[] {
  const col = rows<{ models: string }>(db, 'SELECT models FROM col')[0]
  if (!col?.models) return []
  const models = JSON.parse(col.models) as Record<string, any>
  return Object.values(models).map(m => ({
    id: String(m.id),
    name: m.name,
    css: m.css || '',
    isCloze: m.type === 1,
    fields: (m.flds || []).sort((a: any, b: any) => a.ord - b.ord).map((f: any) => f.name),
    templates: (m.tmpls || []).sort((a: any, b: any) => a.ord - b.ord)
      .map((t: any) => ({ name: t.name, qfmt: t.qfmt, afmt: t.afmt })),
  }))
}

/**
 * Note types from the newer schema (Anki 2.1.28+). Templates are stored in
 * protobuf blobs there; instead of decoding them we show the note's fields.
 */
function modernNoteTypes(db: Database): NoteType[] {
  if (!hasTable(db, 'notetypes')) return []
  const types = rows<{ id: number, name: string }>(db, 'SELECT id, name FROM notetypes')
  const fields = rows<{ ntid: number, ord: number, name: string }>(db, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')
  return types.map(t => {
    const names = fields.filter(f => f.ntid === t.id).map(f => f.name)
    const back = names.slice(1).map(n => `{{#${n}}}<div>{{${n}}}</div>{{/${n}}}`).join('')
    return {
      id: String(t.id),
      name: t.name,
      css: '',
      isCloze: false,
      fields: names,
      templates: [{ name: 'Card 1', qfmt: `{{${names[0] ?? ''}}}`, afmt: `{{FrontSide}}<hr id="answer">${back}` }],
    }
  })
}

function deckNames(db: Database): string[] {
  let names: string[] = []
  if (hasTable(db, 'decks')) {
    names = rows<{ name: string }>(db, 'SELECT name FROM decks').map(d => d.name.replace(/\x1f/g, '::'))
  }
  else {
    const col = rows<{ decks: string }>(db, 'SELECT decks FROM col')[0]
    if (col?.decks) names = Object.values(JSON.parse(col.decks) as Record<string, any>).map(d => d.name)
  }
  return names.filter(n => n !== 'Default').sort()
}

async function openCollection(zip: JSZip): Promise<Uint8Array> {
  const modern = zip.file('collection.anki21b')
  if (modern) return decompress(await modern.async('uint8array'))
  const file = zip.file('collection.anki21') || zip.file('collection.anki2')
  if (!file) throw new PluginError('Not a valid .apkg file (no collection inside)')
  return file.async('uint8array')
}

/** Map of media filename → zip entry name. Only the legacy JSON map is read. */
async function mediaMap(zip: JSZip): Promise<Record<string, string>> {
  const file = zip.file('media')
  if (!file) return {}
  const raw = await file.async('uint8array')
  try {
    const json = JSON.parse(new TextDecoder().decode(raw)) as Record<string, string>
    return Object.fromEntries(Object.entries(json).map(([entry, name]) => [name, entry]))
  }
  catch {
    return {} // newer exports use a compressed protobuf map
  }
}

/** Pick `n` items spread evenly through the list. */
function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list
  const step = list.length / n
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]!)
}

export async function analyzeApkg(file: Uint8Array): Promise<PluginAnalysis> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  }
  catch {
    throw new PluginError('Not a valid .apkg file (not a zip archive)')
  }
  const SQL = await sql()
  const db = new SQL.Database(await openCollection(zip))
  try {
    const noteTypes = [...legacyNoteTypes(db), ...modernNoteTypes(db)]
    const byId = new Map(noteTypes.map(t => [t.id, t]))
    const cardCount = Number(rows<{ n: number }>(db, 'SELECT count(*) AS n FROM cards')[0]?.n ?? 0)
    const notes = rows<{ id: number, mid: number, flds: string }>(db, 'SELECT id, mid, flds FROM notes ORDER BY id')
    const decks = deckNames(db)
    const allText = notes.map(n => n.flds).join('\n')
    const media = await mediaMap(zip)
    const mediaEntries = Object.keys(zip.files).filter(n => /^\d+$/.test(n)).length

    const previews: PluginPreview[] = []
    for (const note of spread(notes, PREVIEW_CARDS)) {
      const type = byId.get(String(note.mid))
      if (!type) continue
      const values = note.flds.split('\x1f')
      const fields: FieldMap = Object.fromEntries(type.fields.map((name, i) => [name, values[i] ?? '']))
      const tpl = type.templates[0]
      if (!tpl) continue
      const clozeOrd = type.isCloze ? 1 : undefined
      const front = sanitizeCardHtml(renderTemplate(tpl.qfmt, fields, { side: 'front', clozeOrd }))
      const back = sanitizeCardHtml(renderTemplate(tpl.afmt, fields, { side: 'back', frontSide: front, clozeOrd }))

      const previewMedia: PluginMediaFile[] = []
      let bytes = 0
      for (const name of referencedMedia(front + back)) {
        const entry = media[name]
        const zf = entry ? zip.file(entry) : null
        if (!zf) continue
        const data = await zf.async('uint8array')
        if (bytes + data.length > MAX_PREVIEW_MEDIA_BYTES) continue
        bytes += data.length
        previewMedia.push({ name, data })
      }
      previews.push({ kind: 'anki-card', data: { front, back, css: type.css, noteType: type.name, template: tpl.name }, media: previewMedia })
    }

    return {
      attributes: {
        card_count: cardCount,
        note_count: notes.length,
        subdecks: decks.join('\n'),
        has_audio: /\[sound:/.test(allText),
        has_images: /<img/i.test(allText),
        media_count: mediaEntries,
      },
      previews,
      summary: {
        cardCount,
        noteCount: notes.length,
        decks,
        noteTypes: noteTypes.map(t => ({ name: t.name, fields: t.fields, templates: t.templates.map(x => x.name) })),
        mediaCount: mediaEntries,
      },
    }
  }
  finally {
    db.close()
  }
}

export const ankiPlugin: ProductPlugin = {
  key: 'anki',
  name: { fa: 'فلش‌کارت انکی (.apkg)', en: 'Anki deck (.apkg)' },
  extensions: ['.apkg', '.colpkg'],
  providesAttributes: [
    { key: 'card_count', kind: 'NUMBER', name: { fa: 'تعداد کارت', en: 'Cards' } },
    { key: 'note_count', kind: 'NUMBER', name: { fa: 'تعداد یادداشت', en: 'Notes' } },
    { key: 'subdecks', kind: 'TEXT', name: { fa: 'زیردسته‌ها', en: 'Sub-decks' } },
    { key: 'has_audio', kind: 'BOOLEAN', name: { fa: 'صوت دارد', en: 'Has audio' } },
    { key: 'has_images', kind: 'BOOLEAN', name: { fa: 'تصویر دارد', en: 'Has images' } },
    { key: 'media_count', kind: 'NUMBER', name: { fa: 'تعداد فایل رسانه', en: 'Media files' } },
  ],
  analyze: file => analyzeApkg(file),
}
