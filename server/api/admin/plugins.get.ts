import { productPlugins } from '../../product-plugins'

export default defineEventHandler(async (event) => {
  await requireEditor(event)
  return Object.values(productPlugins).map(p => ({ key: p.key, name: p.name, extensions: p.extensions, providesAttributes: p.providesAttributes }))
})
