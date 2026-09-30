<script setup lang="ts">
const content = ref<HTMLElement>()
const height = ref<number>()
const disclosures = ref(0)
function disclosureStart(event:AnimationEvent) {
 if (event.animationName.startsWith('disclosure-')) disclosures.value++
}
function disclosureEnd(event:AnimationEvent) {
 if (event.animationName.startsWith('disclosure-')) disclosures.value=Math.max(0,disclosures.value-1)
}
let observer:ResizeObserver|undefined
onMounted(() => {
 const measure = () => {
  if (!content.value) return
  const next = Math.ceil(content.value.getBoundingClientRect().height)
  // Keep the outgoing height during an out-in transition's empty frame.
  if (next > 0) height.value = next
 }
 measure()
 observer = new ResizeObserver(measure)
 if (content.value) observer.observe(content.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>
<template><div class="motion-height" :style="{height:height === undefined ? undefined : height+'px',transition:disclosures ? 'none' : undefined}" @animationstart="disclosureStart" @animationend="disclosureEnd" @animationcancel="disclosureEnd"><div ref="content" class="motion-height-content"><slot /></div></div></template>
