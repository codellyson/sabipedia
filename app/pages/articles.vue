<script setup lang="ts">
import type { GuideContent } from '~~/shared/guide'

type Submission={id:string;state:'awaiting_review';author:string;content:GuideContent;created_at:string}
type Decision={id:string;state:'published'|'rejected';title:string;author:string;reviewer:string|null;moderator_note:string|null;reviewed_at:string|null;slug:string|null}
type ReviewData={submissions:Submission[];decisions:Decision[]}
const {data,error}=await useFetch<ReviewData>('/api/review')
const search=ref(''),filter=ref<'all'|'review'|'published'|'changes'>('all')
const rows=computed(()=>{
 const pending=(data.value?.submissions||[]).map(item=>({id:item.id,title:item.content.title,category:item.content.category,summary:item.content.summary,author:item.author,state:'review',edited:item.created_at,to:`/review/${item.id}`}))
 const decisions=(data.value?.decisions||[]).map(item=>({id:item.id,title:item.title,category:'Reviewed guide',summary:item.moderator_note||'Editorial review completed.',author:item.author,state:item.state==='published'?'published':'changes',edited:item.reviewed_at||'',to:item.slug?`/guides/${item.slug}`:'/review'}))
 const term=search.value.trim().toLowerCase()
 return [...pending,...decisions].filter(row=>(filter.value==='all'||row.state===filter.value)&&(!term||[row.title,row.summary,row.author,row.category].some(value=>value.toLowerCase().includes(term))))
})
const counts=computed(()=>({review:data.value?.submissions.length||0,published:data.value?.decisions.filter(item=>item.state==='published').length||0,changes:data.value?.decisions.filter(item=>item.state==='rejected').length||0}))
const relative=(value:string)=>{if(!value)return 'Recently';const date=new Date(value.includes('T')?value:value.replace(' ','T')+'Z'),minutes=Math.max(1,Math.round((Date.now()-date.valueOf())/60000));return minutes<60?`${minutes} min ago`:minutes<1440?`${Math.round(minutes/60)} hr ago`:new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short'}).format(date)}
useSeoMeta({title:'Articles — WikiHowNaija'})
</script>

<template>
 <section class="articles-page">
  <header class="admin-page-title"><div><h1>Articles</h1><p>Find guides, follow their review status, and open the next piece of work.</p></div><NuxtLink class="button primary" to="/write">＋ New article</NuxtLink></header>
  <p v-if="error" class="notice">The editorial workspace could not be loaded.</p>
  <nav class="article-tabs" aria-label="Article views">
   <button :class="{active:filter==='all'}" @click="filter='all'">All articles <span>{{(data?.submissions.length||0)+(data?.decisions.length||0)}}</span></button>
   <button :class="{active:filter==='review'}" @click="filter='review'">Needs review <span>{{counts.review}}</span></button>
   <button :class="{active:filter==='changes'}" @click="filter='changes'">Changes requested <span>{{counts.changes}}</span></button>
   <button :class="{active:filter==='published'}" @click="filter='published'">Published <span>{{counts.published}}</span></button>
  </nav>
  <div class="article-tools"><label class="article-search"><span aria-hidden="true">⌕</span><input v-model="search" placeholder="Search title, contributor or topic"></label><span>{{rows.length}} articles</span></div>
  <div class="article-list" role="table" aria-label="Articles">
   <div class="article-list-head" role="row"><span>Article</span><span>Status</span><span>Contributor</span><span>Updated</span><span /></div>
   <NuxtLink v-for="row in rows" :key="row.id" :to="row.to" class="article-row" role="row">
    <span class="article-identity"><strong>{{row.title}}</strong><small>{{row.category}} · {{row.summary}}</small></span>
    <span><em class="status-pill" :class="`is-${row.state}`">{{row.state==='review'?'Needs review':row.state==='changes'?'Changes requested':'Published'}}</em></span>
    <span>{{row.author}}</span><span>{{relative(row.edited)}}</span><span aria-hidden="true">→</span>
   </NuxtLink>
   <div v-if="!rows.length" class="empty">No articles match this view.</div>
  </div>
 </section>
</template>
