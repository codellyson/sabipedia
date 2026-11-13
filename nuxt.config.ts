export default defineNuxtConfig({
 modules: ['@nuxt/ui'],
 ui: { fonts: false, colorMode: true, theme: { unstyled: true } },
 colorMode: { preference: 'system', fallback: 'light', storageKey: 'wikihownaija-color-mode', disableTransition: true },
 compatibilityDate: '2026-09-27',
 nitro: { preset: 'cloudflare_module', cloudflare: { deployConfig: false, nodeCompat: true } },
 css: ['~/assets/main.css'],
 devtools: { enabled: false },
 routeRules: { '/topics/**': { redirect: { to: '/how-to/**', statusCode: 301 } } },
 app: { pageTransition: { name: 'page', mode: 'out-in' }, head: { title: 'Sabipedia', htmlAttrs: { lang: 'en' }, link: [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/brand/whn-mark-180.png' }
 ] } }
})
