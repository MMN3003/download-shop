const MAX_BYTES = 500 * 1024 * 1024

/**
 * Upload a product file (multipart: file, kind=MAIN|SAMPLE|EXTRA, version, changelog).
 * A new MAIN file becomes the current version and, if the product type has a
 * plugin, is analysed to fill automatic fields and previews.
 */
export default defineEventHandler(async (event) => {
  const access = await catalogAccess(event)
  const productId = (await productForAccess(access, getRouterParam(event, 'id')!)).id
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { productType: true } })
  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })

  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 400, message: 'No file uploaded' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, message: 'File is too large' })
  const field = (n: string) => parts!.find(p => p.name === n)?.data.toString('utf8')
  const kind = (field('kind') || 'MAIN') as 'MAIN' | 'SAMPLE' | 'EXTRA'
  const filename = file.filename!

  const analysis = kind === 'MAIN' ? await analyzeWithPlugin(product.productType.plugin, file.data, filename) : null

  const storageKey = makeKey(`products/${productId}`, filename)
  await putFile('private', storageKey, file.data)
  if (kind !== 'EXTRA') await prisma.productFile.updateMany({ where: { productId, kind }, data: { isCurrent: false } })
  const row = await prisma.productFile.create({
    data: {
      productId, kind, filename, storageKey, size: file.data.length, mimeType: file.type,
      version: field('version') || '1.0', changelog: field('changelog') || null,
      analysis: (analysis?.summary ?? undefined) as any,
    },
  })
  if (analysis) {
    await applyPluginAnalysis(productId, analysis)
    await refreshSearchText(productId)
  }
  // A new file from an untrusted seller is checked before buyers get it
  const status = sellerStatus(access, product.status, product)
  if (status !== product.status) await prisma.product.update({ where: { id: productId }, data: { status: status as any } })
  await logAdmin(access.user.id, 'product.file.upload', productId, { file: row.id, kind })
  const { storageKey: _k, ...out } = row
  return { file: out, analysis: analysis ? { attributes: analysis.attributes, previews: analysis.previews.length } : null }
})
