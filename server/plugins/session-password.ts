/** nuxt-auth-utils needs a 32+ character password for session cookies; without one every request that reads the session fails with a 500. */
export default defineNitroPlugin(() => {
  const password = process.env.NUXT_SESSION_PASSWORD ?? ''
  if (password.length >= 32) return
  const message = `NUXT_SESSION_PASSWORD is ${password ? `only ${password.length} characters` : 'not set'}; it must be at least 32. `
    + 'Copy .env.development.example to .env.development, or set it in .env (generate one with: openssl rand -base64 32).'
  if (process.env.NODE_ENV === 'production') throw new Error(message)
  console.error(`\n✖ ${message}\n`)
})
