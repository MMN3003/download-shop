// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxtjs/i18n', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  i18n: {
    defaultLocale: 'fa',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'fa', language: 'fa-IR', dir: 'rtl', name: 'فارسی', file: 'fa.json' },
      { code: 'en', language: 'en-US', dir: 'ltr', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: false,
  },
  fonts: {
    families: [{ name: 'Vazirmatn', provider: 'google', weights: [400, 500, 700, 800] }],
  },
})
