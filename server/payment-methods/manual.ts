import type { PaymentMethod } from './types'

/** Card-to-card transfer: buyer pays to the store's card and uploads the receipt. */
export const cardMethod: PaymentMethod = {
  key: 'card',
  kind: 'manual',
  name: { fa: 'کارت به کارت', en: 'Card-to-card transfer' },
  icon: 'i-lucide-credit-card',
  enabled: s => s.payments.card.enabled && !!s.payments.card.cardNumber,
  publicInfo: s => ({ cardNumber: s.payments.card.cardNumber.replace(/\D/g, ''), holder: s.payments.card.holder, bank: s.payments.card.bank }),
}

/** Bank transfer to the store's IBAN (Sheba), e.g. Paya/Satna from a bank app. */
export const ibanMethod: PaymentMethod = {
  key: 'iban',
  kind: 'manual',
  name: { fa: 'واریز به شبا', en: 'Bank transfer (IBAN)' },
  icon: 'i-lucide-landmark',
  enabled: s => s.payments.iban.enabled && !!s.payments.iban.sheba,
  publicInfo: s => ({ sheba: s.payments.iban.sheba.replace(/\s/g, '').toUpperCase(), holder: s.payments.iban.holder, bank: s.payments.iban.bank }),
}
