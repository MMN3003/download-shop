import type { H3Event } from 'h3'
import type { Order, Payment, User } from '@prisma/client'
import type { StoreSettings } from '../utils/settings'

/**
 * A way to pay. Online methods redirect to a gateway and confirm in a
 * callback; manual methods show transfer details and wait for a receipt that
 * an admin verifies. Add a method by implementing this and registering it in
 * index.ts; checkout, orders and admin pages pick it up without changes.
 */
export interface PaymentMethod {
  key: string
  kind: 'online' | 'manual'
  name: Record<string, string>
  icon: string
  enabled: (s: StoreSettings) => boolean
  /** What the buyer sees at checkout (e.g. card number). Never secrets. */
  publicInfo: (s: StoreSettings) => Record<string, string>
  /** Online methods: create the gateway transaction and return where to send the buyer. */
  start?: (ctx: { event: H3Event, order: Order & { user: User }, payment: Payment, settings: StoreSettings, returnUrl: string }) => Promise<{ redirect: string }>
}
