/** Admin pages need an owner, editor or support account; approved sellers get their own part of the panel. */
export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn, user, fetch } = useUserSession()
  if (!loggedIn.value) await fetch()
  const role = (user.value as any)?.role
  if (!loggedIn.value || !['OWNER', 'EDITOR', 'SUPPORT', 'SELLER'].includes(role)) {
    return navigateTo(useLocalePath()('/admin/login'))
  }
})
