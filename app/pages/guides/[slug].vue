<script setup lang="ts">
import { confirmationReasons } from '~~/shared/guide'
import type { GuideDetail, RevisionComparison } from '~~/shared/types'
import { authClient } from '~/utils/auth'

const {data:options,status:optionsStatus,error:optionsError}=await useGuideOptions()
const route=useRoute()
const session=authClient.useSession()
const canReview=computed(()=>session.value.data?.user.role?.split(',').some(role=>['admin','moderator'].includes(role)))
const {data:g,error,refresh}=await useFetch<GuideDetail>('/api/guides/'+encodeURIComponent(String(route.params.slug)))
if(error.value) throw createError({statusCode:404,statusMessage:'Guide not found'})
const reason=ref(''),community=ref(''),location=ref(''),note=ref(''),message=ref(''),busy=ref(false)
const revisionComparison=ref<RevisionComparison|null>(null)
const revisionBusy=ref(false)
const optionalSections=[{key:'tips',label:'Tips'},{key:'warnings',label:'Warnings'},{key:'variations',label:'Variations'}] as const
const onThisPage=computed(()=>{
 if(!g.value)return []
 const content=g.value.content
 return [
  ...(content.requirements.length?[{id:'what-you-need',label:'What you need'}]:[]),
  {id:'how-to',label:'How to do it'},
  ...optionalSections.filter(section=>content[section.key].length).map(section=>({id:section.key,label:section.label})),
  ...(content.sources.length?[{id:'sources',label:'Sources'}]:[]),
  ...(g.value.related.length?[{id:'related-guides',label:'Related how-tos'}]:[])
 ]
})
useSeoMeta({title:()=>g.value?.content.title+' — wikihownaija',description:()=>g.value?.content.summary})
async function act(action:'confirm'|'flag'){
 if(!g.value)return
 busy.value=true;message.value=''
 try{
  await $fetch(`/api/guides/${g.value.id}/${action}`,{method:'POST',body:action==='confirm'?{versionId:g.value.version_id,reason:reason.value,community:community.value,location:location.value}:{versionId:g.value.version_id,note:note.value}})
  message.value=action==='confirm'?'Your confirmation has been recorded.':'Your correction has been sent for review.'
  await refresh()
 }catch(e:any){message.value=e.data?.statusMessage||'Could not save your response'}finally{busy.value=false}
}
async function showRevision(id:string){
 revisionBusy.value=true;message.value=''
 try{revisionComparison.value=await $fetch<RevisionComparison>('/api/review/versions/'+encodeURIComponent(id));await nextTick();document.querySelector('.guide-breadcrumb')?.scrollIntoView({behavior:'smooth',block:'start'})}
 catch(e:any){message.value=e.data?.statusMessage||'Could not load this revision'}
 finally{revisionBusy.value=false}
}
</script>

