<script setup lang="ts">
import { authClient } from '../utils/auth'

const route = useRoute()
const session = authClient.useSession()
const query = route.fullPath.split('?').slice(1).join('?')
const { data, error } = await useFetch<{ clientName: string; clientId: string; redirectUri: string | null; scopes: string[] }>(`/api/mcp-consent?${query}`)
const busy = ref(false)
const message = ref('')
useSeoMeta({ title: 'Authorize guide submissions — Sabipedia' })

async function decide(accept: boolean) {
  busy.value = true
  message.value = ''
  try {
    const result = await authClient.oauth2.consent({ accept })
    if (result.error) message.value = result.error.message || 'Could not complete authorization.'
    else if (result.data?.url) await navigateTo(result.data.url, { external: true })
  } catch { message.value = 'Could not complete authorization.' }
  finally { busy.value = false }
}
</script>

<template>
  <section class="narrow auth-screen">
    <p class="eyebrow">Connected application</p>
    <h1>Authorize guide submissions</h1>
    <p v-if="error" role="alert">This authorization request is invalid or expired.</p>
    <div v-else-if="data" class="auth-card">
      <p><strong>{{ data.clientName }}</strong> requests permission to submit guides under your Sabipedia account.</p>
      <p class="muted">Application ID: {{ data.clientId }}<br>Callback: {{ data.redirectUri }}</p>
      <p>The guides will appear in your submissions and wait for moderator review before publication.</p>
      <p v-if="data.scopes.includes('guide:submit')">Permission: submit guide drafts for review.</p>
      <p v-if="!session.data?.user"><NuxtLink :to="{ path: '/login', query: route.query }">Sign in to continue</NuxtLink></p>
      <p v-if="message" role="alert" class="notice">{{ message }}</p>
      <div v-if="session.data?.user" class="auth-actions">
        <button class="primary" :disabled="busy || !data.scopes.includes('guide:submit')" @click="decide(true)">Allow submissions</button>
        <button class="secondary" :disabled="busy" @click="decide(false)">Deny</button>
      </div>
    </div>
  </section>
</template>
