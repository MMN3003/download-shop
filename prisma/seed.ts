/**
 * Demo data: an owner account, the "Anki deck" product type, a few sections
 * and the three Iraqi Arabic decks (files are analysed by the Anki plugin).
 * Safe to run more than once. Usage: pnpm db:seed
 */
import { readFileSync } from 'node:fs'
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { prisma } from '../server/utils/prisma'
import { makeKey, putFile } from '../server/utils/storage'
import { applyPluginAnalysis, refreshSearchText, writeAttributes } from '../server/utils/catalog'
import { ankiPlugin, analyzeApkg } from '../server/product-plugins/anki'

const hash = new Hash(new Scrypt({}))
const L = (fa: string, en: string) => ({ fa, en })

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin1234'
  const owner = await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Admin', role: 'OWNER', passwordHash: await hash.make(password) },
    update: { role: 'OWNER' },
  })
  const seller = await prisma.seller.upsert({
    where: { userId: owner.id },
    create: { userId: owner.id, slug: 'store', displayName: 'فروشگاه', status: 'approved' },
    update: {},
  })

  // Product type with its custom fields; the Anki plugin fills the auto fields
  const languages = [
    { value: 'ar-iq', label: L('عربی عراقی', 'Iraqi Arabic') },
    { value: 'ar', label: L('عربی فصیح', 'Standard Arabic') },
    { value: 'en', label: L('انگلیسی', 'English') },
    { value: 'de', label: L('آلمانی', 'German') },
    { value: 'fr', label: L('فرانسوی', 'French') },
    { value: 'tr', label: L('ترکی استانبولی', 'Turkish') },
    { value: 'it', label: L('ایتالیایی', 'Italian') },
    { value: 'fa', label: L('فارسی', 'Persian') },
  ]
  const anki = await prisma.productType.upsert({
    where: { key: 'anki-deck' },
    create: { key: 'anki-deck', name: L('فلش‌کارت انکی', 'Anki deck'), plugin: 'anki', icon: 'i-lucide-layers' },
    update: {},
  })
  const attrs = [
    { key: 'language', name: L('زبان آموزشی', 'Language taught'), kind: 'SELECT', options: languages, filterable: true, showAsBadge: true },
    { key: 'translation', name: L('زبان ترجمه', 'Translated into'), kind: 'MULTISELECT', options: languages, filterable: true },
    { key: 'level', name: L('سطح', 'Level'), kind: 'SELECT', filterable: true, showAsBadge: true, options: [
      { value: 'beginner', label: L('مبتدی', 'Beginner') },
      { value: 'intermediate', label: L('متوسط', 'Intermediate') },
      { value: 'advanced', label: L('پیشرفته', 'Advanced') },
      { value: 'all', label: L('همه سطوح', 'All levels') },
    ] },
    { key: 'card_directions', name: L('جهت کارت‌ها', 'Card directions'), kind: 'SELECT', options: [
      { value: 'one', label: L('یک‌طرفه', 'One-way') },
      { value: 'two', label: L('دوطرفه', 'Two-way') },
    ] },
    ...ankiPlugin.providesAttributes.map(a => ({ ...a, autoFilled: true, filterable: a.key === 'has_audio', showAsBadge: a.key === 'card_count' })),
  ]
  for (const [i, a] of attrs.entries()) {
    const data = { name: a.name, kind: a.kind as any, options: (a as any).options, filterable: !!(a as any).filterable, showAsBadge: !!(a as any).showAsBadge, autoFilled: !!(a as any).autoFilled, sortOrder: i }
    await prisma.attributeDefinition.upsert({
      where: { productTypeId_key: { productTypeId: anki.id, key: a.key } },
      create: { productTypeId: anki.id, key: a.key, ...data },
      update: data,
    })
  }
  await prisma.attributeDefinition.update({ where: { productTypeId_key: { productTypeId: anki.id, key: 'card_count' } }, data: { unit: L('کارت', 'cards') } })

  // A second, plugin-free type shows the store is not tied to flashcards
  await prisma.productType.upsert({
    where: { key: 'ebook' },
    create: {
      key: 'ebook', name: L('کتاب الکترونیکی', 'E-book'), icon: 'i-lucide-book-open',
      attributes: { create: [
        { key: 'author', name: L('نویسنده', 'Author'), kind: 'TEXT', sortOrder: 0 },
        { key: 'pages', name: L('تعداد صفحات', 'Pages'), kind: 'NUMBER', showAsBadge: true, unit: L('صفحه', 'pages'), sortOrder: 1 },
        { key: 'format', name: L('فرمت', 'Format'), kind: 'MULTISELECT', filterable: true, showAsBadge: true, sortOrder: 2, options: [
          { value: 'pdf', label: L('PDF', 'PDF') }, { value: 'epub', label: L('EPUB', 'EPUB') },
        ] },
      ] },
    },
    update: {},
  })

  // Sections
  const section = async (slug: string, name: Record<string, string>, parentId: string | null, sortOrder: number, extra: object = {}) =>
    prisma.section.upsert({ where: { slug }, create: { slug, name, parentId, sortOrder, ...extra }, update: {} })
  const langs = await section('languages', L('آموزش زبان', 'Languages'), null, 0, { showOnHome: true, icon: 'i-lucide-languages', description: L('فلش‌کارت و منابع یادگیری زبان‌های خارجی', 'Flashcards and resources for learning languages') })
  const arabic = await section('arabic', L('عربی', 'Arabic'), langs.id, 0, { showOnHome: true, icon: 'i-lucide-moon-star' })
  const iraqi = await section('iraqi-arabic', L('لهجه عراقی', 'Iraqi dialect'), arabic.id, 0)
  await section('english', L('انگلیسی', 'English'), langs.id, 1, { showOnHome: true, icon: 'i-lucide-globe' })
  await section('german', L('آلمانی', 'German'), langs.id, 2)
  await section('university', L('دانشگاهی', 'University'), null, 1, { showOnHome: true, icon: 'i-lucide-graduation-cap' })
  await section('school', L('مدرسه', 'School'), null, 2, { icon: 'i-lucide-school' })
  await section('misc', L('متفرقه', 'Miscellaneous'), null, 3, { icon: 'i-lucide-shapes' })

  const decks = [
    {
      slug: 'iraqi-arabic-daily-conversation', file: 'Iraqi_Arabic_Daily_Conversation.apkg', price: 149000, salePrice: 119000, featured: true, level: 'beginner', directions: 'two',
      title: L('۳۰۲ جمله مکالمه روزمره عراقی', 'Iraqi Arabic Daily Conversation (302 phrases)'),
      shortDesc: L('جمله‌های پرکاربرد روزمره با ترجمه فارسی و انگلیسی و آوانویسی', 'Everyday phrases with Persian and English translation and transliteration'),
      description: L('<p>این بسته شامل ۳۰۲ جمله پرکاربرد لهجه عراقی در سه سطح است. هر جمله دو کارت دارد: عربی به معنی و معنی به عربی.</p>', '<p>302 high-frequency Iraqi Arabic phrases in three levels. Each phrase has two cards: Arabic → meaning and meaning → Arabic.</p>'),
      learn: { fa: ['سلام و احوالپرسی', 'خرید و رفت‌وآمد', 'گفتگوهای روزمره'], en: ['Greetings', 'Shopping and getting around', 'Everyday conversations'] },
    },
    {
      slug: 'iraqi-arabic-1500-words', file: 'Iraqi_Arabic_1500_Words.apkg', price: 199000, featured: true, level: 'all', directions: 'one',
      title: L('۱۵۰۰ لغت پرکاربرد عربی عراقی', 'Iraqi Arabic 1500 Words'),
      shortDesc: L('۱۵۰۰ واژه ضروری لهجه عراقی، دسته‌بندی‌شده در سه سطح', '1500 essential Iraqi Arabic words in three levels'),
      description: L('<p>۱۵۰۰ لغت لهجه عراقی از پایه تا اصطلاحات عامیانه، با آوانویسی و معنی فارسی و انگلیسی.</p>', '<p>1500 Iraqi Arabic words from core vocabulary to slang, with transliteration and Persian and English meanings.</p>'),
      learn: { fa: ['ضمایر و افعال پایه', 'لغات روزمره', 'اصطلاحات عامیانه'], en: ['Pronouns and core verbs', 'Everyday words', 'Slang'] },
    },
    {
      slug: 'iraqi-arabic-dorm-university', file: 'Iraqi_Arabic_Dorm_University_1500.apkg', price: 179000, level: 'intermediate', directions: 'one',
      title: L('۱۵۰۰ جمله عراقی برای خوابگاه و دانشگاه', 'Iraqi Arabic for Dorm & University (1500 sentences)'),
      shortDesc: L('جمله‌ها و دیالوگ‌های کوتاه برای زندگی دانشجویی در عراق', 'Sentences and short dialogues for student life in Iraq'),
      description: L('<p>مخصوص دانشجویانی که در عراق زندگی می‌کنند: ثبت‌نام، خوابگاه، کلاس، استاد و هم‌اتاقی.</p>', '<p>For students living in Iraq: registration, dorm life, classes, professors and roommates.</p>'),
      learn: { fa: ['ثبت‌نام و خوابگاه', 'کلاس و امتحان', 'گفتگو با هم‌اتاقی'], en: ['Registration and dorm', 'Classes and exams', 'Talking with roommates'] },
    },
  ]

  for (const d of decks) {
    const data = {
      productTypeId: anki.id, sellerId: seller.id, status: 'PUBLISHED' as const, featured: !!d.featured,
      title: d.title, shortDesc: d.shortDesc, description: d.description, learnPoints: d.learn,
      price: d.price, salePrice: d.salePrice ?? null, tags: ['عراقی', 'iraqi', 'arabic'], publishedAt: new Date(),
    }
    const p = await prisma.product.upsert({ where: { slug: d.slug }, create: { slug: d.slug, ...data }, update: data })
    await prisma.productSection.upsert({ where: { productId_sectionId: { productId: p.id, sectionId: iraqi.id } }, create: { productId: p.id, sectionId: iraqi.id }, update: {} })
    await prisma.$transaction(tx => writeAttributes(tx, p.id, anki.id, { language: 'ar-iq', translation: ['fa', 'en'], level: d.level, card_directions: d.directions }))

    if (!(await prisma.productFile.count({ where: { productId: p.id, kind: 'MAIN' } }))) {
      const buf = readFileSync(new URL(`./seed-files/${d.file}`, import.meta.url))
      const analysis = await analyzeApkg(new Uint8Array(buf))
      const storageKey = makeKey(`products/${p.id}`, d.file)
      await putFile('private', storageKey, buf)
      await prisma.productFile.create({ data: { productId: p.id, kind: 'MAIN', filename: d.file, storageKey, size: buf.length, version: '1.0', analysis: analysis.summary as any } })
      await applyPluginAnalysis(p.id, analysis)
    }
    await refreshSearchText(p.id)
    console.log('✓', d.slug)
  }
  console.log(`\nOwner login: ${email} / ${process.env.SEED_ADMIN_PASSWORD ? '(SEED_ADMIN_PASSWORD)' : password}`)
}

main().finally(() => prisma.$disconnect())
