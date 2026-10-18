import { torobpayConfigured } from '../../payment-methods/torobpay'

export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const s = await getSettings()
  // Torob Pay's login lives in env vars; the page says when it is missing
  return { ...s, logoUrl: publicUrl(s.logo), torobpayReady: torobpayConfigured() }
})
