/** Pages for signed-in buyers; others go to the login page and come back after. */
export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch } = useUserSession()
  if (!loggedIn.value) await fetch()
  if (!loggedIn.value) return navigateTo({ path: useLocalePath()('/login'), query: { redirect: to.fullPath } })
})
