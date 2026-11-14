<script setup lang="ts">
import { languageBySlug } from '~~/shared/learn'
const route=useRoute(),language=languageBySlug(String(route.params.language))
if(!language) throw createError({statusCode:404,statusMessage:'Language not found',fatal:true})
const {data:pages,error}=await useFetch(`/api/learn/${language.slug}`)
const title=`Learn ${language.name}: everyday phrases with audio — Sabipedia`,description=`${language.name} phrases for everyday life in Nigeria, recorded by native speakers.`
useSeoMeta({title,description,ogTitle:title,ogDescription:description})
</script>
<template>
 <div class="home learn">
  <nav class="breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/learn">Learn</NuxtLink><span class="breadcrumb-sep" aria-hidden="true">/</span><span>{{language!.name}}</span></nav>
  <section class="home-top"><h1>{{language!.native}}</h1><p class="home-lede">{{language!.blurb}}</p></section>
  <p v-if="error" role="alert" class="notice">We couldn’t load these pages. Please try again.</p>
  <ul v-else-if="pages?.length" class="home-list">
   <li v-for="p in pages" :key="p.slug"><NuxtLink :to="`/learn/${language!.slug}/${p.slug}`" class="home-row"><strong>{{p.title}}</strong><span class="home-row-summary">{{p.summary}}</span><span class="home-row-meta"><span>{{p.phrases}} {{p.phrases===1?'phrase':'phrases'}}</span></span></NuxtLink></li>
  </ul>
  <div v-else class="empty"><h2>No {{language!.name}} pages yet.</h2><p>Native speakers are recording the first ones.</p><UButton class="button secondary" to="/learn/write">Speak {{language!.name}}? Add a page</UButton></div>
 </div>
</template>
