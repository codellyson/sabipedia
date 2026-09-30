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
</script>

<template>
  <UApp>
    <div v-if="adminRoute" class="admin-shell">
      <aside class="admin-sidebar">
        <NuxtLink class="brand admin-brand" to="/"><span class="brand-mark" aria-hidden="true"><span>⌁</span></span><span>WikiHow<span class="brand-accent">Naija</span></span></NuxtLink>
        <form class="admin-search" role="search" @submit.prevent="submitSearch"><svg class="search-lens" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input v-model="search" aria-label="Search" placeholder="Search"><kbd>⌘K</kbd></form>
        <nav class="admin-nav" aria-label="Editorial workspace">
          <NuxtLink to="/"><span aria-hidden="true">⌂</span>Home</NuxtLink>
          <NuxtLink to="/articles"><span aria-hidden="true">▤</span>Articles</NuxtLink>
          <NuxtLink to="/review"><span aria-hidden="true">☑</span>Review queue</NuxtLink>
          <NuxtLink to="/write"><span aria-hidden="true">＋</span>New article</NuxtLink>
        </nav>
        <div class="admin-sidebar-footer">
          <NuxtLink class="button admin-new" to="/write">＋ New article</NuxtLink>
          <ClientOnly><button v-if="session.data" class="admin-account" @click="authClient.signOut()"><span class="avatar">{{session.data.user.name?.slice(0,2).toUpperCase() || 'ME'}}</span><span><strong>{{session.data.user.name}}</strong><small>Editor · Sign out</small></span></button></ClientOnly>
        </div>
      </aside>
      <div class="admin-content"><NuxtPage /></div>
    </div>

    <template v-else>
      <header class="site-header">
        <NuxtLink class="brand" to="/"><span class="brand-mark" aria-hidden="true"><span>⌁</span></span><span>WikiHow<span class="brand-accent">Naija</span></span></NuxtLink>
        <nav class="topic-nav" aria-label="Popular topics">
          <NuxtLink :to="{path:'/',query:{category:'Food & Cooking'}}">Food</NuxtLink>
          <NuxtLink :to="{path:'/',query:{category:'Everyday Life'}}">Everyday life</NuxtLink>
          <NuxtLink :to="{path:'/',query:{category:'Government & Processes'}}">Government</NuxtLink>
          <NuxtLink :to="{path:'/',query:{category:'Skills & Crafts'}}">Skills</NuxtLink>
        </nav>
        <form class="header-search" role="search" @submit.prevent="submitSearch"><svg class="search-lens" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input v-model="search" aria-label="Search guides" placeholder="How to…"></form>
        <nav class="site-nav" aria-label="Account navigation">
          <NuxtLink v-if="canReview" to="/review">Editor</NuxtLink>
          <ClientOnly><NuxtLink v-if="!session.data" to="/login">Sign in</NuxtLink></ClientOnly>
          <NuxtLink class="nav-cta" to="/write">Write</NuxtLink>
        </nav>
      </header>
      <main><NuxtPage /></main>
      <footer><strong>WikiHowNaija</strong><span>Practical knowledge, documented and reviewed by Nigerians.</span></footer>
    </template>
  </UApp>
</template>
