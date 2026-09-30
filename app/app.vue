<script setup lang="ts">
import { authClient } from './utils/auth'
const session = authClient.useSession()
const canReview = computed(() => session.value.data?.user.role?.split(',').some(role => ['admin', 'moderator'].includes(role)))
</script>
<template>
  <UApp>
    <header class="site-header">
      <NuxtLink class="brand" to="/"><span class="brand-mark" aria-hidden="true">✳</span>wikihownaija</NuxtLink>
      <nav class="site-nav" aria-label="Main navigation">
        <NuxtLink to="/">Explore</NuxtLink>
        <NuxtLink v-if="canReview" to="/review">Review</NuxtLink>
        <ClientOnly>
          <button v-if="session.data" class="link" @click="authClient.signOut()">Sign out</button>
          <NuxtLink v-else to="/login">Sign in</NuxtLink>
        </ClientOnly>
        <NuxtLink class="nav-cta" to="/write">Document knowledge <span aria-hidden="true">→</span></NuxtLink>
      </nav>
      <ClientOnly>
        <UColorModeButton class="theme-toggle" :ui="{leadingIcon:'theme-icon'}" />
        <template #fallback><button class="theme-toggle" disabled aria-label="Choose color theme" tabindex="-1"><svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></svg></button></template>
      </ClientOnly>
    </header>
    <main><NuxtPage /></main>
    <footer>Nigerian knowledge, documented by Nigerians.</footer>
  </UApp>
</template>
