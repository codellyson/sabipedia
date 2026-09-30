<script setup lang="ts">
import { authClient } from '../utils/auth'

const email=ref(''),busy=ref(false),sent=ref(false),message=ref('')
async function submit(){
 busy.value=true;message.value=''
 try{
  const result=await authClient.requestPasswordReset({email:email.value,redirectTo:`${window.location.origin}/reset-password`})
  if(result.error)message.value=result.error.message||'We could not start the reset. Try again.'
  else sent.value=true
 }catch{message.value='Could not connect. Try again.'}finally{busy.value=false}
}
</script>

<template><section class="narrow auth-screen"><p class="eyebrow">Account help</p><h1>Reset your password.</h1><div v-if="sent" class="auth-card"><h2>Check your email</h2><p>If an account exists for <strong>{{email}}</strong>, we sent a link to choose a new password.</p><NuxtLink class="button secondary" to="/login">Back to sign in</NuxtLink></div><form v-else @submit.prevent="submit"><p class="muted auth-intro">Enter the email you used for WikiHowNaija. The reset link expires after one hour.</p><label>Email<input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required></label><p v-if="message" class="notice" role="alert">{{message}}</p><button :disabled="busy">{{busy?'Sending…':'Send reset link'}}</button></form><NuxtLink v-if="!sent" class="auth-help-link auth-back-link" to="/login">Back to sign in</NuxtLink></section></template>
