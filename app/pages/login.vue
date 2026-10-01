<script setup lang="ts">
import { authClient } from '../utils/auth'

const {data:devLogin}=await useFetch<{enabled:boolean}>('/api/dev-login')
const {data:authConfig}=await useFetch<{emailVerification:boolean;turnstileSiteKey:string}>('/api/auth-config')
const route=useRoute()
const destination=computed(()=>{
 const next=route.query.next
 if(typeof next!=='string')return '/write'
 try{const url=new URL(next,'https://wikihownaija.invalid'),allowed=new Set(['/write','/my-guides']);return url.origin==='https://wikihownaija.invalid' && allowed.has(url.pathname) ? url.pathname+url.search : '/write'}catch{return '/write'}
})
const signup=ref(false),name=ref(''),email=ref(''),password=ref(''),message=ref(''),busy=ref(false),sent=ref(false),captchaToken=ref(''),captchaKey=ref(0)
const captchaRequired=computed(()=>Boolean(authConfig.value?.turnstileSiteKey))
const canSubmit=computed(()=>!busy.value && (!captchaRequired.value || Boolean(captchaToken.value)))
const captchaFetchOptions=computed(()=>captchaToken.value?{headers:{'x-captcha-response':captchaToken.value}}:undefined)

function resetCaptcha(){captchaToken.value='';captchaKey.value++}
async function submit(){
 busy.value=true;message.value=''
 try{
  const callbackURL=`${window.location.origin}/verify-email?verified=1`
  const result=signup.value
   ? await authClient.signUp.email({name:name.value,email:email.value,password:password.value,callbackURL,fetchOptions:captchaFetchOptions.value})
   : await authClient.signIn.email({email:email.value,password:password.value,callbackURL,fetchOptions:captchaFetchOptions.value})
  if(result.error){
   if(result.error.code==='EMAIL_NOT_VERIFIED'){sent.value=true;message.value='We sent a new verification link.'}
   else message.value=result.error.message||'Unable to sign in'
  }else if(signup.value && authConfig.value?.emailVerification)sent.value=true
  else await navigateTo(destination.value)
 }catch{message.value='Could not connect. Try again.'}finally{busy.value=false;resetCaptcha()}
}
async function resend(){
 busy.value=true;message.value=''
 try{
  const result=await authClient.sendVerificationEmail({email:email.value,callbackURL:`${window.location.origin}/verify-email?verified=1`,fetchOptions:captchaFetchOptions.value})
  message.value=result.error?(result.error.message||'Could not send another link.'):'A new verification link is on its way.'
 }catch{message.value='Could not connect. Try again.'}finally{busy.value=false;resetCaptcha()}
}
async function quickLogin(){busy.value=true;message.value='';try{await $fetch('/api/dev-login',{method:'POST'});await navigateTo(destination.value,{external:true})}catch(e:any){message.value=e.data?.statusMessage||'Dev login failed'}finally{busy.value=false}}
function changeMode(){signup.value=!signup.value;sent.value=false;message.value='';resetCaptcha()}
</script>

<template><section class="narrow auth-screen"><p class="eyebrow">Join the collection</p><h1>{{sent?'Check your email.':signup?'Share what you know.':'Welcome back.'}}</h1><div v-if="sent" class="auth-card"><p>We sent a verification link to <strong>{{email}}</strong>. Open it to finish setting up your account.</p><p class="muted">The link expires in one hour. Check your spam folder if it does not arrive.</p><TurnstileWidget v-if="captchaRequired" :key="captchaKey" :site-key="authConfig!.turnstileSiteKey" @verified="captchaToken=$event" @expired="captchaToken=''"/><p v-if="message" role="status" class="notice">{{message}}</p><div class="auth-actions"><button class="secondary" :disabled="!canSubmit" @click="resend">{{busy?'Sending…':'Send another link'}}</button><button class="link" @click="changeMode">Back to sign in</button></div></div><form v-else @submit.prevent="submit"><label v-if="signup">Your name<input v-model="name" placeholder="Enter your name" required autocomplete="name"></label><label>Email<input v-model="email" placeholder="you@example.com" type="email" required autocomplete="email"></label><label>Password<input v-model="password" :placeholder="signup ? 'Create a password (12+ characters)' : 'Enter your password'" type="password" minlength="12" required :autocomplete="signup?'new-password':'current-password'"></label><NuxtLink v-if="!signup" class="auth-help-link" to="/forgot-password">Forgot your password?</NuxtLink><p class="muted">Use at least 12 characters.</p><TurnstileWidget v-if="captchaRequired" :key="captchaKey" :site-key="authConfig!.turnstileSiteKey" @verified="captchaToken=$event" @expired="captchaToken=''"/><p v-if="message" role="alert" class="notice">{{message}}</p><button class="primary" :disabled="!canSubmit">{{busy?'Please wait…':signup?'Create account':'Sign in'}}</button></form><div v-if="devLogin?.enabled && !sent" class="dev-login"><p>Local preview</p><button :disabled="busy" @click="quickLogin">Continue as dev moderator</button></div><button v-if="!sent" class="link" @click="changeMode">{{signup?'Already have an account? Sign in':'New here? Create an account'}}</button></section></template>
