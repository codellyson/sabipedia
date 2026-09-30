<script setup lang="ts">
defineProps<{ label: string; definition: string }>()
</script>

<template>
 <span class="help-label">
  <span>{{ label }}</span>
  <UTooltip
   :text="definition"
   :delay-duration="0"
   :content="{ side: 'top', align: 'center', sideOffset: 8, collisionPadding: 12 }"
   :ui="{ content: 'help-tooltip', text: 'help-tooltip-text' }"
   arrow
  >
   <UButton
    type="button"
    class="help-trigger"
    :aria-label="`What does ${label} mean?`"
   >?</UButton>
  </UTooltip>
 </span>
</template>
