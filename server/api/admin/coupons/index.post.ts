export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const c = await saveCoupon(null, await readValidatedBody(event, couponInput.parse))
  await logAdmin(user.id, 'coupon.create', c.id, { code: c.code })
  return c
})
