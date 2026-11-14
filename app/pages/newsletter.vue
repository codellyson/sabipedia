<script setup lang="ts">
const route=useRoute()
const token=String(route.query.confirm||route.query.unsubscribe||'')
const action=route.query.confirm?'confirm':route.query.unsubscribe?'unsubscribe':''
const state=ref<'ready'|'busy'|'done'|'error'>('ready'),message=ref('')
async function run(){
 state.value='busy'
 try{await $fetch('/api/newsletter/status',{method:'POST',body:{token,action}});state.value='done'}
 catch(e:any){message.value=e?.data?.statusMessage||'Something went wrong. Try again.';state.value='error'}
}
useSeoMeta({title:'Newsletter — Sabipedia',robots:'noindex'})
</script>
<template>
 <section class="narrow newsletter-page">
  <template v-if="action==='confirm'">
   <h1>{{state==='done'?'You’re subscribed.':'Confirm your subscription.'}}</h1>
   <p v-if="state==='done'">We’ll email you when new guides and phrase pages go live.</p>
   <UButton v-else class="primary" :disabled="state==='busy'" @click="run">{{state==='busy'?'Confirming…':'Confirm subscription'}}</UButton>
  </template>
  <template v-else-if="action==='unsubscribe'">
   <h1>{{state==='done'?'You’re unsubscribed.':'Unsubscribe from Sabipedia emails?'}}</h1>
   <p v-if="state==='done'">You won’t get any more newsletter emails.</p>
   <UButton v-else class="secondary" :disabled="state==='busy'" @click="run">{{state==='busy'?'Unsubscribing…':'Unsubscribe'}}</UButton>
  </template>
  <NewsletterSignup v-else title-id="newsletter-title" />
  <p v-if="message" role="alert" class="notice">{{message}}</p>
 </section>
</template>
