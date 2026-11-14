<script setup lang="ts">
import { languages, languageBySlug, type LessonContent } from '~~/shared/learn'
type DraftPhrase={text:string;meaning:string;pronunciation:string;note:string;audioId?:string}
definePageMeta({key:route=>route.fullPath})
const route=useRoute()
const {data:me,refresh}=await useFetch('/api/learn/me')
const blank=():DraftPhrase=>({text:'',meaning:'',pronunciation:'',note:''})
const form=reactive({language:'yoruba',title:'',summary:'',changeNote:'',phrases:[blank()] as DraftPhrase[]})
const source=reactive<{lessonId?:string;baseVersionId?:string}>({})
const message=ref(''),busy=ref(false),sent=ref(false)
const query=route.query.lesson?{lesson:String(route.query.lesson)}:route.query.submission?{submission:String(route.query.submission)}:null
if(query&&me.value?.signedIn){
 const loaded=await $fetch<{lessonId:string|null;baseVersionId:string|null;content:LessonContent}>('/api/learn/lessons/source',{query,headers:useRequestHeaders(['cookie'])}).catch(()=>null)
 if(loaded){Object.assign(form,{...loaded.content,changeNote:''});source.lessonId=loaded.lessonId||undefined;source.baseVersionId=loaded.baseVersionId||undefined}
}
const language=computed(()=>languageBySlug(form.language)!)
const missingAudio=computed(()=>form.phrases.filter(p=>!p.audioId).length)
function move(i:number,by:number){const [p]=form.phrases.splice(i,1);form.phrases.splice(i+by,0,p!)}
async function send(){
 busy.value=true;message.value=''
 try{
  await $fetch('/api/learn/submissions',{method:'POST',body:{content:{...form,phrases:form.phrases.map(p=>({...p}))},...source}})
  sent.value=true;await refresh()
 }catch(e:any){message.value=e?.data?.statusMessage||'Could not send the page. Try again.'}
 finally{busy.value=false}
}
function again(){Object.assign(form,{title:'',summary:'',changeNote:'',phrases:[blank()]});source.lessonId=source.baseVersionId=undefined;sent.value=false}
const labels={awaiting_review:'Waiting for review',published:'Published',rejected:'Changes requested'} as Record<string,string>
useSeoMeta({title:'Add a phrase page — Sabipedia',robots:'noindex'})
</script>
<template>
 <section class="learn-write">
  <header><nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/learn">Learn</NuxtLink></nav><h1>{{source.lessonId?'Correct a phrase page':'Add a phrase page'}}</h1><p class="home-lede">Write each phrase the way a native speaker says it, with tone marks, then record it. A {{language.name}} reviewer checks the page before it goes live.</p></header>
  <div v-if="!me?.signedIn" class="notice"><p>Sign in to add a phrase page.</p><NuxtLink class="button secondary" :to="{path:'/login',query:{next:'/learn/write'}}">Sign in</NuxtLink></div>
  <div v-else-if="sent" class="empty"><h2>Sent to a {{language.name}} reviewer.</h2><p>You’ll get an email when it’s checked.</p><button class="secondary" @click="again">Add another page</button></div>
  <form v-else class="learn-form" @submit.prevent="send">
   <div class="pair">
    <label>Language<select v-model="form.language" :disabled="Boolean(source.lessonId)"><option v-for="l in languages" :key="l.slug" :value="l.slug">{{l.name}}</option></select></label>
    <label>Page title<input v-model="form.title" maxlength="140" placeholder="Greetings and respect" required></label>
   </div>
   <label>What the page covers<input v-model="form.summary" maxlength="300" placeholder="How to greet people of different ages at different times of day." required></label>
   <ol class="phrase-editor">
    <li v-for="(p,i) in form.phrases" :key="i">
     <div class="phrase-editor-head"><strong>Phrase {{i+1}}</strong><span>
      <button type="button" class="link" :disabled="i===0" :aria-label="`Move phrase ${i+1} up`" @click="move(i,-1)">Up</button>
      <button type="button" class="link" :disabled="i===form.phrases.length-1" :aria-label="`Move phrase ${i+1} down`" @click="move(i,1)">Down</button>
      <button type="button" class="link" :disabled="form.phrases.length===1" @click="form.phrases.splice(i,1)">Remove</button></span></div>
     <div class="pair">
      <label>In {{language.name}}<input v-model="p.text" maxlength="300" required :lang="form.language==='pidgin'?'pcm':form.language.slice(0,2)"></label>
      <label>Meaning in English<input v-model="p.meaning" maxlength="300" required></label>
      <label><span>Say it like <small>(optional)</small></span><input v-model="p.pronunciation" maxlength="200" placeholder="eh SHEH"></label>
      <label><span>Note <small>(optional)</small></span><input v-model="p.note" maxlength="600" placeholder="When or to whom you say it"></label>
     </div>
     <PhraseRecorder v-model="p.audioId" :label="`phrase ${i+1}`" />
    </li>
   </ol>
   <button type="button" class="secondary" :disabled="form.phrases.length>=60" @click="form.phrases.push(blank())"><UIcon name="i-lucide-plus" class="button-icon" aria-hidden="true"/>Add phrase</button>
   <label v-if="source.lessonId">What you changed<input v-model="form.changeNote" maxlength="600"></label>
   <p v-if="message" role="alert" class="notice">{{message}}</p>
   <div class="learn-submit"><button type="submit" class="primary" :disabled="busy||missingAudio>0">Send to {{language.name}} reviewer</button><span v-if="missingAudio" class="field-hint">{{missingAudio}} {{missingAudio===1?'phrase needs':'phrases need'}} a recording.</span></div>
  </form>
  <section v-if="me?.submissions?.length" class="learn-mine"><h2>Your phrase pages</h2>
   <ul class="home-list"><li v-for="s in me.submissions" :key="s.id" class="learn-mine-row">
    <div><strong>{{s.title}}</strong><span class="home-row-meta"><span>{{languageBySlug(String(s.language))?.name}}</span><span>{{labels[String(s.state)]}}</span></span><p v-if="s.reviewer_note" class="phrase-note">{{s.reviewer_note}}</p></div>
    <NuxtLink v-if="s.state==='rejected'" class="button secondary" :to="`/learn/write?submission=${s.id}`">Fix it</NuxtLink>
    <NuxtLink v-else-if="s.slug" class="button secondary" :to="`/learn/${s.language}/${s.slug}`">View</NuxtLink>
   </li></ul>
  </section>
 </section>
</template>
