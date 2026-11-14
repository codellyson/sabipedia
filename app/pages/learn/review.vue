<script setup lang="ts">
import { languages, languageBySlug, type LessonContent } from '~~/shared/learn'
type Item={id:string;language:string;author:string;author_id:string;slug:string|null;created_at:string;content:LessonContent;base_content:LessonContent|null}
type Flag={id:string;lesson_id:string;phrase_index:number;note:string;author:string;slug:string;language:string;title:string;phrase:string}
const {data,error,refresh}=await useFetch<{languages:string[];userId:string;submissions:Item[];flags:Flag[]}>('/api/learn/review')
const {data:me}=await useFetch('/api/learn/me')
const notes=reactive<Record<string,string>>({}),busy=ref(''),message=ref('')
let audio:HTMLAudioElement|undefined
function play(id:string){audio?.pause();audio=new Audio(`/api/media/${id}`);audio.play().catch(()=>{message.value='Could not play that recording.'})}
const changed=(item:Item,i:number)=>{const old=item.base_content?.phrases[i],p=item.content.phrases[i]!;return item.base_content&&(!old||old.text!==p.text||old.meaning!==p.meaning||old.audioId!==p.audioId)}
async function decide(item:Item,action:'publish'|'reject'){
 busy.value=item.id;message.value=''
 try{await $fetch(`/api/learn/review/${item.id}`,{method:'POST',body:{action,note:notes[item.id]||''}});message.value=action==='publish'?`Published “${item.content.title}”.`:`Sent “${item.content.title}” back with your note.`;await refresh()}
 catch(e:any){message.value=e?.data?.statusMessage||'Could not save the decision.'}
 finally{busy.value=''}
}
async function resolve(flag:Flag){busy.value=flag.id;try{await $fetch(`/api/learn/flags/${flag.id}`,{method:'POST'});await refresh()}catch(e:any){message.value=e?.data?.statusMessage||'Could not close the report.'}finally{busy.value=''}}
const {data:reviewers,refresh:refreshReviewers}=await useFetch<Array<{user_id:string;language:string;name:string;email:string}>>('/api/learn/reviewers',{immediate:false})
watch(()=>me.value?.isAdmin,admin=>{if(admin)refreshReviewers()},{immediate:true})
const languageItems=languages.map(l=>({label:l.name,value:l.slug as string}))
const invite=reactive({email:'',language:'yoruba'}),inviteMessage=ref('')
async function setReviewer(email:string,language:string,remove=false){
 inviteMessage.value=''
 try{await $fetch('/api/learn/reviewers',{method:'POST',body:{email,language,remove}});if(!remove)invite.email='';await refreshReviewers()}
 catch(e:any){inviteMessage.value=e?.data?.statusMessage||'Could not update reviewers.'}
}
useSeoMeta({title:'Phrase review — Sabipedia',robots:'noindex'})
</script>
<template>
 <section class="learn-review">
  <header><nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/learn">Learn</NuxtLink></nav><h1>Phrase review</h1><p v-if="data" class="home-lede">You review {{data.languages.map(l=>languageBySlug(l)?.name).join(', ')}}. Listen to every recording before you publish.</p></header>
  <div v-if="error" class="notice"><p>{{error.statusCode===401?'Sign in to review phrase pages.':'You are not a reviewer for any language yet.'}}</p><UButton v-if="error.statusCode===401" class="button secondary" :to="{path:'/login',query:{next:'/learn/review'}}">Sign in</UButton></div>
  <template v-else-if="data">
   <p v-if="message" role="status" class="notice">{{message}}</p>
   <h2>Waiting for review <small>{{data.submissions.length}}</small></h2>
   <p v-if="!data.submissions.length" class="field-hint">Nothing waiting.</p>
   <article v-for="item in data.submissions" :key="item.id" class="learn-review-item">
    <header><strong>{{item.content.title}}</strong><span class="home-row-meta"><span>{{languageBySlug(item.language)?.name}}</span><span>{{item.base_content?'Correction':'New page'}}</span><span>by {{item.author}}</span></span><p>{{item.content.summary}}</p><p v-if="item.content.changeNote" class="phrase-note">Change: {{item.content.changeNote}}</p></header>
    <ol class="phrase-list">
     <li v-for="(p,i) in item.content.phrases" :key="i" class="phrase" :class="{'is-changed':changed(item,i)}">
      <div class="phrase-text"><strong>{{p.text}}</strong><span v-if="p.pronunciation" class="phrase-say">{{p.pronunciation}}</span><span class="phrase-meaning">{{p.meaning}}</span><span v-if="changed(item,i)" class="phrase-changed">Changed</span></div>
      <div class="phrase-play"><UButton class="phrase-play-main" @click="play(p.audioId)"><UIcon name="i-lucide-play" class="button-icon icon-play-nudge" aria-hidden="true"/>Play</UButton></div>
      <p v-if="p.note" class="phrase-note">{{p.note}}</p>
     </li>
    </ol>
    <UFormField label="Note to the speaker" hint="Needed when sending back" class="writer-form-field"><UTextarea v-model="notes[item.id]" :rows="2" maxlength="2000" class="writer-input" /></UFormField>
    <div class="learn-review-actions">
     <UButton class="secondary" :disabled="busy===item.id" @click="decide(item,'reject')">Send back</UButton>
     <UButton class="primary" :disabled="busy===item.id||(item.author_id===data.userId&&!me?.isAdmin)" @click="decide(item,'publish')">Publish</UButton>
     <span v-if="item.author_id===data.userId&&!me?.isAdmin" class="field-hint">Another reviewer must publish your own page.</span>
    </div>
   </article>
   <h2>Reported phrases <small>{{data.flags.length}}</small></h2>
   <p v-if="!data.flags.length" class="field-hint">No open reports.</p>
   <ul v-else class="home-list"><li v-for="f in data.flags" :key="f.id" class="learn-mine-row">
    <div><strong>{{f.phrase}}</strong><span class="home-row-meta"><NuxtLink :to="`/learn/${f.language}/${f.slug}`">{{f.title}}</NuxtLink><span>reported by {{f.author}}</span></span><p class="phrase-note">{{f.note}}</p></div>
    <span class="learn-flag-actions"><UButton class="button secondary" :to="`/learn/write?lesson=${f.lesson_id}`">Correct</UButton><UButton class="secondary" :disabled="busy===f.id" @click="resolve(f)">Close</UButton></span>
   </li></ul>
  </template>
  <section v-if="me?.isAdmin" class="learn-reviewers"><h2>Language reviewers</h2>
   <form class="pair" @submit.prevent="setReviewer(invite.email,invite.language)"><UFormField label="Account email" class="writer-form-field"><UInput v-model="invite.email" type="email" required class="writer-input" /></UFormField><UFormField label="Language" class="writer-form-field"><USelect v-model="invite.language" :items="languageItems" value-key="value" :ui="{base:'writer-select',content:'writer-select-menu',item:'writer-select-option'}" /></UFormField><UButton type="submit" class="primary">Add reviewer</UButton></form>
   <p v-if="inviteMessage" role="alert" class="field-hint">{{inviteMessage}}</p>
   <ul class="home-list"><li v-for="r in reviewers||[]" :key="r.user_id+r.language" class="learn-mine-row"><div><strong>{{r.name}}</strong><span class="home-row-meta"><span>{{r.email}}</span><span>{{languageBySlug(r.language)?.name}}</span></span></div><UButton class="secondary" @click="setReviewer(r.email,r.language,true)">Remove</UButton></li></ul>
  </section>
 </section>
</template>
