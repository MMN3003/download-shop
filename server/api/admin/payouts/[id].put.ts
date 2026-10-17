import { z } from 'zod'

const body = z.object({
  action: z.enum(['paid', 'reject']),
  reference: z.string().optional().transform(v => plainText(v, 100) || null),
  note: z.string().optional().transform(v => plainText(v, 1000) || null),
}).refine(v => v.action !== 'paid' || v.reference, { message: 'Enter the bank transfer reference', path: ['reference'] })

/** Record that a payout was transferred, or turn it down (the amount goes back to the balance). */
export default defineEventHandler(async (event) => {
  const admin = await requireOwner(event)
  const { action, reference, note } = await readValidatedBody(event, body.parse)
  const p = await prisma.payout.findUnique({ where: { id: getRouterParam(event, 'id')! } })
  if (!p) throw createError({ statusCode: 404, message: 'Not found' })
  const done = await prisma.payout.updateMany({
    where: { id: p.id, status: 'REQUESTED' },
    data: action === 'paid' ? { status: 'PAID', reference, note, paidAt: new Date() } : { status: 'REJECTED', note },
  })
  if (!done.count) throw createError({ statusCode: 409, message: 'Already handled' })
  await notifySeller(p.sellerId, 'Payout', action === 'paid'
    ? `مبلغ ${p.amount.toLocaleString('fa-IR')} تومان به حساب شما واریز شد. شماره پیگیری: ${reference}`
    : `درخواست تسویه ${p.amount.toLocaleString('fa-IR')} تومان رد شد.${note ? ` ${note}` : ''}`)
  await logAdmin(admin.id, `payout.${action}`, p.id, { reference })
  return { ok: true }
})
