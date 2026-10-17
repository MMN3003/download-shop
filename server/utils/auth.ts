import type { H3Event } from 'h3'

export const ADMIN_ROLES = ['OWNER', 'EDITOR', 'SUPPORT'] as const
export type AppRole = 'CUSTOMER' | 'SELLER' | 'SUPPORT' | 'EDITOR' | 'OWNER'

/** Throws 401/403 unless the signed-in user has one of `roles`. */
export async function requireRole(event: H3Event, roles: readonly AppRole[]) {
  const session = await getUserSession(event)
  const user = session.user as { id: string, role: AppRole } | undefined
  if (!user) throw createError({ statusCode: 401, message: 'Login required' })
  // The session keeps the role from login time; a promotion or demotion since then counts now
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (!row) throw createError({ statusCode: 401, message: 'Login required' })
  if (!roles.includes(row.role as AppRole)) throw createError({ statusCode: 403, message: 'Not allowed' })
  return { ...user, role: row.role as AppRole }
}

/** Catalog editing: owner and editors. */
export const requireEditor = (event: H3Event) => requireRole(event, ['OWNER', 'EDITOR'])
export const requireOwner = (event: H3Event) => requireRole(event, ['OWNER'])

export async function logAdmin(userId: string, action: string, target?: string, details?: unknown) {
  await prisma.adminLog.create({ data: { userId, action, target, details: details as any } })
}

/** The signed-in buyer (any role), or 401. */
export async function requireUser(event: H3Event) {
  const session = await getUserSession(event)
  const user = session.user as { id: string, role: AppRole } | undefined
  if (!user) throw createError({ statusCode: 401, message: 'Login required' })
  return user
}

export async function startSession(event: H3Event, user: { id: string, role: string, name: string | null, email: string | null, phone: string | null }, extra: Record<string, unknown> = {}) {
  await replaceUserSession(event, { user: { id: user.id, role: user.role, name: user.name || user.email || user.phone }, ...extra })
}

/** Support staff verify payments; the owner can too. */
export const requireSupport = (event: H3Event) => requireRole(event, ['OWNER', 'SUPPORT'])
