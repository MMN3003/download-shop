export default defineEventHandler(async (event) => {
  await catalogAccess(event)
  const lists = await prisma.optionList.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      attributes: { select: { key: true, name: true, productType: { select: { id: true, name: true } } } },
      sections: { select: { id: true, slug: true, name: true } },
    },
  })
  return lists.map(l => ({ ...l, items: l.items.map(i => ({ ...i, imageUrl: publicUrl(i.image) })) }))
})
