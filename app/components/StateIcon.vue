<script setup lang="ts">
defineProps<{icon:string;activeIcon:string;active:boolean}>()
</script>
<template>
 <span class="state-icon button-icon" aria-hidden="true">
  <UIcon :name="activeIcon" class="state-icon-layer state-icon-active" :class="{'is-on':active}"/>
  <UIcon :name="icon" class="state-icon-layer" :class="[{'is-on':!active},{'icon-play-nudge':icon==='i-lucide-play'}]"/>
 </span>
</template>
