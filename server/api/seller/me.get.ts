/** The signed-in user's seller account (or null), with rate and balance once approved. */
export default defineEventHandler(async (event) => {
  const session = await requireUser(event)
  const user = await prisma.user.findUnique({ where: { id: session.id }, include: { seller: true } })
  if (!user) throw createError({ statusCode: 401, message: 'Login required' })
  // Approval changes the role; refresh the session so the panel opens without logging in again
  if (user.role !== session.role) await startSession(event, user)
  const { marketplace, defaultCommissionPercent: defaultPercent } = await getSettings()
  const s = user.seller
  if (!s) return { seller: null, sellersOpen: marketplace.sellersOpen, defaultPercent }
  const approved = s.status === 'approved'
  return {
    sellersOpen: marketplace.sellersOpen,
    defaultPercent,
    seller: { ...s, avatarUrl: publicUrl(s.avatar) },
    rate: await currentRate(s.id),
    balance: approved ? await sellerBalance(s.id) : null,
    products: approved ? await prisma.product.groupBy({ by: ['status'], where: { sellerId: s.id }, _count: true }) : [],
  }
})
