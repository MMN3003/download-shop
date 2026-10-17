export default defineEventHandler(async (event) => {
  const b = await prisma.bundle.findFirst({ where: { slug: getRouterParam(event, 'slug')!, active: true }, include: bundleInclude })
  const out = b && toPublicBundle(b)
  if (!out || out.products.length < 2) throw createError({ statusCode: 404, message: 'Not found' })
  return out
})
