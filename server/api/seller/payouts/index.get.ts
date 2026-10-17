export default defineEventHandler(async (event) => {
  const { seller } = await approvedSeller(event)
  const items = await prisma.payout.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: 'desc' }, take: 100 })
  return { items, balance: await sellerBalance(seller.id), sheba: seller.sheba }
})
