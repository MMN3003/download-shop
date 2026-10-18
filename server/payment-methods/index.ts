import type { PaymentMethod } from './types'
import { zarinpalMethod } from './zarinpal'
import { cardMethod, ibanMethod } from './manual'
import { torobpayMethod } from './torobpay'

export const paymentMethods: PaymentMethod[] = [zarinpalMethod, torobpayMethod, cardMethod, ibanMethod]

export function getPaymentMethod(key: string | null | undefined) {
  return paymentMethods.find(m => m.key === key) ?? null
}
