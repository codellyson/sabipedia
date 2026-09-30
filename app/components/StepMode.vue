<script setup lang="ts">
import type { RichDocument } from '~~/shared/rich-text'

const props = defineProps<{guideId:string;title:string;steps:string[];stepDocuments?:RichDocument[];requirements:string[]}>()
const emit = defineEmits<{close:[]}>()
const current = ref(0)
const completed = ref<number[]>([])
const storageKey = computed(() => `wikihownaija:progress:${props.guideId}`)

onMounted(() => {
  try { completed.value = JSON.parse(localStorage.getItem(storageKey.value) || '[]') } catch {}
})
watch(completed, value => { try { localStorage.setItem(storageKey.value, JSON.stringify(value)) } catch {} }, {deep:true})
function next() {
  if (!completed.value.includes(current.value)) completed.value.push(current.value)
  if (current.value < props.steps.length - 1) current.value++
  else emit('close')
}
</script>

<template>
  <Teleport to="body">
    <section class="step-mode" role="dialog" aria-modal="true" :aria-label="`Step-by-step: ${title}`">
      <header class="step-mode-header">
        <button class="step-round" aria-label="Close step-by-step mode" @click="$emit('close')">×</button>
        <div><strong>FOLLOW ALONG</strong><span>Step {{current + 1}} of {{steps.length}}</span></div>
        <span class="step-round step-count" aria-label="Completed steps">{{completed.length}}</span>
      </header>
      <div class="step-mode-progress" aria-hidden="true"><span v-for="(_,i) in steps" :key="i" :class="{done:completed.includes(i),current:i===current}" /></div>
      <main class="step-mode-body">
        <p class="step-mode-number">STEP {{current + 1}}</p>
        <h1>{{steps[current]}}</h1>
        <div v-if="requirements.length" class="step-materials"><strong>For this guide</strong><span v-for="item in requirements.slice(0,4)" :key="item">{{item}}</span></div>
      </main>
      <footer class="step-mode-actions">
        <button class="secondary" :disabled="current===0" @click="current--">Back</button>
        <button class="step-next" @click="next">{{current===steps.length-1?'Finish guide':'Done · next step'}}</button>
      </footer>
    </section>
  </Teleport>
</template>
