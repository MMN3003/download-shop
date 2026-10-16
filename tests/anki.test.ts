import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analyzeApkg } from '../server/product-plugins/anki'
import { renderTemplate, sanitizeCardHtml, rewriteMedia } from '../server/product-plugins/anki-render'

describe('anki plugin', () => {
  it('reads counts, decks and previews from an .apkg', async () => {
    const res = await analyzeApkg(new Uint8Array(readFileSync('tests/fixtures/sample.apkg')))
    expect(res.attributes.card_count).toBe(604)
    expect(res.attributes.note_count).toBe(302)
    expect(String(res.attributes.subdecks)).toContain('Level 1 - Easy')
    expect(res.previews.length).toBe(12)
    expect(String(res.previews[0]!.data.front)).toContain('class="ar"')
    expect(String(res.previews[0]!.data.back)).toContain('class="fa"')
  })

  it('rejects files that are not decks', async () => {
    await expect(analyzeApkg(new TextEncoder().encode('hello'))).rejects.toThrow(/apkg/)
  })
})

describe('template renderer', () => {
  const fields = { Front: 'سلام', Back: 'hello', Extra: '' }
  it('fills fields and FrontSide', () => {
    const front = renderTemplate('{{Front}}', fields, { side: 'front' })
    expect(renderTemplate('{{FrontSide}}<hr>{{Back}}', fields, { side: 'back', frontSide: front })).toBe('سلام<hr>hello')
  })
  it('handles conditional sections', () => {
    expect(renderTemplate('{{#Extra}}x{{/Extra}}{{^Extra}}none{{/Extra}}', fields, { side: 'front' })).toBe('none')
  })
  it('handles cloze', () => {
    const f = { Text: 'Baghdad is in {{c1::Iraq}}' }
    expect(renderTemplate('{{cloze:Text}}', f, { side: 'front', clozeOrd: 1 })).toContain('[...]')
    expect(renderTemplate('{{cloze:Text}}', f, { side: 'back', clozeOrd: 1 })).toContain('Iraq')
  })
  it('strips scripts and handlers', () => {
    expect(sanitizeCardHtml('<b onclick="x()">a</b><script>alert(1)</script>')).toBe('<b>a</b>')
  })
  it('rewrites media', () => {
    expect(rewriteMedia('[sound:a.mp3]<img src="b.png">', n => `/media/x/${n}`))
      .toBe('<audio controls preload="none" src="/media/x/a.mp3"></audio><img src="/media/x/b.png">')
  })
})
