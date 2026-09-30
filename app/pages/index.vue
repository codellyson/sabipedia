<script setup lang="ts">
import { categories } from '~~/shared/guide'
const {data:options,status:optionsStatus,error:optionsError}=await useGuideOptions()
const route=useRoute()
const queryValue=(key:string)=>typeof route.query[key]==='string'?String(route.query[key]):''
const q=ref(queryValue('q')),category=ref(queryValue('category')),community=ref(queryValue('community')),location=ref(queryValue('location'))
watch(() => route.query.q, value => { q.value=typeof value==='string'?value:'' })
const searchQuery=ref(q.value), searchCommunity=ref(''), searchLocation=ref('')
let searchTimer:ReturnType<typeof setTimeout>|undefined
watch([q,community,location],()=>{
 clearTimeout(searchTimer)
 searchTimer=setTimeout(()=>{searchQuery.value=q.value;searchCommunity.value=community.value;searchLocation.value=location.value},200)
})
onBeforeUnmount(()=>clearTimeout(searchTimer))
const {data:guides,status,error}=await useFetch('/api/guides',{query:{q:searchQuery,category,community:searchCommunity,location:searchLocation}})
function clearCardWidth(element:Element) { (element as HTMLElement).style.width='' }
function freezeCardWidth(element:Element) { (element as HTMLElement).style.width=element.getBoundingClientRect().width+'px' }
useSeoMeta({title:'Explore — wikihownaija',description:'Practical Nigerian knowledge, documented as procedures with sources, local variations and community confirmations.'})
</script>
<template>
 <div class="explore-page">
  <section class="discovery-hero" aria-labelledby="discovery-title">
    <h1 id="discovery-title">What would you like to learn?</h1>
    <p class="hero-description">Everyday skills and local know-how, shared by people across Nigeria.</p>
    <form class="hero-search" role="search" @submit.prevent="navigateTo({path: '/', query: q.trim() ? {q:q.trim()} : {}})">
      <UInput v-model="q" class="hero-search-input" type="search" aria-label="Search practical knowledge" placeholder="How do I…" :ui="{base: 'hero-search-control'}" />
      <UButton type="submit" class="search-submit" aria-label="Search guides">→</UButton>
    </form>
    <div class="category-pills" role="group" aria-label="Filter by category">
      <UButton class="category-pill" :aria-pressed="category === ''" @click="category = ''">All guides</UButton>
      <UButton v-for="c in categories" :key="c" class="category-pill" :aria-pressed="category === c" @click="category = c">{{c}}</UButton>
    </div>
    <UCollapsible class="local-filters" :ui="{content:'animated-disclosure'}">
      <template #default="{open}"><UButton class="disclosure-trigger"><span class="disclosure-chevron" :class="{'is-open':open}" aria-hidden="true">›</span>Find knowledge from your community <span v-if="community || location" class="filter-active">Filters active</span></UButton></template>
      <template #content><div class="pair">
        <UFormField label="Community" class="writer-form-field"><ChoiceInput v-model="community" :items="options.communities" :loading="optionsStatus==='pending'" placeholder="Any community" /></UFormField>
        <UFormField label="Location" class="writer-form-field"><ChoiceInput v-model="location" :items="options.locations" :loading="optionsStatus==='pending'" placeholder="Any location" /></UFormField>
      </div><p v-if="optionsError" class="field-hint" role="status">Community and location choices could not be loaded. Reload to try again.</p></template>
    </UCollapsible>
  </section>
  <section class="collection" aria-labelledby="collection-title">
    <div class="section-title"><h2 id="collection-title">{{ category || 'Explore the collection' }}</h2><span>{{guides?.length||0}} {{guides?.length === 1 ? 'guide' : 'guides'}}</span></div>
    <p v-if="error" role="alert" class="notice">We couldn’t load the collection. Please try again.</p>
    <div class="collection-feedback" role="status"><span v-if="status==='pending'">Updating guides…</span></div>
    <MotionHeight><TransitionGroup v-if="guides?.length" tag="div" name="collection" @before-leave="freezeCardWidth" @before-enter="clearCardWidth" @leave-cancelled="clearCardWidth" class="grid" :aria-busy="status==='pending'">
      <NuxtLink v-for="g in guides" :key="g.id" :to="'/guides/'+g.slug" class="card">
        <p class="eyebrow">{{g.content.category}}</p><h2>{{g.content.title}}</h2><p>{{g.content.summary}}</p>
        <div class="card-footer"><p class="muted">{{[g.content.community,g.content.location].filter(Boolean).join(' · ')||'Across Nigeria'}}</p><span class="badge" :class="{verified:g.verified}">{{g.verified?'Community verified':`${g.confirmations} ${g.confirmations === 1 ? 'confirmation' : 'confirmations'}`}}</span></div>
      </NuxtLink>
    </TransitionGroup>
    <div v-else-if="status!=='pending' && !error" class="empty"><h2>{{q||category||community||location?'No guides match these filters.':'The collection starts with what you know.'}}</h2><p>Document a practical skill, a local method, or a process you understand.</p><NuxtLink class="button secondary" to="/write">Know how? Document it. →</NuxtLink></div></MotionHeight>
  </section>
  <section class="contribute-strip"><div><h2>Someone can learn from what you know.</h2><p>A family recipe. A craft. A way of doing things in your community.</p></div><NuxtLink class="button secondary" to="/write">Document knowledge →</NuxtLink></section>
 </div>
</template>
