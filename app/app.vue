<script setup lang="ts">
import { authClient } from './utils/auth'

const route = useRoute()
const session = authClient.useSession()
const canReview = computed(() => session.value.data?.user.role?.split(',').some(role => ['admin', 'moderator'].includes(role)))
const adminRoute = computed(() => route.path === '/articles' || route.path.startsWith('/review'))
const search = ref('')

function submitSearch() {
  navigateTo({ path: '/', query: search.value.trim() ? { q: search.value.trim() } : {} })
}
async function signOut(){await authClient.signOut();await navigateTo('/')}
</script>

<template>
  <UApp>
    <div v-if="adminRoute" class="admin-shell">
      <aside class="admin-sidebar">
        <NuxtLink class="brand admin-brand" to="/" aria-label="WikiHowNaija home"><img class="brand-logo brand-logo-light" src="/brand/whn-lockup.svg" alt="WikiHowNaija"><img class="brand-logo brand-logo-dark" src="/brand/whn-lockup-dark.svg" alt=""><img class="brand-symbol" src="/brand/whn-mark.svg" alt=""></NuxtLink>
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
        <NuxtLink class="brand" to="/" aria-label="WikiHowNaija home"><img class="brand-logo brand-logo-light" src="/brand/whn-lockup.svg" alt="WikiHowNaija"><img class="brand-logo brand-logo-dark" src="/brand/whn-lockup-dark.svg" alt=""><img class="brand-symbol" src="/brand/whn-mark.svg" alt=""></NuxtLink>
        <nav class="topic-nav" aria-label="Popular topics">
          <NuxtLink :to="{path:'/',query:{category:'Food & Cooking'}}">Food</NuxtLink>
          <NuxtLink :to="{path:'/',query:{category:'Everyday Life'}}">Everyday life</NuxtLink>
          <NuxtLink :to="{path:'/',query:{category:'Government & Processes'}}">Government</NuxtLink>
          <NuxtLink :to="{path:'/',query:{category:'Skills & Crafts'}}">Skills</NuxtLink>
        </nav>
        <form class="header-search" role="search" @submit.prevent="submitSearch"><UIcon name="i-lucide-search" class="search-lens" aria-hidden="true"/><input v-model="search" aria-label="Search guides" placeholder="How to…"></form>
        <nav class="site-nav" aria-label="Account navigation">
          <NuxtLink v-if="canReview" to="/review">Editor</NuxtLink>
          <ClientOnly><NuxtLink v-if="!session.data" to="/login">Sign in</NuxtLink></ClientOnly>
          <ClientOnly><NuxtLink v-if="session.data" to="/my-guides">My guides</NuxtLink></ClientOnly>
          <ClientOnly><button v-if="session.data" class="link" @click="signOut">Sign out</button></ClientOnly>
          <NuxtLink class="nav-cta" to="/write">Write</NuxtLink>
        </nav>
      </header>
      <main><NuxtPage /></main>
      <footer><NuxtLink class="footer-brand brand" to="/" aria-label="WikiHowNaija home"><img class="brand-logo brand-logo-light" src="/brand/whn-lockup.svg" alt="WikiHowNaija"><img class="brand-logo brand-logo-dark" src="/brand/whn-lockup-dark.svg" alt=""></NuxtLink><span>Practical knowledge, documented and reviewed by Nigerians.</span></footer>
    </template>
  </UApp>
</template>
