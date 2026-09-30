<script setup lang="ts">
import { authClient } from '../utils/auth'
const {data:devLogin}=await useFetch<{enabled:boolean}>('/api/dev-login')
const route=useRoute()
const destination=computed(()=>{
 const next=route.query.next
 if(typeof next!=='string')return '/write'
 try{const url=new URL(next,'https://wikihownaija.invalid'),allowed=new Set(['/write','/my-guides']);return url.origin==='https://wikihownaija.invalid' && allowed.has(url.pathname) ? url.pathname+url.search : '/write'}catch{return '/write'}
})
const signup=ref(false),name=ref(''),email=ref(''),password=ref(''),message=ref(''),busy=ref(false)
async function submit(){busy.value=true;message.value='';try{const result=signup.value?await authClient.signUp.email({name:name.value,email:email.value,password:password.value}):await authClient.signIn.email({email:email.value,password:password.value});if(result.error)message.value=result.error.message||'Unable to sign in';else await navigateTo(destination.value)}catch{message.value='Could not connect. Try again.'}finally{busy.value=false}}
async function quickLogin(){busy.value=true;message.value='';try{await $fetch('/api/dev-login',{method:'POST'});await navigateTo(destination.value,{external:true})}catch(e:any){message.value=e.data?.statusMessage||'Dev login failed'}finally{busy.value=false}}
</script><template><section class="narrow auth-screen"><p class="eyebrow">Join the collection</p><h1>{{signup?'Share what you know.':'Welcome back.'}}</h1><form @submit.prevent="submit"><label v-if="signup">Your name<input v-model="name" placeholder="Enter your name" required autocomplete="name"></label><label>Email<input v-model="email" placeholder="you@example.com" type="email" required autocomplete="email"></label><label>Password<input v-model="password" :placeholder="signup ? 'Create a password (12+ characters)' : 'Enter your password'" type="password" minlength="12" required :autocomplete="signup?'new-password':'current-password'"></label><NuxtLink v-if="!signup" class="auth-help-link" to="/forgot-password">Forgot your password?</NuxtLink><p class="muted">Use at least 12 characters.</p><p v-if="message" role="alert" class="notice">{{message}}</p><button :disabled="busy">{{busy?'Please wait…':signup?'Create account':'Sign in'}}</button></form><div v-if="devLogin?.enabled" class="dev-login"><p>Local preview</p><button :disabled="busy" @click="quickLogin">Continue as dev moderator</button></div><button class="link" @click="signup=!signup">{{signup?'Already have an account? Sign in':'New here? Create an account'}}</button></section></template>
