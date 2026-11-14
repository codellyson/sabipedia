<script setup lang="ts">
import { categories, type GuideContent } from '~~/shared/guide'
import type { AiReview } from '~~/server/utils/ai-review'
import { aiName } from '~~/shared/ai-name'

type Submission = {id:string;author:string;content:GuideContent;created_at:string;ai_review:AiReview|null}
const aiVerdict={looks_ready:[`${aiName}: looks ready`,'is-published'],needs_changes:[`${aiName}: needs changes`,'is-warning'],reject:[`${aiName}: likely reject`,'is-rejected']} as const
type Decision = {id:string;state:'published'|'rejected';title:string;author:string;reviewer:string|null;moderator_note:string|null;reviewed_at:string|null;slug:string|null}
type ReviewData = {submissions:Submission[];disputes:Array<{id:string;slug:string;note:string;author:string}>;decisions:Decision[]}

const {data,error,refresh}=await useFetch<ReviewData>('/api/review')
const route=useRoute()
const isGuideReview=computed(()=>typeof route.params.id==='string')
const message=ref(''),busy=ref(false),search=ref(''),category=ref('All topics'),page=ref(1)
const notes=reactive<Record<string,string>>({})
const pageSize=15
const categoryItems=['All topics',...categories]
const filtered=computed(()=>{
 const term=search.value.trim().toLowerCase()
 return (data.value?.submissions||[]).filter(item=>(category.value==='All topics'||item.content.category===category.value)&&(!term||[item.content.title,item.content.summary,item.author,...item.content.sources].some(value=>value.toLowerCase().includes(term))))
})
const pageCount=computed(()=>Math.max(1,Math.ceil(filtered.value.length/pageSize)))
const visible=computed(()=>filtered.value.slice((page.value-1)*pageSize,page.value*pageSize))
watch([search,category],()=>{page.value=1})
watch(pageCount,count=>{if(page.value>count)page.value=count})

function submitted(value:string){const date=new Date(value.includes('T')?value:value.replace(' ','T')+'Z');return Number.isNaN(date.valueOf())?value:new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric'}).format(date)}
function sourceHost(source:string){const url=source.match(/https?:\/\/[^\s)]+/)?.[0];if(!url)return source||'No source supplied';try{return new URL(url).hostname.replace(/^www\./,'')}catch{return 'Source supplied'}}
async function reopen(id:string){busy.value=true;try{await $fetch('/api/review/decisions/'+id+'/reopen',{method:'POST'});await refresh();message.value='Submission reopened and returned to the review queue.'}catch(e:any){message.value=e.data?.statusMessage||'Could not reopen submission'}finally{busy.value=false}}
async function resolve(id:string){busy.value=true;try{await $fetch('/api/review/disputes/'+id,{method:'POST',body:{resolution:notes[id]||''}});await refresh()}catch(e:any){message.value=e.data?.statusMessage||'Could not resolve dispute'}finally{busy.value=false}}
</script>

