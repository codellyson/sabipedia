<script setup lang="ts">
import { authClient } from './utils/auth'
import { siteDescription, siteName, siteOrigin, socialImage } from '~~/shared/seo'

const route = useRoute()
const publicPage = computed(() => route.path === '/' || ['/how-to', '/learn'].includes(route.path) || /^\/(guides|how-to)\/[^/]+$/.test(route.path) || /^\/learn\/(?!write$|review$)[^/]+(\/[^/]+)?$/.test(route.path))
const canonicalPath = computed(() => route.path === '/' ? '/' : route.path.replace(/\/+$/, ''))
const indexablePage = computed(() => publicPage.value && (route.path.startsWith('/guides/') || Object.keys(route.query).length === 0))
useHead({ link: computed(() => publicPage.value ? [{ rel: 'canonical', href: siteOrigin + canonicalPath.value }] : []) })
useSeoMeta({
  description: siteDescription,
  ogSiteName: siteName,
  ogType: 'website',
  ogTitle: siteName,
  ogDescription: siteDescription,
  ogImage: socialImage,
  ogUrl: computed(() => publicPage.value ? siteOrigin + canonicalPath.value : undefined),
  twitterCard: 'summary_large_image',
  robots: computed(() => indexablePage.value ? 'index, follow' : 'noindex, follow'),
})
const session = authClient.useSession()
const canReview = computed(() => session.value.data?.user.role?.split(',').some(role => ['admin', 'moderator'].includes(role)))
const adminRoute = computed(() => route.path === '/articles' || route.path.startsWith('/review'))
const search = ref('')

function submitSearch() {
  navigateTo({ path: '/how-to', query: search.value.trim() ? { q: search.value.trim() } : {} })
}
async function signOut(){await authClient.signOut();await navigateTo('/')}
// Phones hide the account links and search in the header; this menu carries them.
const phoneMenu=computed(()=>[
 [{label:'Search articles',icon:'i-lucide-search',to:'/how-to'},
  ...(canReview.value?[{label:'Editor',icon:'i-lucide-clipboard-check',to:'/review'}]:[]),
  ...(session.value.data?[{label:'My articles',icon:'i-lucide-file-text',to:'/my-guides'}]:[])],
 [session.value.data?{label:'Sign out',icon:'i-lucide-log-out',onSelect:signOut}:{label:'Sign in',icon:'i-lucide-log-in',to:'/login'}]
])
</script>

<template>
  <UApp>
    <div v-if="adminRoute" class="admin-shell">
      <aside class="admin-sidebar">
        <NuxtLink class="brand admin-brand" to="/" aria-label="Sabipedia home"><img class="brand-logo brand-logo-light" src="/brand/whn-lockup.svg" alt="Sabipedia"><img class="brand-logo brand-logo-dark" src="/brand/whn-lockup-dark.svg" alt=""><img class="brand-symbol" src="/brand/whn-mark.svg" alt=""></NuxtLink>
        <form class="admin-search" role="search" @submit.prevent="submitSearch"><UIcon name="i-lucide-search" class="search-lens" aria-hidden="true"/><input v-model="search" aria-label="Search" placeholder="Search"><kbd>⌘K</kbd></form>
        <nav class="admin-nav" aria-label="Editorial workspace">
          <NuxtLink to="/"><UIcon name="i-lucide-house" class="nav-icon"/>Home</NuxtLink>
          <NuxtLink to="/articles"><UIcon name="i-lucide-files" class="nav-icon"/>Articles</NuxtLink>
          <NuxtLink to="/review"><UIcon name="i-lucide-clipboard-check" class="nav-icon"/>Review queue</NuxtLink>
          <NuxtLink to="/write"><UIcon name="i-lucide-file-plus-2" class="nav-icon"/>New article</NuxtLink>
        </nav>
        <div class="admin-sidebar-footer">
          <NuxtLink class="button admin-new" to="/write"><UIcon name="i-lucide-plus" class="button-icon"/>New article</NuxtLink>
          <ClientOnly><button v-if="session.data" class="admin-account" @click="authClient.signOut()"><span class="avatar">{{session.data.user.name?.slice(0,2).toUpperCase() || 'ME'}}</span><span><strong>{{session.data.user.name}}</strong><small>Editor · Sign out</small></span></button></ClientOnly>
        </div>
      </aside>
      <div class="admin-content"><NuxtPage /></div>
    </div>

    <template v-else>
      <header class="site-header">
        <NuxtLink class="brand" to="/" aria-label="Sabipedia home"><img class="brand-logo brand-logo-light" src="/brand/whn-lockup.svg" alt="Sabipedia"><img class="brand-logo brand-logo-dark" src="/brand/whn-lockup-dark.svg" alt=""><img class="brand-symbol" src="/brand/whn-mark.svg" alt=""></NuxtLink>
        <nav class="main-nav" aria-label="Sections"><NuxtLink to="/how-to" :class="{'router-link-active': /^\/(how-to|guides)(\/|$)/.test(route.path)}">How To</NuxtLink><NuxtLink to="/learn" :class="{'router-link-active': /^\/learn(\/|$)/.test(route.path)}">Learn</NuxtLink></nav>
        <form v-if="route.path !== '/' && !route.path.startsWith('/how-to')" class="header-search" role="search" @submit.prevent="submitSearch"><UIcon name="i-lucide-search" class="search-lens" aria-hidden="true"/><input v-model="search" aria-label="Search articles" placeholder="How to…"></form>
        <nav class="site-nav" aria-label="Account navigation">
          <NuxtLink v-if="canReview" to="/review">Editor</NuxtLink>
          <ClientOnly><NuxtLink v-if="!session.data" to="/login">Sign in</NuxtLink></ClientOnly>
          <ClientOnly><NuxtLink v-if="session.data" to="/my-guides">My articles</NuxtLink></ClientOnly>
          <ClientOnly><button v-if="session.data" class="link" @click="signOut">Sign out</button></ClientOnly>
          <ClientOnly><UDropdownMenu :items="phoneMenu" :content="{align:'end',sideOffset:8}" :ui="{content:'writer-select-menu nav-menu-list',item:'writer-select-option nav-menu-item',itemLeadingIcon:'writer-icon',separator:'nav-menu-separator'}"><UButton class="secondary nav-menu" icon="i-lucide-menu" aria-label="Menu" :ui="{leadingIcon:'button-icon'}" /></UDropdownMenu></ClientOnly>
          <NuxtLink class="nav-cta" to="/write">Write</NuxtLink>
        </nav>
      </header>
      <main class="site-main"><NuxtPage /></main>
      <section v-if="route.path !== '/newsletter'" class="newsletter-strip" aria-labelledby="newsletter-strip-title"><NewsletterSignup title-id="newsletter-strip-title" /></section>
      <NewsletterPopup />
      <footer class="site-footer"><NuxtLink class="footer-brand brand" to="/" aria-label="Sabipedia home"><img class="brand-logo brand-logo-light" src="/brand/whn-lockup.svg" alt="Sabipedia"><img class="brand-logo brand-logo-dark" src="/brand/whn-lockup-dark.svg" alt=""></NuxtLink><span>{{siteDescription}}</span></footer>
    </template>
  </UApp>
</template>
