/** Admin pages need an owner, editor or support account. */
export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn, user, fetch } = useUserSession()
  if (!loggedIn.value) await fetch()
  const role = (user.value as any)?.role
  if (!loggedIn.value || !['OWNER', 'EDITOR', 'SUPPORT'].includes(role)) {
    return navigateTo(useLocalePath()('/admin/login'))
  }
})
