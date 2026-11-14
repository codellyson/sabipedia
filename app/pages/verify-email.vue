<script setup lang="ts">
const route=useRoute()
const error=computed(()=>typeof route.query.error==='string'?route.query.error:'')
const verified=computed(()=>route.query.verified==='1'&&!error.value)
</script>

<template><section class="narrow auth-screen"><p class="eyebrow">Email verification</p><h1>{{verified?'Your email is verified.':'That link did not work.'}}</h1><div class="auth-card"><template v-if="verified"><p>Your Sabipedia account is ready. You can now share and improve articles.</p><NuxtLink class="button secondary" to="/write">Start writing</NuxtLink></template><template v-else><p>The verification link is invalid or has expired. Sign in again to request a new one.</p><NuxtLink class="button secondary" to="/login">Back to sign in</NuxtLink></template></div></section></template>