<template>
 <NuxtPage v-if="isGuideReview" />
 <section v-else class="review-inbox">
  <header class="review-page-header">
   <div><p class="eyebrow">Moderator workspace</p><h1>Articles waiting for you.</h1><p>Read each article as a reader would, check its sources, then decide what happens next.</p></div>
   <div class="review-role"><span>Signed in as</span><strong>Content moderator</strong><small>You can review and publish articles.</small></div>
  </header>
  <p v-if="error" class="notice">Sign in with a moderator or admin account to review contributions.</p>
  <p v-if="message" class="notice" role="status">{{message}}</p>

  <template v-if="data">
   <section aria-labelledby="waiting-heading">
    <div class="review-heading"><div><h2 id="waiting-heading">Waiting for review</h2><p>{{filtered.length===data.submissions.length?`${data.submissions.length} articles`:`${filtered.length} of ${data.submissions.length} articles`}}</p></div></div>
    <div class="review-filters"><UInput v-model="search" icon="i-lucide-search" placeholder="Search title, contributor or source" aria-label="Search review queue" class="review-search" :ui="{base:'review-search-control',leading:'review-search-leading',leadingIcon:'writer-icon'}" /><USelect v-model="category" :items="categoryItems" aria-label="Filter by topic" :ui="{base:'review-filter-select',content:'writer-select-menu',item:'writer-select-option'}" /></div>
    <p v-if="!filtered.length" class="empty">No articles match these filters.</p>
    <div v-else class="review-inbox-list">
     <article v-for="item in visible" :key="item.id" class="review-inbox-row">
      <div class="review-inbox-main"><div class="review-kicker"><span>{{item.content.category}}</span><span>Submitted {{submitted(item.created_at)}}</span></div><h3>{{item.content.title}}</h3><p>{{item.content.summary}}</p><div class="review-row-foot"><span class="review-contributor">By {{item.author}}</span><span v-if="item.ai_review?.status==='done'" class="decision-status" :class="aiVerdict[item.ai_review.verdict][1]">{{aiVerdict[item.ai_review.verdict][0]}}<template v-if="item.ai_review.flags.length"> · {{item.ai_review.flags.length}} {{item.ai_review.flags.length===1?'issue':'issues'}}</template></span></div></div>
      <div class="review-source-summary"><span>Sources</span><strong v-if="item.content.sources.length">{{item.content.sources.length}} supplied</strong><strong v-else>No source supplied</strong><small v-if="item.content.sources.length">{{sourceHost(item.content.sources[0]!)}}{{item.content.sources.length>1?` + ${item.content.sources.length-1} more`:''}}</small></div>
      <NuxtLink class="button secondary review-open" :to="`/review/${item.id}`">Review article <UIcon name="i-lucide-arrow-right" class="button-icon" aria-hidden="true"/></NuxtLink>
     </article>
    </div>
    <nav v-if="pageCount>1" class="review-pagination" aria-label="Review queue pages"><UButton color="neutral" variant="outline" :disabled="page===1" @click="page--"><UIcon name="i-lucide-arrow-left" class="button-icon"/>Previous</UButton><span>Page {{page}} of {{pageCount}}</span><UButton color="neutral" variant="outline" :disabled="page===pageCount" @click="page++">Next<UIcon name="i-lucide-arrow-right" class="button-icon"/></UButton></nav>
   </section>

   <div class="review-heading"><div><h2>Recent decisions</h2><p>{{Math.min(data.decisions.length,20)}} shown</p></div></div>
   <p v-if="!data.decisions.length" class="empty">No completed reviews yet.</p>
   <div v-else class="review-table-wrap">
    <table class="review-table decision-table">
     <thead><tr><th>Article</th><th>Decision</th><th>Review note</th><th>Reviewed</th><th><span class="sr-only">Actions</span></th></tr></thead>
     <tbody><tr v-for="decision in data.decisions.slice(0,20)" :key="decision.id">
      <td><NuxtLink v-if="decision.slug" :to="'/guides/'+decision.slug"><strong>{{decision.title}}</strong></NuxtLink><strong v-else>{{decision.title}}</strong><span class="review-cell-meta">Submitted by {{decision.author}}</span></td>
      <td><span class="decision-status" :class="`is-${decision.state}`">{{decision.state==='published'?'Published':'Rejected'}}</span></td>
      <td>{{decision.moderator_note||'No review note'}}</td>
      <td>{{decision.reviewer||'Moderator'}}<span class="review-cell-meta">{{decision.reviewed_at||'Earlier decision'}}</span></td>
      <td class="review-row-action"><UButton v-if="decision.state==='rejected'" color="neutral" variant="outline" size="sm" :disabled="busy" @click="reopen(decision.id)">Reopen</UButton></td>
     </tr></tbody>
    </table>
   </div>

   <div class="review-heading"><div><h2>Major corrections</h2><p>{{data.disputes.length}} open</p></div></div>
   <p v-if="!data.disputes.length">No unresolved major corrections.</p>
   <article v-for="d in data.disputes" :key="String(d.id)" class="panel"><NuxtLink :to="'/guides/'+d.slug">Open article</NuxtLink><p>{{d.note}}</p><p class="muted">Reported by {{d.author}}</p><label>Resolution<textarea v-model="notes[String(d.id)]" placeholder="Explain what was corrected and how the dispute was resolved." minlength="10" /></label><button :disabled="busy" @click="resolve(String(d.id))">Resolve dispute</button></article>
  </template>
 </section>
</template>
