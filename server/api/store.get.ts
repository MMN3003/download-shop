/** Data every storefront page needs: settings, section tree, filterable attributes. */
export default defineEventHandler(async () => {
  const [settings, sections, types] = await Promise.all([
    getSettings(),
    prisma.section.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, slug: true, name: true, icon: true, parentId: true, showOnHome: true } }),
    prisma.productType.findMany({ where: { enabled: true }, include: { attributes: { where: { filterable: true }, orderBy: { sortOrder: 'asc' } } } }),
  ])
  return {
    settings: {
      storeName: settings.storeName, tagline: settings.tagline, logo: publicUrl(settings.logo),
      currency: settings.currency, currencyLabel: settings.currencyLabel, social: settings.social,
    },
    sections,
    productTypes: types.map(t => ({
      key: t.key, name: t.name, icon: t.icon,
      filters: t.attributes.map(a => ({ key: a.key, name: a.name, kind: a.kind, options: a.options, unit: a.unit })),
    })),
  }
})
