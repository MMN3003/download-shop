import { getPaymentMethod } from '../../../payment-methods'
import { createHash } from 'node:crypto'
import { z } from 'zod'

const fields = z.object({
  method: z.enum(['card', 'iban']),
  payerCard4: z.string().regex(/^\d{4}$/).optional().or(z.literal('')),
  reference: z.string().trim().min(4).max(40),
  transferredAt: z.string().min(1),
})
const MAX = 8 * 1024 * 1024


/** Upload a transfer receipt for a manual payment; the order then waits for an admin. */
export default defineEventHandler(async (event) => {
  const order = await ownOrder(event)
  if (!['PENDING_PAYMENT', 'REJECTED'].includes(order.status)) throw createError({ statusCode: 409, message: 'This order is not waiting for a receipt' })
  const parts = await readMultipartFormData(event) ?? []
  const file = parts.find(p => p.name === 'receipt' && p.filename)
  const text = Object.fromEntries(parts.filter(p => !p.filename && p.name).map(p => [p.name!, toLatinDigits(p.data.toString('utf8'))]))
  const data = fields.parse(text)
  if (!file) throw createError({ statusCode: 422, message: 'Attach the receipt image' })
  const ext = sniffType(file.data)
  if (!ext || ext === '.gif') throw createError({ statusCode: 422, message: 'Receipt must be JPG, PNG, WEBP or PDF' })
  if (file.data.length > MAX) throw createError({ statusCode: 413, message: 'Receipt is larger than 8 MB' })
  const settings = await getSettings()
  const method = getPaymentMethod(data.method)
  if (!method?.enabled(settings)) throw createError({ statusCode: 422, message: 'This payment method is not available' })
  const transferredAt = new Date(data.transferredAt)
  if (Number.isNaN(transferredAt.getTime())) throw createError({ statusCode: 422, message: 'Invalid transfer time' })

  const receiptKey = makeKey(`receipts/${order.id}`, `r${ext}`)
  await putFile('private', receiptKey, file.data)
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        orderId: order.id, method: data.method, amount: order.total, status: 'SUBMITTED', receiptKey,
        receiptHash: createHash('sha256').update(file.data).digest('hex'),
        payerCard4: data.payerCard4 || null, reference: data.reference, transferredAt,
      },
    }),
    prisma.order.update({ where: { id: order.id }, data: { status: 'AWAITING_VERIFICATION', paymentMethod: data.method } }),
  ])
  return { ok: true }
})
