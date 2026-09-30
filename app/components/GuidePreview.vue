<script setup lang="ts">
import type { GuideContent } from '~~/shared/guide'
defineProps<{content:GuideContent}>()
const sections = [{key:'tips',label:'Helpful tips'},{key:'warnings',label:'Things to watch out for'},{key:'variations',label:'Local variations'}] as const
const readableDate = (value?:string) => value ? new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00')) : ''
</script>
<template>
 <article class="guide-preview">
  <p class="eyebrow">{{content.category}}</p><h2>{{content.title}}</h2><p class="lead">{{content.summary}}</p>
  <p class="muted">{{[content.community,content.location,readableDate(content.experiencedAt)].filter(Boolean).join(' · ')||'No specific community, location or date'}}</p>
  <section v-if="content.requirements.length"><h3>What you need</h3><ul><li v-for="(item,i) in content.requirements" :key="i">{{item}}</li></ul></section>
  <section><h3>How to do it</h3><ol class="steps"><li v-for="(step,i) in content.steps" :key="i"><RichText :document="content.stepDocuments?.[i]" :text="step" /><div v-if="content.stepMediaIds?.[i]?.length" class="step-image-strip"><img v-for="id in content.stepMediaIds[i]" :key="id" :src="`/api/media/${id}`" :alt="`Image showing step ${i+1}`" loading="lazy"></div></li></ol></section>
  <section v-for="section in sections" :key="section.key"><template v-if="content[section.key].length"><h3>{{section.label}}</h3><ul><li v-for="(item,i) in content[section.key]" :key="i">{{item}}</li></ul></template></section>
  <section v-if="content.sources.length"><h3>Sources & references</h3><SourceList :sources="content.sources" /></section>
 </article>
</template>
