export default defineEventHandler(async (event) => {
  const { seller } = await approvedSeller(event, { allowPending: true })
  const items = await prisma.commissionAgreement.findMany({ where: { sellerId: seller.id }, include: agreementInclude, orderBy: { createdAt: 'desc' } })
  const { defaultCommissionPercent } = await getSettings()
  return { items, rate: await currentRate(seller.id), defaultPercent: defaultCommissionPercent }
})
