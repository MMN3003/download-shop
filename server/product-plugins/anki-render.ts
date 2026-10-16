/**
 * Minimal Anki template renderer for store previews. Supports the common
 * template syntax: {{Field}}, {{FrontSide}}, {{#Field}}..{{/Field}},
 * {{^Field}}..{{/Field}}, {{text:Field}}, {{hint:Field}}, {{type:Field}}
 * and {{cloze:Field}}. It does not need to match Anki exactly; it only has
 * to show buyers what the cards look like.
 */

export type FieldMap = Record<string, string>

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '')

function renderCloze(text: string, ord: number, side: 'front' | 'back'): string {
  return text.replace(/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g, (_m, n, answer, hint) => {
    if (Number(n) !== ord) return answer
    if (side === 'back') return `<span class="cloze">${answer}</span>`
    return `<span class="cloze">[${hint || '...'}]</span>`
  })
}

function renderSections(tpl: string, fields: FieldMap): string {
  // Conditional sections, innermost first, repeated until stable
  const re = /\{\{([#^])\s*([^}]+?)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g
  let prev: string
  let out = tpl
  do {
    prev = out
    out = out.replace(re, (_m, kind, name, body) => {
      const has = stripHtml(fields[name] ?? '').trim() !== ''
      return (kind === '#' ? has : !has) ? body : ''
    })
  } while (out !== prev)
  return out
}

export function renderTemplate(
  tpl: string,
  fields: FieldMap,
  opts: { side: 'front' | 'back', frontSide?: string, clozeOrd?: number },
): string {
  let out = renderSections(tpl, fields)
  out = out.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, raw: string) => {
    if (raw === 'FrontSide') return opts.frontSide ?? ''
    const parts = raw.split(':')
    const name = parts.pop()!.trim()
    const filters = parts.map(p => p.trim())
    let value = fields[name] ?? ''
    for (const f of filters) {
      if (f === 'text') value = stripHtml(value)
      else if (f === 'type') value = ''
      else if (f === 'hint') value = value ? `<details><summary>Hint</summary>${value}</details>` : ''
      else if (f === 'cloze') value = renderCloze(value, opts.clozeOrd ?? 1, opts.side)
    }
    return value
  })
  return out
}

/** Remove scripts and inline event handlers from deck HTML. */
export function sanitizeCardHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<(iframe|object|embed)[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

/** Names of media files a piece of card HTML refers to. */
export function referencedMedia(html: string): string[] {
  const names = new Set<string>()
  for (const m of html.matchAll(/\[sound:([^\]]+)\]/g)) names.add(m[1]!)
  for (const m of html.matchAll(/<img[^>]+src=["']?([^"' >]+)/gi)) names.add(m[1]!)
  return [...names].filter(n => !/^(https?:|data:)/i.test(n))
}

/** Point media references at `baseUrl` and turn [sound:x] into audio players. */
export function rewriteMedia(html: string, urlFor: (name: string) => string | null): string {
  return html
    .replace(/\[sound:([^\]]+)\]/g, (_m, name) => {
      const url = urlFor(name)
      return url ? `<audio controls preload="none" src="${url}"></audio>` : ''
    })
    .replace(/(<img[^>]+src=["']?)([^"' >]+)/gi, (m, pre, name) => {
      if (/^(https?:|data:)/i.test(name)) return m
      const url = urlFor(name)
      return url ? pre + url : m
    })
}
