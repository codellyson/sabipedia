<script setup lang="ts">
const props=defineProps<{titleId:string}>()
const emit=defineEmits<{sent:[]}>()
const {data:authConfig}=useFetch<{turnstileSiteKey:string}>('/api/auth-config',{key:'auth-config',lazy:true,server:false})
const email=ref(''),busy=ref(false),sent=ref(false),message=ref(''),armed=ref(false),captchaToken=ref(''),captchaKey=ref(0)
const siteKey=computed(()=>authConfig.value?.turnstileSiteKey||'')
const canSubmit=computed(()=>!busy.value&&(!siteKey.value||Boolean(captchaToken.value)))
async function submit(){
 busy.value=true;message.value=''
 try{
  await $fetch('/api/newsletter',{method:'POST',body:{email:email.value,captchaToken:captchaToken.value||undefined}})
  sent.value=true;emit('sent')
 }catch(e:any){message.value=e?.data?.statusMessage||'Could not subscribe. Try again.'}
 finally{busy.value=false;captchaToken.value='';captchaKey.value++}
}
</script>
<template>
 <div class="newsletter">
  <template v-if="sent"><h2 :id="props.titleId">Check your email.</h2><p>We sent a link to <strong>{{email}}</strong>. Open it to confirm.</p></template>
  <template v-else>
   <h2 :id="props.titleId">Get new guides by email</h2>
   <p>An occasional email when new guides and phrase pages go live. Unsubscribe any time.</p>
   <form class="newsletter-form" @submit.prevent="submit" @focusin="armed=true">
    <UInput v-model="email" type="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email address" class="writer-input" />
    <UButton type="submit" class="primary" :disabled="!canSubmit">{{busy?'Sending…':'Subscribe'}}</UButton>
   </form>
   <ClientOnly><TurnstileWidget v-if="armed&&siteKey" :key="captchaKey" :site-key="siteKey" action="newsletter" @verified="captchaToken=$event" @expired="captchaToken=''"/></ClientOnly>
   <p v-if="message" role="alert" class="field-hint newsletter-error">{{message}}</p>
  </template>
 </div>
</template>
