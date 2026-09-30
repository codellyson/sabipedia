<script setup lang="ts">
const props=defineProps<{siteKey:string}>()
const emit=defineEmits<{verified:[token:string],expired:[]}>()
const target=ref<HTMLElement|null>(null)
let widgetId:string|undefined

declare global {
  interface Window {
    turnstile?: { render:(element:HTMLElement,options:Record<string,unknown>)=>string; remove:(id:string)=>void }
  }
}

function loadScript(){
  return new Promise<void>((resolve,reject)=>{
    if(window.turnstile){resolve();return}
    const existing=document.querySelector<HTMLScriptElement>('script[data-wikihownaija-turnstile]')
    if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('Turnstile failed to load')),{once:true});return}
    const script=document.createElement('script')
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async=true;script.defer=true;script.dataset.wikihownaijaTurnstile='true'
    script.onload=()=>resolve();script.onerror=()=>reject(new Error('Turnstile failed to load'))
    document.head.appendChild(script)
  })
}

onMounted(async()=>{
  await loadScript()
  if(target.value && window.turnstile) widgetId=window.turnstile.render(target.value,{sitekey:props.siteKey,action:'auth',callback:(token:string)=>emit('verified',token),'expired-callback':()=>emit('expired'),'error-callback':()=>emit('expired'),theme:'auto'})
})
onBeforeUnmount(()=>{if(widgetId && window.turnstile)window.turnstile.remove(widgetId)})
</script>

<template><div ref="target" class="turnstile-widget" aria-label="Security check" /></template>
