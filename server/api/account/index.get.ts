export default defineEventHandler(async (event) => {
  const { id } = await requireUser(event)
  const u = await prisma.user.findUniqueOrThrow({ where: { id } })
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, hasPassword: !!u.passwordHash, createdAt: u.createdAt }
})
