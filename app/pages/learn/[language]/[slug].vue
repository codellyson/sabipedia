<script setup lang="ts">
import { languageBySlug } from '~~/shared/learn'
import { authClient } from '~/utils/auth'
const route=useRoute(),language=languageBySlug(String(route.params.language))
if(!language) throw createError({statusCode:404,statusMessage:'Language not found',fatal:true})
const {data:page,error}=await useFetch(`/api/learn/${language.slug}/${route.params.slug}`)
if(error.value?.statusCode===404) throw createError({statusCode:404,statusMessage:'Page not found',fatal:true})
const session=authClient.useSession()
const playing=ref<string>('')
let audio:HTMLAudioElement|undefined
function play(id:string,slow=false){
 audio?.pause()
 audio=new Audio(`/api/media/${id}`)
 audio.playbackRate=slow?0.6:1
 playing.value=id+(slow?':slow':'')
 audio.onended=audio.onerror=()=>{playing.value=''}
 audio.play().catch(()=>{playing.value=''})
}
onBeforeUnmount(()=>audio?.pause())
const flagging=ref<number|null>(null),flagNote=ref(''),flagMessage=ref(''),flagBusy=ref(false)
async function sendFlag(index:number){
 flagBusy.value=true;flagMessage.value=''
 try{await $fetch('/api/learn/flags',{method:'POST',body:{lessonId:page.value!.id,phraseIndex:index,note:flagNote.value}});flagging.value=null;flagNote.value='';flagMessage.value='Thanks. A reviewer will check it.'}
 catch(e:any){flagMessage.value=e?.data?.statusMessage||'Could not send the report. Try again.'}
 finally{flagBusy.value=false}
}
const updated=computed(()=>page.value?new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric'}).format(new Date(page.value.created_at.replace(' ','T')+'Z')):'')
const title=computed(()=>page.value?`${page.value.content.title} in ${language.name} — Sabipedia`:'Sabipedia')
const description=computed(()=>page.value?.content.summary||'')
useSeoMeta({title,description,ogTitle:title,ogDescription:description})
</script>
<template>
 <article v-if="page" class="home learn learn-page">
  <nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/learn">Learn</NuxtLink><UIcon name="i-lucide-chevron-right" class="breadcrumb-icon" aria-hidden="true"/><NuxtLink :to="`/learn/${language!.slug}`">{{language!.name}}</NuxtLink></nav>
  <header class="home-top"><h1>{{page.content.title}}</h1><p class="home-lede">{{page.content.summary}}</p>
   <p class="learn-meta"><span class="home-verified"><UIcon name="i-lucide-check" aria-hidden="true"/>Checked by a {{language!.name}} reviewer</span><span>Voiced by {{page.author}}</span><span>Updated {{updated}}</span></p>
  </header>
  <ol class="phrase-list" :lang="language!.slug==='yoruba'?'yo':language!.slug==='hausa'?'ha':language!.slug==='igbo'?'ig':'pcm'">
   <li v-for="(p,i) in page.content.phrases" :key="i" class="phrase">
    <div class="phrase-text"><strong>{{p.text}}</strong><span v-if="p.pronunciation" class="phrase-say" lang="en">{{p.pronunciation}}</span><span class="phrase-meaning" lang="en">{{p.meaning}}</span></div>
    <div class="phrase-play" lang="en">
     <button class="phrase-play-main" :aria-label="`Play ${p.text}`" @click="play(p.audioId)"><StateIcon icon="i-lucide-play" active-icon="i-lucide-volume-2" :active="playing===p.audioId"/>Play</button>
     <button class="secondary" :aria-label="`Play ${p.text} slowly`" @click="play(p.audioId,true)"><StateIcon icon="i-lucide-snail" active-icon="i-lucide-volume-2" :active="playing===p.audioId+':slow'"/>Slow</button>
    </div>
    <p v-if="p.note" class="phrase-note" lang="en">{{p.note}}</p>
    <div class="phrase-flag" lang="en">
     <button v-if="flagging!==i" class="link" @click="flagging=i;flagMessage=''">Report a problem</button>
     <form v-else-if="session.data" @submit.prevent="sendFlag(i)"><label>What is wrong with this phrase or recording?<textarea v-model="flagNote" rows="2" maxlength="1000" required /></label><div class="phrase-flag-actions"><button class="secondary" type="button" @click="flagging=null">Cancel</button><button type="submit" :disabled="flagBusy">Send report</button></div></form>
     <p v-else><NuxtLink :to="{path:'/login',query:{next:route.fullPath}}">Sign in</NuxtLink> to report a problem.</p>
    </div>
   </li>
  </ol>
  <p v-if="flagMessage" role="status" class="field-hint">{{flagMessage}}</p>
  <p class="learn-correct"><NuxtLink :to="`/learn/write?lesson=${page.id}`">Speak {{language!.name}}? Suggest a correction</NuxtLink></p>
 </article>
 <p v-else-if="error" role="alert" class="notice">We couldn’t load this page. Please try again.</p>
</template>
