<script setup lang="ts">
import { authClient } from '../utils/auth'

const {data:authConfig}=await useFetch<{turnstileSiteKey:string}>('/api/auth-config')
const email=ref(''),busy=ref(false),sent=ref(false),message=ref(''),captchaToken=ref(''),captchaKey=ref(0)
const captchaRequired=computed(()=>Boolean(authConfig.value?.turnstileSiteKey))
const canSubmit=computed(()=>!busy.value && (!captchaRequired.value || Boolean(captchaToken.value)))
async function submit(){
 busy.value=true;message.value=''
 try{
  const result=await authClient.requestPasswordReset({email:email.value,redirectTo:`${window.location.origin}/reset-password`,fetchOptions:captchaToken.value?{headers:{'x-captcha-response':captchaToken.value}}:undefined})
  if(result.error)message.value=result.error.message||'We could not start the reset. Try again.'
  else sent.value=true
 }catch{message.value='Could not connect. Try again.'}finally{busy.value=false;captchaToken.value='';captchaKey.value++}
}
</script>

<template><section class="narrow auth-screen"><p class="eyebrow">Account help</p><h1>Reset your password.</h1><div v-if="sent" class="auth-card"><h2>Check your email</h2><p>If an account exists for <strong>{{email}}</strong>, we sent a link to choose a new password.</p><NuxtLink class="button secondary" to="/login">Back to sign in</NuxtLink></div><form v-else @submit.prevent="submit"><p class="muted auth-intro">Enter the email you used for WikiHowNaija. The reset link expires after one hour.</p><label>Email<input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required></label><TurnstileWidget v-if="captchaRequired" :key="captchaKey" :site-key="authConfig!.turnstileSiteKey" @verified="captchaToken=$event" @expired="captchaToken=''"/><p v-if="message" class="notice" role="alert">{{message}}</p><button :disabled="!canSubmit">{{busy?'Sending…':'Send reset link'}}</button></form><NuxtLink v-if="!sent" class="auth-help-link auth-back-link" to="/login">Back to sign in</NuxtLink></section></template>
