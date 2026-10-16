import type { H3Event } from 'h3'

export const ADMIN_ROLES = ['OWNER', 'EDITOR', 'SUPPORT'] as const
export type AppRole = 'CUSTOMER' | 'SELLER' | 'SUPPORT' | 'EDITOR' | 'OWNER'

/** Throws 401/403 unless the signed-in user has one of `roles`. */
export async function requireRole(event: H3Event, roles: readonly AppRole[]) {
  const session = await getUserSession(event)
  const user = session.user as { id: string, role: AppRole } | undefined
  if (!user) throw createError({ statusCode: 401, message: 'Login required' })
  if (!roles.includes(user.role)) throw createError({ statusCode: 403, message: 'Not allowed' })
  return user
}

/** Catalog editing: owner and editors. */
export const requireEditor = (event: H3Event) => requireRole(event, ['OWNER', 'EDITOR'])
export const requireOwner = (event: H3Event) => requireRole(event, ['OWNER'])

export async function logAdmin(userId: string, action: string, target?: string, details?: unknown) {
  await prisma.adminLog.create({ data: { userId, action, target, details: details as any } })
}
