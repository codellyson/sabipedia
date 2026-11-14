<script setup lang="ts">
import { languages } from '~~/shared/learn'
const {data:stats}=await useFetch('/api/learn')
const {data:me}=await useFetch('/api/learn/me')
const count=(slug:string)=>stats.value?.find(s=>s.language===slug)
const title='Learn a Nigerian language — Sabipedia',description='Everyday Yoruba, Hausa, Igbo and Pidgin phrases, spoken by native speakers.'
useSeoMeta({title,description,ogTitle:title,ogDescription:description})
</script>
<template>
 <div class="home learn">
  <section class="home-top">
   <h1>Learn a Nigerian language</h1>
   <p class="home-lede">Everyday phrases, spoken by native speakers.</p>
  </section>
  <ul class="hub-topics learn-langs">
   <li v-for="l in languages" :key="l.slug"><NuxtLink :to="`/learn/${l.slug}`"><strong>{{l.native}}</strong><em v-if="l.native!==l.name">{{l.name}}</em><span>{{count(l.slug)?`${count(l.slug)!.pages} ${count(l.slug)!.pages===1?'page':'pages'} · ${count(l.slug)!.phrases} ${count(l.slug)!.phrases===1?'phrase':'phrases'}`:'Coming soon'}}</span></NuxtLink></li>
  </ul>
  <p class="learn-actions"><UButton class="button secondary" to="/learn/write">Speak one of these? Add a phrase page</UButton><UButton v-if="me?.reviews?.length" class="button secondary" to="/learn/review">Review queue</UButton></p>
 </div>
</template>
