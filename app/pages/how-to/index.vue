<script setup lang="ts">
import { categories, categorySlug } from '~~/shared/guide'
definePageMeta({alias:'/how-to/:topic'})
const {data:options,status:optionsStatus,error:optionsError}=useGuideOptions(false)
const route=useRoute()
const queryValue=(key:string)=>typeof route.query[key]==='string'?String(route.query[key]):''
const topic=computed(()=>typeof route.params.topic==='string'?categories.find(c=>categorySlug(c)===route.params.topic)||null:null)
if(route.params.topic&&!topic.value) throw createError({statusCode:404,statusMessage:'Topic not found'})
const category=computed(()=>topic.value||queryValue('category'))
const q=ref(queryValue('q')),community=ref(queryValue('community')),location=ref(queryValue('location'))
watch(() => route.query.q, value => { q.value=typeof value==='string'?value:'' })
const searchQuery=ref(q.value), searchCommunity=ref(''), searchLocation=ref('')
let searchTimer:ReturnType<typeof setTimeout>|undefined
watch([q,community,location],()=>{
 clearTimeout(searchTimer)
 searchTimer=setTimeout(()=>{searchQuery.value=q.value;searchCommunity.value=community.value;searchLocation.value=location.value},200)
})
onBeforeUnmount(()=>clearTimeout(searchTimer))
const {data:guides,status,error}=await useFetch('/api/guides',{query:{q:searchQuery,category,community:searchCommunity,location:searchLocation}})
const filtered=computed(()=>Boolean(searchQuery.value||category.value||searchCommunity.value||searchLocation.value))
// Browsing shows every category as a short list; any search or filter shows one flat list.
const sections=computed(()=>{
 const list=guides.value||[]
 if(filtered.value) return [{title:category.value||(searchQuery.value?`Results for “${searchQuery.value}”`:'Matching articles'),category:'',guides:list,total:list.length}]
 return categories.map(c=>{const items=list.filter(g=>g.content.category===c);return {title:c,category:c,guides:items.slice(0,5),total:items.length}}).filter(s=>s.total)
})
const pageTitle=computed(()=>topic.value?`${topic.value} articles from Nigeria — Sabipedia`:'How-to articles for life in Nigeria — Sabipedia')
const pageDescription=computed(()=>topic.value?`Step-by-step ${topic.value.toLowerCase()} articles for life in Nigeria, with sources and community checks.`:'Practical Nigerian knowledge, documented as procedures with sources, local variations and community confirmations.')
useSeoMeta({title:pageTitle,description:pageDescription,ogTitle:pageTitle,ogDescription:pageDescription})
</script>
<template>
 <div class="home">
  <section class="home-top" aria-labelledby="home-title">
   <h1 id="home-title">{{topic?`${topic} articles`:'How To'}}</h1>
   <p v-if="!topic" class="home-lede">Step-by-step articles for getting things done in Nigeria.</p>
   <form class="home-search" role="search" @submit.prevent="navigateTo({path: '/how-to', query: q.trim() ? {q:q.trim()} : {}})">
    <UIcon name="i-lucide-search" class="home-search-icon" aria-hidden="true"/>
    <input v-model="q" type="search" aria-label="Search articles" placeholder="How do I…" autocomplete="off">
   </form>
   <div class="home-cats" role="group" aria-label="Filter by category">
    <NuxtLink to="/how-to" :aria-current="category === '' ? 'page' : undefined">All</NuxtLink>
    <NuxtLink v-for="c in categories" :key="c" :to="`/how-to/${categorySlug(c)}`" :aria-current="category === c ? 'page' : undefined">{{c}}</NuxtLink>
   </div>
   <UCollapsible class="local-filters" :ui="{content:'animated-disclosure'}">
    <template #default="{open}"><UButton class="disclosure-trigger"><UIcon name="i-lucide-chevron-right" class="disclosure-chevron button-icon" :class="{'is-open':open}" aria-hidden="true"/>Filter by community or location <span v-if="community || location" class="filter-active">Filters active</span></UButton></template>
    <template #content><div class="pair">
     <UFormField label="Community" class="writer-form-field"><ChoiceInput v-model="community" :items="options.communities" :loading="optionsStatus==='pending'" placeholder="Any community" /></UFormField>
     <UFormField label="Location" class="writer-form-field"><ChoiceInput v-model="location" :items="options.locations" :loading="optionsStatus==='pending'" placeholder="Any location" /></UFormField>
    </div><p v-if="optionsError" class="field-hint" role="status">Community and location choices could not be loaded. Reload to try again.</p></template>
   </UCollapsible>
  </section>

  <p v-if="error" role="alert" class="notice">We couldn’t load the articles. Please try again.</p>
  <div class="collection-feedback" role="status"><span v-if="status==='pending'">Updating articles…</span></div>

  <div v-if="sections.some(s => s.guides.length)" class="home-sections" :class="{'is-filtered':filtered}" :aria-busy="status==='pending'">
   <section v-for="s in sections" :key="s.title" class="home-section">
    <header class="home-section-head"><h2>{{s.title}}</h2><span>{{s.total}} {{s.total === 1 ? 'article' : 'articles'}}</span></header>
    <ul class="home-list">
     <li v-for="g in s.guides" :key="g.id">
      <NuxtLink :to="'/guides/'+g.slug" class="home-row">
       <strong>{{g.content.title}}</strong>
       <span class="home-row-summary">{{g.content.summary}}</span>
       <span class="home-row-meta">
        <span v-if="filtered && !category">{{g.content.category}}</span>
        <span>{{g.content.steps.length}} steps</span>
        <span v-if="g.verified" class="home-verified"><UIcon name="i-lucide-check" aria-hidden="true"/>Verified</span>
        <span v-else-if="g.confirmations">{{g.confirmations}} {{g.confirmations === 1 ? 'confirmation' : 'confirmations'}}</span>
        <span v-if="g.content.location && g.content.location !== 'Nigeria'">{{g.content.location}}</span>
       </span>
      </NuxtLink>
     </li>
    </ul>
    <NuxtLink v-if="s.total > s.guides.length" class="home-more" :to="`/how-to/${categorySlug(s.category)}`">See all {{s.total}} in {{s.title}}<UIcon name="i-lucide-arrow-right" class="button-icon" aria-hidden="true"/></NuxtLink>
   </section>
  </div>
  <div v-else-if="status!=='pending' && !error" class="empty"><h2>{{q||category||community||location?'No articles match these filters.':'The collection starts with what you know.'}}</h2><p>Document a practical skill, a local method, or a process you understand.</p><NuxtLink class="button secondary" to="/write">Know how? Document it.<UIcon name="i-lucide-arrow-right" class="button-icon"/></NuxtLink></div>

  <section class="contribute-strip"><div><h2>Someone can learn from what you know.</h2><p>A family recipe. A craft. A way of doing things in your community.</p></div><NuxtLink class="button secondary" to="/write">Document knowledge<UIcon name="i-lucide-arrow-right" class="button-icon"/></NuxtLink></section>
 </div>
</template>
