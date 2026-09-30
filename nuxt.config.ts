export default defineNuxtConfig({
 modules: ['@nuxt/ui'],
 ui: { fonts: false, colorMode: true, theme: { unstyled: true } },
 colorMode: { preference: 'system', fallback: 'light', storageKey: 'wikihownaija-color-mode', disableTransition: true },
 compatibilityDate: '2026-09-27',
 nitro: { preset: 'cloudflare_module', cloudflare: { deployConfig: false, nodeCompat: true } },
 css: ['~/assets/main.css'],
 devtools: { enabled: false },
 app: { pageTransition: { name: 'page', mode: 'out-in' }, head: { title: 'wikihownaija', htmlAttrs: { lang: 'en' }, link: [{ rel: 'icon', href: '/favicon.svg' }] } }
})
