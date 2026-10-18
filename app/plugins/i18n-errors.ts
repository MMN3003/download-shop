/** Lets apiError() translate server messages without needing a component. */
export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n as any
  setErrorTranslator((key, params) => i18n.t(key, params ?? {}))
})
