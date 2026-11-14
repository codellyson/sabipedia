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
const languageItems=languages.map(l=>({label:l.name,value:l.slug as string}))
const selectUi={base:'writer-select',content:'writer-select-menu',item:'writer-select-option'}
const labels={awaiting_review:'Waiting for review',published:'Published',rejected:'Changes requested'} as Record<string,string>
useSeoMeta({title:'Add a phrase page — Sabipedia',robots:'noindex'})
</script>
<template>
 <section class="learn-write">
  <header><nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/learn">Learn</NuxtLink></nav><h1>{{source.lessonId?'Correct a phrase page':'Add a phrase page'}}</h1><p class="home-lede">Write each phrase the way a native speaker says it, with tone marks, then record it. A {{language.name}} reviewer checks the page before it goes live.</p></header>
  <div v-if="!me?.signedIn" class="notice"><p>Sign in to add a phrase page.</p><UButton class="button secondary" :to="{path:'/login',query:{next:'/learn/write'}}">Sign in</UButton></div>
  <div v-else-if="sent" class="empty"><h2>Sent to a {{language.name}} reviewer.</h2><p>You’ll get an email when it’s checked.</p><UButton class="secondary" @click="again">Add another page</UButton></div>
  <form v-else class="learn-form" @submit.prevent="send">
   <div class="pair">
    <UFormField label="Language" class="writer-form-field"><USelect v-model="form.language" placeholder="Choose a language" :items="languageItems" value-key="value" :disabled="Boolean(source.lessonId)" :ui="selectUi" /></UFormField>
    <UFormField label="Page title" required class="writer-form-field"><UInput v-model="form.title" maxlength="140" placeholder="Greetings and respect" required class="writer-input" /></UFormField>
   </div>
   <UFormField label="What the page covers" required class="writer-form-field"><UInput v-model="form.summary" maxlength="300" placeholder="How to greet people of different ages at different times of day." required class="writer-input" /></UFormField>
   <ol class="phrase-editor">
    <li v-for="(p,i) in form.phrases" :key="i">
     <div class="phrase-editor-head"><strong>Phrase {{i+1}}</strong><span>
      <UButton class="link" :disabled="i===0" :aria-label="`Move phrase ${i+1} up`" @click="move(i,-1)">Up</UButton>
      <UButton class="link" :disabled="i===form.phrases.length-1" :aria-label="`Move phrase ${i+1} down`" @click="move(i,1)">Down</UButton>
      <UButton class="link" :disabled="form.phrases.length===1" @click="form.phrases.splice(i,1)">Remove</UButton></span></div>
     <div class="pair">
      <UFormField :label="`In ${language.name}`" required class="writer-form-field"><UInput v-model="p.text" maxlength="300" placeholder="As a native speaker says it, with tone marks" required :lang="form.language==='pidgin'?'pcm':form.language.slice(0,2)" class="writer-input" /></UFormField>
      <UFormField label="Meaning in English" required class="writer-form-field"><UInput v-model="p.meaning" maxlength="300" placeholder="Good morning" required class="writer-input" /></UFormField>
      <UFormField label="Say it like" hint="Optional" class="writer-form-field"><UInput v-model="p.pronunciation" maxlength="200" placeholder="eh SHEH" class="writer-input" /></UFormField>
      <UFormField label="Note" hint="Optional" class="writer-form-field"><UInput v-model="p.note" maxlength="600" placeholder="When or to whom you say it" class="writer-input" /></UFormField>
     </div>
     <PhraseRecorder v-model="p.audioId" :label="`phrase ${i+1}`" />
    </li>
   </ol>
   <UButton class="secondary" icon="i-lucide-plus" :ui="{leadingIcon:'button-icon'}" :disabled="form.phrases.length>=60" @click="form.phrases.push(blank())">Add phrase</UButton>
   <UFormField v-if="source.lessonId" label="What you changed" class="writer-form-field"><UInput v-model="form.changeNote" maxlength="600" placeholder="What you fixed and why" class="writer-input" /></UFormField>
   <p v-if="message" role="alert" class="notice">{{message}}</p>
   <div class="learn-submit"><UButton type="submit" class="primary" :disabled="busy||missingAudio>0">Send to {{language.name}} reviewer</UButton><span v-if="missingAudio" class="field-hint">{{missingAudio}} {{missingAudio===1?'phrase needs':'phrases need'}} a recording.</span></div>
  </form>
  <section v-if="me?.submissions?.length" class="learn-mine"><h2>Your phrase pages</h2>
   <ul class="home-list"><li v-for="s in me.submissions" :key="s.id" class="learn-mine-row">
    <div><strong>{{s.title}}</strong><span class="home-row-meta"><span>{{languageBySlug(String(s.language))?.name}}</span><span>{{labels[String(s.state)]}}</span></span><p v-if="s.reviewer_note" class="phrase-note">{{s.reviewer_note}}</p></div>
    <UButton v-if="s.state==='rejected'" class="button secondary" :to="`/learn/write?submission=${s.id}`">Fix it</UButton>
    <UButton v-else-if="s.slug" class="button secondary" :to="`/learn/${s.language}/${s.slug}`">View</UButton>
   </li></ul>
  </section>
 </section>
</template>
