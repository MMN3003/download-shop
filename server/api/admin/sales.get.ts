/**
 * Sales between `from` and `to` (dates, default the last 30 days): totals,
 * a day or month series, top products and sellers, coupons, and what each
 * seller earned and was paid in each month (the settlement).
 */
export default defineEventHandler(async (event) => {
  await requireOwner(event)
  const range = salesRange(getQuery(event) as Record<string, string>)
  return salesReport(range)
})
