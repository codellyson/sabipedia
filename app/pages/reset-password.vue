<script setup lang="ts">
import { authClient } from '../utils/auth'

const route=useRoute(),password=ref(''),confirmation=ref(''),busy=ref(false),complete=ref(false),message=ref('')
const token=computed(()=>typeof route.query.token==='string'?route.query.token:'')
const invalid=computed(()=>!token.value||route.query.error==='INVALID_TOKEN')
async function submit(){
 if(password.value!==confirmation.value){message.value='The passwords do not match.';return}
 busy.value=true;message.value=''
 try{
  const result=await authClient.resetPassword({newPassword:password.value,token:token.value})
  if(result.error)message.value=result.error.message||'This reset link is invalid or has expired.'
  else complete.value=true
 }catch{message.value='Could not connect. Try again.'}finally{busy.value=false}
}
</script>

<template><section class="narrow auth-screen"><p class="eyebrow">Account help</p><h1>Choose a new password.</h1><div v-if="complete" class="auth-card"><h2>Password updated</h2><p>You can now sign in with your new password.</p><NuxtLink class="button secondary" to="/login">Sign in</NuxtLink></div><div v-else-if="invalid" class="auth-card"><h2>This link is no longer valid</h2><p>Reset links can only be used once and expire after one hour.</p><NuxtLink class="button secondary" to="/forgot-password">Request another link</NuxtLink></div><form v-else @submit.prevent="submit"><label>New password<input v-model="password" type="password" placeholder="At least 12 characters" minlength="12" autocomplete="new-password" required></label><label>Confirm new password<input v-model="confirmation" type="password" placeholder="Type the same password again" minlength="12" autocomplete="new-password" required></label><p class="muted">Use at least 12 characters.</p><p v-if="message" class="notice" role="alert">{{message}}</p><button class="primary" :disabled="busy">{{busy?'Updating…':'Update password'}}</button></form></section></template>
