<script setup lang="ts">
import { categories, categorySlug } from '~~/shared/guide'
import { languages } from '~~/shared/learn'
const q=ref('')
const {data:guides,error}=await useFetch('/api/guides')
const {data:learn}=await useFetch('/api/learn')
const learnCount=(slug:string)=>learn.value?.find(l=>l.language===slug)
const topics=computed(()=>categories.map(c=>({name:c,slug:categorySlug(c),total:(guides.value||[]).filter(g=>g.content.category===c).length})).filter(t=>t.total))
const latest=computed(()=>(guides.value||[]).slice(0,5))
const pageTitle='Sabipedia — practical knowledge for life in Nigeria'
const pageDescription='Practical knowledge for life in Nigeria, checked by Nigerians.'
useSeoMeta({title:pageTitle,description:pageDescription,ogTitle:pageTitle,ogDescription:pageDescription})
</script>
<template>
 <div class="home">
  <section class="home-top" aria-labelledby="home-title">
   <h1 id="home-title">Practical knowledge for life in Nigeria</h1>
   <p class="home-lede">Checked by Nigerians.</p>
   <form class="home-search" role="search" @submit.prevent="navigateTo({path: '/how-to', query: q.trim() ? {q:q.trim()} : {}})">
    <UIcon name="i-lucide-search" class="home-search-icon" aria-hidden="true"/>
    <input v-model="q" type="search" aria-label="Search Sabipedia" placeholder="Search Sabipedia…" autocomplete="off">
   </form>
  </section>

  <p v-if="error" role="alert" class="notice">We couldn’t load the articles. Please try again.</p>

  <section v-if="guides?.length" class="home-section hub-section" aria-labelledby="hub-howto">
   <header class="home-section-head"><h2 id="hub-howto"><NuxtLink to="/how-to">How To</NuxtLink></h2><NuxtLink to="/how-to">All {{guides.length}} articles</NuxtLink></header>
   <ul class="hub-topics">
    <li v-for="t in topics" :key="t.slug"><NuxtLink :to="`/how-to/${t.slug}`"><strong>{{t.name}}</strong><span>{{t.total}} {{t.total === 1 ? 'article' : 'articles'}}</span></NuxtLink></li>
   </ul>
   <ul class="home-list">
    <li v-for="g in latest" :key="g.id">
     <NuxtLink :to="'/guides/'+g.slug" class="home-row">
      <strong>{{g.content.title}}</strong>
      <span class="home-row-summary">{{g.content.summary}}</span>
      <span class="home-row-meta"><span>{{g.content.category}}</span><span>{{g.content.steps.length}} steps</span></span>
     </NuxtLink>
    </li>
   </ul>
  </section>

  <section class="home-section hub-section" aria-labelledby="hub-learn">
   <header class="home-section-head"><h2 id="hub-learn"><NuxtLink to="/learn">Learn a language</NuxtLink></h2><NuxtLink to="/learn">Everyday phrases with audio</NuxtLink></header>
   <ul class="hub-topics">
    <li v-for="l in languages" :key="l.slug"><NuxtLink :to="`/learn/${l.slug}`"><strong>{{l.native}}</strong><span>{{learnCount(l.slug)?`${learnCount(l.slug)!.phrases} ${learnCount(l.slug)!.phrases===1?'phrase':'phrases'}`:'Coming soon'}}</span></NuxtLink></li>
   </ul>
  </section>

  <section class="contribute-strip"><div><h2>Someone can learn from what you know.</h2><p>A family recipe. A craft. A way of doing things in your community.</p></div><UButton class="button secondary" to="/write" trailing-icon="i-lucide-arrow-right" :ui="{trailingIcon:'button-icon'}">Document knowledge</UButton></section>
 </div>
</template>
