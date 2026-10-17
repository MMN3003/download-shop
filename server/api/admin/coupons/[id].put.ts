export default defineEventHandler(async (event) => {
  const user = await requireEditor(event)
  const c = await saveCoupon(getRouterParam(event, 'id')!, await readValidatedBody(event, couponInput.parse))
  await logAdmin(user.id, 'coupon.update', c.id, { code: c.code })
  return c
})
