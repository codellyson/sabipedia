<script setup lang="ts">
import { categorySlug, confirmationReasons } from '~~/shared/guide'
import type { GuideDetail, RevisionComparison } from '~~/shared/types'
import { siteName, siteOrigin, socialImage } from '~~/shared/seo'
import { authClient } from '~/utils/auth'

const {data:options,status:optionsStatus,error:optionsError}=useGuideOptions(false)
const route=useRoute()
const session=authClient.useSession()
const canReview=computed(()=>session.value.data?.user.role?.split(',').some(role=>['admin','moderator'].includes(role)))
const {data:g,error,refresh}=await useFetch<GuideDetail>('/api/guides/'+encodeURIComponent(String(route.params.slug)))
if(error.value) throw createError({statusCode:404,statusMessage:'Guide not found'})
const reason=ref(''),community=ref(''),location=ref(''),note=ref(''),message=ref(''),busy=ref(false)
const revisionComparison=ref<RevisionComparison|null>(null),revisionBusy=ref(false),stepMode=ref(false),completed=ref<number[]>([])
const storageKey=computed(()=>`wikihownaija:progress:${g.value?.id||route.params.slug}`)
const reviewedDate=computed(()=>{const value=g.value?.created_at;if(!value)return '';const date=new Date(value.includes('T')?value:value.replace(' ','T')+'Z');return Number.isNaN(date.valueOf())?'':new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric'}).format(date)})
const completion=computed(()=>g.value?.content.steps.length?Math.round(completed.value.length/g.value.content.steps.length*100):0)
const generalMedia=computed(()=>{const guide=g.value;if(!guide)return[];const used=new Set(guide.content.stepMediaIds?.flat()||[]);return guide.media.filter(item=>!used.has(item.id))})
function loadProgress(){try{completed.value=JSON.parse(localStorage.getItem(storageKey.value)||'[]')}catch{}}
onMounted(loadProgress)
watch(completed,value=>{try{localStorage.setItem(storageKey.value,JSON.stringify(value))}catch{}},{deep:true})
function toggleStep(index:number){completed.value=completed.value.includes(index)?completed.value.filter(item=>item!==index):[...completed.value,index]}
function closeStepMode(){stepMode.value=false;loadProgress()}
const nextStep=computed(()=>g.value?g.value.content.steps.findIndex((_,i)=>!completed.value.includes(i)):-1)
const allDone=computed(()=>Boolean(g.value?.content.steps.length)&&nextStep.value===-1)
// Bold the opening sentence of plain-text steps so readers can scan the actions; rich steps keep their own formatting.
function stepLead(text:string){const m=text.match(/^(.+?[.!?])\s+(\S[\s\S]*)$/);return m?{lead:m[1],rest:m[2]}:{lead:text,rest:''}}
const needed=ref<string[]>([])
function openConfirm(){const el=document.getElementById('confirm-guide') as HTMLDetailsElement|null;if(el){el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'})}}
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
// Recipe markup earns recipe cards for food guides; every other guide is a HowTo.
const structuredData=computed(()=>{
 const guide=g.value;if(!guide)return null
 const c=guide.content,isRecipe=c.category==='Food & Cooking'
 const author=guide.author.startsWith('WikiHowNaija')?{'@type':'Organization',name:siteName,url:siteOrigin}:{'@type':'Person',name:guide.author}
 const steps=c.steps.map((text,i)=>({'@type':'HowToStep',position:i+1,text}))
 return {
  '@context':'https://schema.org',
  '@type':isRecipe?'Recipe':'HowTo',
  name:c.title,
  description:c.summary,
  url:guideUrl.value,
  mainEntityOfPage:guideUrl.value,
  image:[guideImage.value],
  datePublished:guide.history.at(-1)?.created_at?.replace(' ','T')+'Z',
  dateModified:guide.created_at.replace(' ','T')+'Z',
  author,
  publisher:{'@type':'Organization',name:siteName,url:siteOrigin},
  ...(isRecipe
   ?{recipeCuisine:'Nigerian',recipeIngredient:c.requirements,recipeInstructions:steps,keywords:`Nigerian, ${c.title.replace(/^How to make /i,'')}`}
   :{supply:c.requirements.map(name=>({'@type':'HowToSupply',name})),step:steps}),
 }
})
useHeadSafe({script:computed(()=>structuredData.value?[{type:'application/ld+json',textContent:JSON.stringify(structuredData.value)}]:[])})
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
  <StepMode v-if="stepMode" :guide-id="g.id" :title="g.content.title" :steps="g.content.steps" :step-documents="g.content.stepDocuments" :step-media-ids="g.content.stepMediaIds" :requirements="g.content.requirements" @close="closeStepMode" />
  <nav class="guide-breadcrumb" aria-label="Breadcrumb">
   <NuxtLink to="/">Home</NuxtLink><UIcon name="i-lucide-chevron-right" class="breadcrumb-icon" aria-hidden="true"/><NuxtLink :to="`/topics/${categorySlug(g.content.category)}`">{{g.content.category}}</NuxtLink>
   <ClientOnly><button v-if="canReview&&!revisionComparison" class="guide-editor-chip" :disabled="revisionBusy" @click="showRevision(g.version_id)">Editor · see edits</button></ClientOnly>
  </nav>
  <InlineRevisionDocument v-if="revisionComparison" :comparison="revisionComparison" @close="revisionComparison=null" />
  <div v-else class="guide-layout">
   <div class="guide-main">
    <header class="guide-head">
     <h1>{{g.content.title}}</h1>
     <p class="guide-summary">{{g.content.summary}}</p>
     <p class="guide-meta">
      <span class="guide-badge"><UIcon name="i-lucide-check" aria-hidden="true"/>{{g.verified?'Community verified':'Reviewed'}}</span>
      <span>Updated {{reviewedDate}}</span>
      <span>{{g.content.steps.length}} steps</span>
      <span v-if="g.content.location||g.content.community">{{g.content.location||g.content.community}}</span>
      <a v-if="g.content.warnings.length" href="#warnings" class="guide-meta-warn">{{g.content.warnings.length}} {{g.content.warnings.length===1?'warning':'warnings'}} · read first</a>
     </p>
     <p v-if="g.disputes" class="reader-warning">This guide has an unresolved major correction. Check its sources before following it.</p>
    </header>

    <details v-if="g.content.requirements.length" class="guide-needs">
     <summary><UIcon name="i-lucide-chevron-right" class="guide-chevron" aria-hidden="true"/>What you'll need<span class="guide-count">{{needed.length}} of {{g.content.requirements.length}} ready</span></summary>
     <ul><li v-for="item in g.content.requirements" :key="item"><label><input v-model="needed" type="checkbox" :value="item"><span>{{item}}</span></label></li></ul>
    </details>

    <section id="steps" class="guide-steps-section">
     <div class="guide-section-head"><h2>Steps</h2><span>Tap a number when you finish a step</span></div>
     <ol class="guide-steps">
      <li v-for="(step,i) in g.content.steps" :key="i" :class="{done:completed.includes(i),current:completed.length>0&&i===nextStep}">
       <button class="guide-step-num" :aria-pressed="completed.includes(i)" :aria-label="completed.includes(i)?`Mark step ${i+1} not done`:`Mark step ${i+1} done`" @click="toggleStep(i)"><UIcon v-if="completed.includes(i)" name="i-lucide-check" aria-hidden="true"/><template v-else>{{i+1}}</template></button>
       <div class="guide-step">
        <RichText v-if="g.content.stepDocuments?.[i]" :document="g.content.stepDocuments[i]" :text="step" />
        <p v-else><strong>{{stepLead(step).lead}}</strong> {{stepLead(step).rest}}</p>
        <div v-if="g.content.stepMediaIds?.[i]?.length" class="reader-step-images"><img v-for="id in g.content.stepMediaIds[i]" :key="id" :src="`/api/media/${id}`" :alt="`Image showing step ${i+1}`" loading="lazy"></div>
       </div>
      </li>
     </ol>
    </section>

    <section v-if="g.content.warnings.length" id="warnings" class="guide-box guide-box-warn"><h2><UIcon name="i-lucide-triangle-alert" aria-hidden="true"/>Watch out</h2><ul><li v-for="item in g.content.warnings" :key="item">{{item}}</li></ul></section>
    <section v-if="g.content.tips.length" id="tips" class="guide-box guide-box-tip"><h2><UIcon name="i-lucide-lightbulb" aria-hidden="true"/>Tips</h2><ul><li v-for="item in g.content.tips" :key="item">{{item}}</li></ul></section>
    <section v-if="g.content.variations.length" class="guide-box"><h2>Local variations</h2><ul><li v-for="item in g.content.variations" :key="item">{{item}}</li></ul></section>

    <GuideVideoPanel :guide="g" :can-review="Boolean(canReview)" @published="refresh" />
    <section v-if="generalMedia.length" class="guide-media"><h2>More photos and audio</h2><div class="media-grid"><template v-for="item in generalMedia" :key="item.id"><audio v-if="item.content_type.startsWith('audio/')" controls :src="`/api/media/${item.id}`" /><img v-else :src="`/api/media/${item.id}`" :alt="`Media supporting ${g.content.title}`" loading="lazy"></template></div></section>

    <div class="guide-folds">
     <details v-if="g.content.sources.length" id="sources" class="guide-fold">
      <summary><UIcon name="i-lucide-chevron-right" class="guide-chevron" aria-hidden="true"/>Sources<span class="guide-count">{{g.content.sources.length}}</span></summary>
      <div class="guide-fold-body"><SourceList :sources="g.content.sources" /></div>
     </details>
     <details id="confirm-guide" class="guide-fold">
      <summary><UIcon name="i-lucide-chevron-right" class="guide-chevron" aria-hidden="true"/>Have you done this?<span class="guide-count">{{g.verified?'Verified':'Confirm it worked'}}</span></summary>
      <form class="guide-fold-body" @submit.prevent="act('confirm')">
       <UFormField label="How do you know?" class="writer-form-field"><ChoiceInput v-model="reason" :items="confirmationReasons" placeholder="Choose your experience" :disabled="busy" required /></UFormField>
       <div class="pair"><UFormField label="Community" class="writer-form-field"><ChoiceInput v-model="community" :items="options.communities" :loading="optionsStatus==='pending'" allow-custom placeholder="Your community" :disabled="busy" /></UFormField><UFormField label="Location" class="writer-form-field"><ChoiceInput v-model="location" :items="options.locations" :loading="optionsStatus==='pending'" allow-custom placeholder="Your location" :disabled="busy" /></UFormField></div>
       <button class="guide-btn-primary" :disabled="busy||!reason">Yes, this worked for me</button>
      </form>
     </details>
     <details class="guide-fold">
      <summary><UIcon name="i-lucide-chevron-right" class="guide-chevron" aria-hidden="true"/>Something wrong or out of date?</summary>
      <div class="guide-fold-body">
       <p>Suggest a correction, or report a major problem to moderators.</p>
       <NuxtLink class="button secondary" :to="{path:'/write',query:{edit:g.slug}}">Suggest an improvement</NuxtLink>
       <form @submit.prevent="act('flag')"><label>Report a major problem<textarea v-model="note" placeholder="Name the incorrect part and explain what should replace it." required minlength="10" maxlength="4000" /></label><button class="secondary" :disabled="busy">Send for review</button></form>
      </div>
     </details>
     <details class="guide-fold">
      <summary><UIcon name="i-lucide-chevron-right" class="guide-chevron" aria-hidden="true"/>History<span class="guide-count">{{g.history.length}} {{g.history.length===1?'version':'versions'}} · by {{g.author}}</span></summary>
      <div class="guide-fold-body"><div v-for="v in g.history" :key="String(v.id)" class="guide-history-item"><strong>Revision {{v.number}}</strong> · {{v.author}} · {{v.created_at}}<ClientOnly><template v-if="canReview"> · <button class="link" :disabled="revisionBusy" @click="showRevision(v.id)">View edits inline</button></template></ClientOnly><small>{{v.change_note||'Published revision'}}</small></div></div>
     </details>
    </div>
    <p v-if="message" class="notice" role="status">{{message}}</p>

    <section v-if="g.related.length" class="guide-related"><h2>Related how-tos</h2><div class="related-guides"><NuxtLink v-for="item in g.related" :key="item.slug" :to="'/guides/'+item.slug" class="related-guide"><strong>{{item.title}}</strong><span>{{item.summary}}</span></NuxtLink></div></section>
   </div>

   <aside class="guide-rail">
    <div class="guide-rail-card">
     <h2>Your progress</h2>
     <strong>{{allDone?'All done':completed.length?`${completed.length} of ${g.content.steps.length} done`:'Not started'}}</strong>
     <div class="guide-track"><span :style="{width:completion+'%'}" /></div>
     <button v-if="allDone" class="guide-btn-go" @click="openConfirm">Confirm this guide</button>
     <button v-else class="guide-btn-go" @click="stepMode=true">{{completed.length?'Continue step-by-step':'Start step-by-step'}}</button>
    </div>
    <nav class="guide-rail-card" aria-label="On this page">
     <h2>On this page</h2>
     <a href="#steps">Steps<span>{{g.content.steps.length}}</span></a>
     <a v-if="g.content.warnings.length" href="#warnings">Watch out<span>{{g.content.warnings.length}}</span></a>
     <a v-if="g.content.tips.length" href="#tips">Tips<span>{{g.content.tips.length}}</span></a>
     <a v-if="g.content.sources.length" href="#sources">Sources<span>{{g.content.sources.length}}</span></a>
     <a href="#confirm-guide" @click.prevent="openConfirm">Have you done this?</a>
    </nav>
   </aside>

   <ClientOnly>
    <div class="guide-bar">
     <div class="guide-bar-text">
      <small>{{allDone?`All ${g.content.steps.length} steps done`:completed.length?`Step ${nextStep+1} of ${g.content.steps.length}`:`${g.content.steps.length} steps`}}</small>
      <strong>{{allDone?'Did it work? Confirm it':completed.length?stepLead(g.content.steps[nextStep]||'').lead:'Ready when you are'}}</strong>
      <div class="guide-track"><span :style="{width:completion+'%'}" /></div>
     </div>
     <button v-if="allDone" @click="openConfirm">Confirm</button>
     <button v-else @click="stepMode=true">{{completed.length?'Continue':'Start'}}</button>
    </div>
   </ClientOnly>
  </div>
 </article>
</template>
