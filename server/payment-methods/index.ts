import type { PaymentMethod } from './types'
import { zarinpalMethod } from './zarinpal'
import { cardMethod, ibanMethod } from './manual'

export const paymentMethods: PaymentMethod[] = [zarinpalMethod, cardMethod, ibanMethod]

export function getPaymentMethod(key: string | null | undefined) {
  return paymentMethods.find(m => m.key === key) ?? null
}