<template>
 <article v-if="g" class="reading">
  <nav class="guide-breadcrumb" aria-label="Breadcrumb">
   <NuxtLink to="/">Explore</NuxtLink><span aria-hidden="true">/</span><NuxtLink :to="{path:'/',query:{category:g.content.category}}">{{g.content.category}}</NuxtLink>
  </nav>
  <ClientOnly><div v-if="canReview&&!revisionComparison" class="inline-revision-toolbar"><span><strong>Admin tools</strong> · Inspect edits inside this document</span><button class="secondary" :disabled="revisionBusy" @click="showRevision(g.version_id)">Show latest edits</button></div></ClientOnly>
  <InlineRevisionDocument v-if="revisionComparison" :comparison="revisionComparison" @close="revisionComparison=null" />
  <template v-else>
  <h1>{{g.content.title}}</h1>
  <p class="lead">{{g.content.summary}}</p>
  <p class="guide-facets">
   <NuxtLink v-if="g.content.community" :to="{path:'/',query:{community:g.content.community}}">{{g.content.community}}</NuxtLink>
   <NuxtLink v-if="g.content.location" :to="{path:'/',query:{location:g.content.location}}">{{g.content.location}}</NuxtLink>
   <span v-if="!g.content.community&&!g.content.location">Across Nigeria</span><span>English</span>
  </p>
  <p class="muted">Revision {{g.number}} · Documented by {{g.author}}</p>
  <span class="badge" :class="{verified:g.verified}">{{g.verified?'Community verified':`${g.confirmations} confirmations on this revision`}}</span>
  <p v-if="g.disputes" class="notice">This guide has an unresolved major correction. Review its sources before following it.</p>

  <nav v-if="onThisPage.length>1" class="document-nav" aria-label="On this page">
   <strong>On this page</strong>
   <a v-for="item in onThisPage" :key="item.id" :href="`#${item.id}`">{{item.label}}</a>
  </nav>

  <section v-if="g.content.requirements.length" id="what-you-need"><h2>What you need</h2><ul><li v-for="item in g.content.requirements" :key="item">{{item}}</li></ul></section>
  <section id="how-to"><h2>How to do it</h2><ol class="steps"><li v-for="(step,i) in g.content.steps" :key="i"><RichText :document="g.content.stepDocuments?.[i]" :text="step" /></li></ol></section>
  <section v-if="g.content.mediaIds?.length" id="media"><h2>Photos and audio</h2><div v-for="item in g.media" :key="item.id"><audio v-if="item.content_type.startsWith('audio/')" controls :src="`/api/media/${item.id}`" /><img v-else :src="`/api/media/${item.id}`" :alt="`Media supporting ${g.content.title}`" loading="lazy" style="max-width:100%"></div></section>
  <section v-for="section in optionalSections" :id="section.key" :key="section.key"><template v-if="g.content[section.key].length"><h2>{{section.label}}</h2><ul><li v-for="item in g.content[section.key]" :key="item">{{item}}</li></ul></template></section>
  <section v-if="g.content.sources.length" id="sources"><h2>Sources</h2><SourceList :sources="g.content.sources" /></section>

  <section v-if="g.related.length" id="related-guides">
   <h2>Related how-tos</h2>
   <div class="related-guides">
    <NuxtLink v-for="item in g.related" :key="item.slug" :to="'/guides/'+item.slug" class="related-guide">
     <strong>{{item.title}}</strong><span>{{item.summary}}</span><span aria-hidden="true">Read guide →</span>
    </NuxtLink>
   </div>
  </section>
  </template>

  <template v-if="!revisionComparison"><section class="panel"><h2>Do you know this practice?</h2><p>Your confirmation applies to revision {{g.number}}.</p><form @submit.prevent="act('confirm')"><UFormField label="How do you know?" class="writer-form-field"><ChoiceInput v-model="reason" :items="confirmationReasons" placeholder="Choose how you know this practice" :disabled="busy" required /></UFormField><div class="pair"><UFormField label="Your relevant community" class="writer-form-field"><ChoiceInput v-model="community" :items="options.communities" :loading="optionsStatus==='pending'" allow-custom placeholder="Select or enter your community" :disabled="busy" /></UFormField><UFormField label="Your relevant location" class="writer-form-field"><ChoiceInput v-model="location" :items="options.locations" :loading="optionsStatus==='pending'" allow-custom placeholder="Select or enter your location" :disabled="busy" /></UFormField></div><p v-if="optionsError" class="field-hint" role="status">Suggestions could not be loaded. You can still enter your own context.</p><button :disabled="busy||!reason">I can confirm this</button></form></section>
  <section><h2>Help improve this guide</h2><NuxtLink :to="{path:'/write',query:{edit:g.slug}}">Suggest a correction or variation</NuxtLink><UCollapsible class="guide-disclosure" :ui="{content:'animated-disclosure'}"><template #default="{open}"><UButton class="disclosure-trigger"><span class="disclosure-chevron" :class="{'is-open':open}" aria-hidden="true">›</span>Flag a major correction / “this is wrong”</UButton></template><template #content><form @submit.prevent="act('flag')"><label>Explain the problem<textarea v-model="note" placeholder="Explain which part is incorrect and how it should be corrected." required minlength="10" maxlength="4000" /></label><button :disabled="busy">Send for review</button></form></template></UCollapsible><p v-if="message" class="notice" role="status">{{message}}</p></section></template>
  <section><h2>Revision history</h2><div v-for="v in g.history" :key="String(v.id)" class="history"><strong>Revision {{v.number}}</strong><ClientOnly><template v-if="canReview"> · <button class="link" :disabled="revisionBusy" @click="showRevision(v.id)">View edits inline</button></template></ClientOnly><p>{{v.author}} · {{v.created_at}}</p><p>{{v.change_note||'Published revision'}}</p><small>{{v.confirmations}} confirmations {{v.id===g.version_id?'on this revision':'on this previous revision'}}</small></div></section>
 </article>
</template>
