<script setup lang="ts">
import type { GuideContent } from '~~/shared/guide'

type Submission={id:string;state:'awaiting_review';author:string;content:GuideContent;created_at:string}
type Decision={id:string;state:'published'|'rejected';title:string;author:string;reviewer:string|null;moderator_note:string|null;reviewed_at:string|null;slug:string|null}
type ReviewData={submissions:Submission[];decisions:Decision[];totals:{published?:number;rejected?:number}}
const {data,error}=await useFetch<ReviewData>('/api/review')
const search=ref(''),filter=ref<'all'|'review'|'published'|'changes'>('all')
const tabsEl=ref<HTMLElement|null>(null)
const indicatorStyle=reactive({transform:'translateX(0px)',width:'0px'})
const indicatorReady=ref(false)
let tabsObserver:ResizeObserver|undefined
function syncTabIndicator(){
 nextTick(()=>{
  const tab=tabsEl.value?.querySelector<HTMLElement>(`[data-view="${filter.value}"]`)
  if(!tab)return
  indicatorStyle.transform=`translateX(${tab.offsetLeft}px)`
  indicatorStyle.width=`${tab.offsetWidth}px`
  indicatorReady.value=true
 })
}
watch(filter,syncTabIndicator,{flush:'post'})
onMounted(()=>{syncTabIndicator();if(tabsEl.value&&typeof ResizeObserver!=='undefined'){tabsObserver=new ResizeObserver(syncTabIndicator);tabsObserver.observe(tabsEl.value)}})
onBeforeUnmount(()=>tabsObserver?.disconnect())
const rows=computed(()=>{
 const pending=(data.value?.submissions||[]).map(item=>({id:item.id,title:item.content.title,category:item.content.category,summary:item.content.summary,author:item.author,state:'review',edited:item.created_at,to:`/review/${item.id}`}))
 const decisions=(data.value?.decisions||[]).map(item=>({id:item.id,title:item.title,category:'Reviewed guide',summary:item.moderator_note||'Editorial review completed.',author:item.author,state:item.state==='published'?'published':'changes',edited:item.reviewed_at||'',to:item.slug?`/guides/${item.slug}`:'/review'}))
 const term=search.value.trim().toLowerCase()
 return [...pending,...decisions].filter(row=>(filter.value==='all'||row.state===filter.value)&&(!term||[row.title,row.summary,row.author,row.category].some(value=>value.toLowerCase().includes(term))))
})
const counts=computed(()=>({review:data.value?.submissions.length||0,published:data.value?.totals.published||0,changes:data.value?.totals.rejected||0}))
const capped=computed(()=>(data.value?.decisions.length||0)<counts.value.published+counts.value.changes)
const relative=(value:string)=>{if(!value)return 'Recently';const date=new Date(value.includes('T')?value:value.replace(' ','T')+'Z'),minutes=Math.max(1,Math.round((Date.now()-date.valueOf())/60000));return minutes<60?`${minutes} min ago`:minutes<1440?`${Math.round(minutes/60)} hr ago`:new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short'}).format(date)}
useSeoMeta({title:'Guides — Sabipedia'})
</script>

<template>
 <section class="articles-page">
  <header class="admin-page-title"><div><h1>Guides</h1><p>Find guides, follow their review status, and open the next piece of work.</p></div><NuxtLink class="button primary" to="/write"><UIcon name="i-lucide-plus" class="button-icon"/>New guide</NuxtLink></header>
  <p v-if="error" class="notice">The editorial workspace could not be loaded.</p>
  <nav ref="tabsEl" class="article-tabs" aria-label="Guide views">
   <i class="article-tab-indicator" :class="{ready:indicatorReady}" :style="indicatorStyle" aria-hidden="true" />
   <button type="button" data-view="all" :class="{active:filter==='all'}" :aria-pressed="filter==='all'" @click="filter='all'">All guides <span>{{counts.review+counts.published+counts.changes}}</span></button>
   <button type="button" data-view="review" :class="{active:filter==='review'}" :aria-pressed="filter==='review'" @click="filter='review'">Needs review <span>{{counts.review}}</span></button>
   <button type="button" data-view="changes" :class="{active:filter==='changes'}" :aria-pressed="filter==='changes'" @click="filter='changes'">Rejected <span>{{counts.changes}}</span></button>
   <button type="button" data-view="published" :class="{active:filter==='published'}" :aria-pressed="filter==='published'" @click="filter='published'">Published <span>{{counts.published}}</span></button>
  </nav>
  <div class="article-tools"><label class="article-search"><UIcon name="i-lucide-search" class="search-lens" aria-hidden="true"/><input v-model="search" aria-label="Search guides" placeholder="Search title, contributor or topic"></label><span>{{rows.length}} {{rows.length===1?'guide':'guides'}}</span></div>
  <div class="article-list" role="table" aria-label="Guides">
   <div class="article-list-head" role="row"><span>Guide</span><span>Status</span><span>Contributor</span><span>Updated</span><span /></div>
   <TransitionGroup tag="div" name="article-row" class="article-list-body" role="rowgroup">
    <NuxtLink v-for="row in rows" :key="row.id" :to="row.to" class="article-row" role="row">
     <span class="article-identity"><strong>{{row.title}}</strong><small>{{row.category}} · {{row.summary}}</small></span>
     <span><em class="status-pill" :class="`is-${row.state}`">{{row.state==='review'?'Needs review':row.state==='changes'?'Rejected':'Published'}}</em></span>
     <span>{{row.author}}</span><span>{{relative(row.edited)}}</span><UIcon name="i-lucide-arrow-right" class="row-icon" aria-hidden="true"/>
    </NuxtLink>
   </TransitionGroup>
   <Transition name="article-empty"><div v-if="!rows.length" class="empty">No guides match this view.</div></Transition>
   <p v-if="capped" class="article-capped">Showing the latest {{data?.decisions.length}} decisions.</p>
  </div>
 </section>
</template>
