<script setup lang="ts">
const storageKey='sabipedia-newsletter'
const route=useRoute()
const open=ref(false)
const reading=computed(()=>/^\/(guides\/[^/]+|learn\/[^/]+\/[^/]+)$/.test(route.path))
function remembered(){try{return Boolean(localStorage.getItem(storageKey))}catch{return true}}
function remember(value:'dismissed'|'subscribed'){try{localStorage.setItem(storageKey,value)}catch{}}
function onScroll(){
 if(open.value||!reading.value||remembered())return
 const doc=document.documentElement,strip=document.querySelector('.newsletter-strip')
 // Halfway through the page, but not once the footer form is already on screen.
 if(strip&&strip.getBoundingClientRect().top<window.innerHeight)return
 if(window.scrollY+window.innerHeight>=doc.scrollHeight*0.5)open.value=true
}
function close(){open.value=false;remember('dismissed')}
function onKey(e:KeyboardEvent){if(e.key==='Escape'&&open.value)close()}
onMounted(()=>{window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('keydown',onKey)})
onBeforeUnmount(()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('keydown',onKey)})
watch(()=>route.path,()=>{if(open.value)open.value=false})
</script>
<template>
 <Transition name="newsletter-pop">
  <aside v-if="open" class="newsletter-popup" role="dialog" aria-labelledby="newsletter-popup-title">
   <UButton class="link newsletter-close" icon="i-lucide-x" aria-label="Close" :ui="{leadingIcon:'button-icon'}" @click="close" />
   <NewsletterSignup title-id="newsletter-popup-title" @sent="remember('subscribed')" />
  </aside>
 </Transition>
</template>
