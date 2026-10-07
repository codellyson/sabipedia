<script setup lang="ts">
import { confirmationReasons } from '~~/shared/guide'
import type { GuideDetail, RevisionComparison } from '~~/shared/types'
import { siteName, siteOrigin, socialImage } from '~~/shared/seo'
import { authClient } from '~/utils/auth'

const {data:options,status:optionsStatus,error:optionsError}=await useGuideOptions()
const route=useRoute()
const session=authClient.useSession()
const canReview=computed(()=>session.value.data?.user.role?.split(',').some(role=>['admin','moderator'].includes(role)))
const {data:g,error,refresh}=await useFetch<GuideDetail>('/api/guides/'+encodeURIComponent(String(route.params.slug)))
if(error.value) throw createError({statusCode:404,statusMessage:'Guide not found'})
const reason=ref(''),community=ref(''),location=ref(''),note=ref(''),message=ref(''),busy=ref(false)
const revisionComparison=ref<RevisionComparison|null>(null),revisionBusy=ref(false),stepMode=ref(false),completed=ref<number[]>([])
const optionalSections=[{key:'tips',label:'Helpful tips'},{key:'warnings',label:'Things to watch out for'},{key:'variations',label:'Local variations'}] as const
const storageKey=computed(()=>`wikihownaija:progress:${g.value?.id||route.params.slug}`)
const reviewedDate=computed(()=>{const value=g.value?.created_at;if(!value)return '';const date=new Date(value.includes('T')?value:value.replace(' ','T')+'Z');return Number.isNaN(date.valueOf())?'':new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric'}).format(date)})
const completion=computed(()=>g.value?.content.steps.length?Math.round(completed.value.length/g.value.content.steps.length*100):0)
const generalMedia=computed(()=>{const guide=g.value;if(!guide)return[];const used=new Set(guide.content.stepMediaIds?.flat()||[]);return guide.media.filter(item=>!used.has(item.id))})
onMounted(()=>{try{completed.value=JSON.parse(localStorage.getItem(storageKey.value)||'[]')}catch{}})
watch(completed,value=>{try{localStorage.setItem(storageKey.value,JSON.stringify(value))}catch{}},{deep:true})
function toggleStep(index:number){completed.value=completed.value.includes(index)?completed.value.filter(item=>item!==index):[...completed.value,index]}
const guideUrl=computed(()=>`${siteOrigin}/guides/${encodeURIComponent(g.value?.slug || String(route.params.slug))}`)
const guideImage=computed(()=>{
 const firstImage=g.value?.media.find(item=>item.content_type.startsWith('image/'))
 return firstImage ? `${siteOrigin}/api/media/${encodeURIComponent(firstImage.id)}` : socialImage
})
useSeoMeta({
 title:()=>g.value?`${g.value.content.title} — ${siteName}`:siteName,
 description:()=>g.value?.content.summary,
 ogType:'article',
 ogTitle:()=>g.value?.content.title,
 ogDescription:()=>g.value?.content.summary,
 ogImage:()=>guideImage.value,
 twitterTitle:()=>g.value?.content.title,
 twitterDescription:()=>g.value?.content.summary,
 twitterImage:()=>guideImage.value,
 articlePublishedTime:()=>g.value?.history.at(-1)?.created_at?.replace(' ','T')+'Z',
 articleModifiedTime:()=>g.value?.created_at.replace(' ','T')+'Z',
})
useHeadSafe({script:computed(()=>g.value?[{
 type:'application/ld+json',
 textContent:JSON.stringify({
  '@context':'https://schema.org',
  '@type':'Article',
  headline:g.value.content.title,
  description:g.value.content.summary,
  mainEntityOfPage:guideUrl.value,
  image:guideImage.value,
  datePublished:g.value.history.at(-1)?.created_at?.replace(' ','T')+'Z',
  dateModified:g.value.created_at.replace(' ','T')+'Z',
  author:{'@type':'Person',name:g.value.author},
  publisher:{'@type':'Organization',name:siteName,url:siteOrigin},
 })
}]:[])})
async function act(action:'confirm'|'flag'){
 if(!g.value)return
 busy.value=true;message.value=''
 try{await $fetch(`/api/guides/${g.value.id}/${action}`,{method:'POST',body:action==='confirm'?{versionId:g.value.version_id,reason:reason.value,community:community.value,location:location.value}:{versionId:g.value.version_id,note:note.value}});message.value=action==='confirm'?'Your confirmation has been recorded.':'Your correction has been sent for review.';await refresh()}
 catch(e:any){message.value=e.data?.statusMessage||'Could not save your response'}finally{busy.value=false}
}
async function showRevision(id:string){revisionBusy.value=true;message.value='';try{revisionComparison.value=await $fetch<RevisionComparison>('/api/review/versions/'+encodeURIComponent(id));await nextTick();document.querySelector('.guide-reader')?.scrollIntoView({behavior:'smooth',block:'start'})}catch(e:any){message.value=e.data?.statusMessage||'Could not load this revision'}finally{revisionBusy.value=false}}
</script>

<template>
 <article v-if="g" class="guide-reader">
  <StepMode v-if="stepMode" :guide-id="g.id" :title="g.content.title" :steps="g.content.steps" :step-documents="g.content.stepDocuments" :step-media-ids="g.content.stepMediaIds" :requirements="g.content.requirements" @close="stepMode=false" />
  <nav class="guide-breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Home</NuxtLink><UIcon name="i-lucide-chevron-right" class="breadcrumb-icon" aria-hidden="true"/><NuxtLink :to="{path:'/',query:{category:g.content.category}}">{{g.content.category}}</NuxtLink></nav>
  <ClientOnly><div v-if="canReview&&!revisionComparison" class="inline-revision-toolbar"><span><strong>Editor tools</strong> · See what changed in this revision</span><button class="secondary" :disabled="revisionBusy" @click="showRevision(g.version_id)">Show latest edits</button></div></ClientOnly>
  <InlineRevisionDocument v-if="revisionComparison" :comparison="revisionComparison" @close="revisionComparison=null" />
  <template v-else>
   <div class="reader-layout">
    <main class="reader-main">
     <header class="reader-hero">
      <p class="reader-topic">{{g.content.category}}</p>
      <h1>{{g.content.title}}</h1>
      <div class="reader-byline"><span class="avatar">{{g.author.slice(0,2).toUpperCase()}}</span><p><strong>{{g.verified?'Community verified':'Reviewed guide'}}</strong><span>Written by {{g.author}} · Updated {{reviewedDate}}</span></p></div>
      <p class="reader-summary">{{g.content.summary}}</p>
      <dl class="reader-facts"><div><dt>Steps</dt><dd>{{g.content.steps.length}}</dd></div><div><dt>What you need</dt><dd>{{g.content.requirements.length||'Nothing listed'}}</dd></div><div><dt>Applies in</dt><dd>{{g.content.location||g.content.community||'Nigeria'}}</dd></div></dl>
      <div v-if="g.content.requirements.length" class="reader-requirements"><strong>You’ll need</strong><span v-for="item in g.content.requirements" :key="item">{{item}}</span></div>
      <button class="reader-start" @click="stepMode=true"><span><strong>Doing this now?</strong><small>Follow one step at a time and keep your place.</small></span><b>Start step-by-step <UIcon name="i-lucide-arrow-right" class="button-icon"/></b></button>
     </header>

     <GuideVideoPanel :guide="g" :can-review="Boolean(canReview)" @published="refresh" />
     <p v-if="g.disputes" class="reader-warning">This guide has an unresolved major correction. Check its sources before following it.</p>
     <section id="how-to" class="reader-procedure"><div class="reader-section-title"><span>HOW TO</span><h2>Follow these steps</h2></div>
      <ol class="reader-steps"><li v-for="(step,i) in g.content.steps" :key="i" :class="{complete:completed.includes(i)}"><button class="step-check" :aria-label="completed.includes(i)?`Mark step ${i+1} incomplete`:`Mark step ${i+1} done`" @click="toggleStep(i)"><UIcon v-if="completed.includes(i)" name="i-lucide-check" class="button-icon"/><template v-else>{{i+1}}</template></button><div><h3><RichText :document="g.content.stepDocuments?.[i]" :text="step" /></h3><div v-if="g.content.stepMediaIds?.[i]?.length" class="reader-step-images"><img v-for="id in g.content.stepMediaIds[i]" :key="id" :src="`/api/media/${id}`" :alt="`Image showing step ${i+1}`" loading="lazy"></div><button class="step-done" @click="toggleStep(i)">{{completed.includes(i)?'Done':'Mark as done'}}</button></div></li></ol>
     </section>
     <section v-for="section in optionalSections" :id="section.key" :key="section.key" class="reader-list-section"><template v-if="g.content[section.key].length"><h2>{{section.label}}</h2><ul><li v-for="item in g.content[section.key]" :key="item">{{item}}</li></ul></template></section>
     <section v-if="generalMedia.length" class="reader-media"><h2>More photos and audio</h2><div class="media-grid"><template v-for="item in generalMedia" :key="item.id"><audio v-if="item.content_type.startsWith('audio/')" controls :src="`/api/media/${item.id}`" /><img v-else :src="`/api/media/${item.id}`" :alt="`Media supporting ${g.content.title}`" loading="lazy"></template></div></section>
     <section v-if="g.content.sources.length" id="sources" class="reader-sources"><h2>Sources and references</h2><SourceList :sources="g.content.sources" /></section>
    </main>
    <aside class="reader-rail">
     <section class="reader-progress"><div><strong>Your progress</strong><span>{{completed.length}} of {{g.content.steps.length}}</span></div><progress :value="completion" max="100" /><button @click="stepMode=true">Continue step-by-step</button></section>
     <section class="reader-help"><strong>Did this help?</strong><div><button>Yes</button><button>No</button></div><a href="#confirm-guide">I did this — confirm the guide</a></section>
    </aside>
   </div>

   <section id="confirm-guide" class="reader-community"><div><p class="eyebrow">Community check</p><h2>Have you done this?</h2><p>Confirm that this guide works, or explain what should change.</p></div><form @submit.prevent="act('confirm')"><UFormField label="How do you know?" class="writer-form-field"><ChoiceInput v-model="reason" :items="confirmationReasons" placeholder="Choose your experience" :disabled="busy" required /></UFormField><div class="pair"><UFormField label="Community" class="writer-form-field"><ChoiceInput v-model="community" :items="options.communities" :loading="optionsStatus==='pending'" allow-custom placeholder="Your community" :disabled="busy" /></UFormField><UFormField label="Location" class="writer-form-field"><ChoiceInput v-model="location" :items="options.locations" :loading="optionsStatus==='pending'" allow-custom placeholder="Your location" :disabled="busy" /></UFormField></div><button class="primary" :disabled="busy||!reason">Yes, this worked for me</button></form></section>
   <section class="reader-improve"><div><h2>Help improve this guide</h2><p>Spot something that is unclear, outdated, or different where you live?</p></div><NuxtLink class="button secondary" :to="{path:'/write',query:{edit:g.slug}}">Suggest an improvement</NuxtLink><UCollapsible class="guide-disclosure" :ui="{content:'animated-disclosure'}"><template #default="{open}"><UButton class="disclosure-trigger"><UIcon name="i-lucide-chevron-right" class="disclosure-chevron button-icon" :class="{'is-open':open}" aria-hidden="true"/>Report a major problem</UButton></template><template #content><form @submit.prevent="act('flag')"><label>What is wrong?<textarea v-model="note" placeholder="Name the incorrect part and explain what should replace it." required minlength="10" maxlength="4000" /></label><button :disabled="busy">Send for review</button></form></template></UCollapsible><p v-if="message" class="notice" role="status">{{message}}</p></section>
   <section v-if="g.related.length" class="reader-related"><h2>Related how-tos</h2><div class="related-guides"><NuxtLink v-for="item in g.related" :key="item.slug" :to="'/guides/'+item.slug" class="related-guide"><strong>{{item.title}}</strong><span>{{item.summary}}</span><span>Read guide <UIcon name="i-lucide-arrow-right" class="button-icon"/></span></NuxtLink></div></section>
   <section class="reader-history"><details><summary>Revision history · {{g.history.length}} versions</summary><div v-for="v in g.history" :key="String(v.id)" class="history"><strong>Revision {{v.number}}</strong><ClientOnly><template v-if="canReview"> · <button class="link" :disabled="revisionBusy" @click="showRevision(v.id)">View edits inline</button></template></ClientOnly><p>{{v.author}} · {{v.created_at}}</p><small>{{v.change_note||'Published revision'}}</small></div></details></section>
  </template>
 </article>
</template>
