<script setup lang="ts">
defineProps<{sources:string[]}>()
function parts(source:string) {
 const match = /^(.*?)(https?:\/\/[^\s)]+)(.*)$/.exec(source)
 return match ? {before:match[1],url:match[2],after:match[3]} : {before:source,url:'',after:''}
}
</script>
<template>
 <ul class="source-list">
  <li v-for="source in sources" :key="source">
   <template v-if="parts(source).url">{{parts(source).before}}<a :href="parts(source).url" target="_blank" rel="noopener noreferrer">{{parts(source).url}}</a>{{parts(source).after}}</template>
   <template v-else>{{source}}</template>
  </li>
 </ul>
</template>
