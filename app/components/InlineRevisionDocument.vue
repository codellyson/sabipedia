<script setup lang="ts">
import type { RevisionComparison } from '~~/shared/types'

type DiffLine={kind:'added'|'removed'|'unchanged';value:string}
const props=defineProps<{comparison:RevisionComparison}>()
defineEmits<{close:[]}>()
const sections=[['requirements','What you need'],['steps','How to do it'],['tips','Tips'],['warnings','Warnings'],['variations','Variations'],['sources','Sources']] as const

function diff(before:string[],after:string[]):DiffLine[]{
 const table=Array.from({length:before.length+1},()=>Array<number>(after.length+1).fill(0))
 for(let i=before.length-1;i>=0;i--)for(let j=after.length-1;j>=0;j--)table[i]![j]=before[i]===after[j]?table[i+1]![j+1]!+1:Math.max(table[i+1]![j]!,table[i]![j+1]!)
 const lines:DiffLine[]=[];let i=0,j=0
 while(i<before.length&&j<after.length){if(before[i]===after[j]){lines.push({kind:'unchanged',value:before[i]!});i++;j++}else if(table[i+1]![j]!>=table[i]![j+1]!){lines.push({kind:'removed',value:before[i++]!})}else{lines.push({kind:'added',value:after[j++]!})}}
 while(i<before.length)lines.push({kind:'removed',value:before[i++]!})
 while(j<after.length)lines.push({kind:'added',value:after[j++]!})
 return lines
}
const scalar=(key:'title'|'summary')=>{
 const before=props.comparison.previous?.content[key]||''
 const after=props.comparison.revision.content[key]
 return before===after?[{kind:'unchanged',value:after} as DiffLine]:[{kind:'removed',value:before},{kind:'added',value:after}].filter(line=>line.value) as DiffLine[]
}
const title=computed(()=>scalar('title'))
const summary=computed(()=>scalar('summary'))
const sectionDiffs=computed(()=>sections.map(([key,label])=>({key,label,lines:diff(props.comparison.previous?.content[key]||[],props.comparison.revision.content[key])})).filter(section=>section.lines.length))
const contextChanges=computed(()=>[
 ['Topic',props.comparison.previous?.content.category||'',props.comparison.revision.content.category],
 ['Community',props.comparison.previous?.content.community||'',props.comparison.revision.content.community],
 ['Location',props.comparison.previous?.content.location||'',props.comparison.revision.content.location],
 ['Date experienced',props.comparison.previous?.content.experiencedAt||'',props.comparison.revision.content.experiencedAt]
].filter(([,before,after])=>before!==after))
</script>

<template>
 <div class="inline-revision-document">
  <aside class="inline-revision-banner">
   <div><strong>Viewing edits in revision {{comparison.revision.number}}</strong><span v-if="comparison.previous">Compared with revision {{comparison.previous.number}}</span><span v-else>First published version</span></div>
   <button class="secondary" @click="$emit('close')">Exit revision view</button>
  </aside>
  <div class="inline-title-diff">
   <h1 v-for="(line,index) in title" :key="index" :class="`inline-${line.kind}`"><span v-if="line.kind!=='unchanged'" class="inline-change-mark">{{line.kind==='added'?'+':'−'}}</span>{{line.value}}</h1>
  </div>
  <div class="inline-summary-diff">
   <p v-for="(line,index) in summary" :key="index" class="lead" :class="`inline-${line.kind}`"><span v-if="line.kind!=='unchanged'" class="inline-change-mark">{{line.kind==='added'?'+':'−'}}</span>{{line.value}}</p>
  </div>
  <p class="muted">Revision {{comparison.revision.number}} · Written by {{comparison.revision.author}} · Published by {{comparison.revision.published_by}}</p>
  <div v-if="comparison.revision.content.changeNote" class="revision-note"><strong>Revision note</strong><p>{{comparison.revision.content.changeNote}}</p></div>
  <dl v-if="contextChanges.length" class="inline-context-diff">
   <div v-for="([label,before,after]) in contextChanges" :key="label"><dt>{{label}}</dt><dd v-if="before" class="inline-removed"><span class="inline-change-mark">−</span>{{before}}</dd><dd v-if="after" class="inline-added"><span class="inline-change-mark">+</span>{{after}}</dd></div>
  </dl>
  <section v-for="section in sectionDiffs" :id="section.key==='steps'?'how-to':section.key" :key="section.key" class="inline-diff-section">
   <h2>{{section.label}}</h2>
   <div class="inline-diff-lines">
    <div v-for="(line,index) in section.lines" :key="`${line.kind}-${index}-${line.value}`" class="inline-diff-line" :class="`inline-${line.kind}`"><span class="inline-change-mark" :aria-label="line.kind">{{line.kind==='added'?'+':line.kind==='removed'?'−':' '}}</span><span>{{line.value}}</span></div>
   </div>
  </section>
 </div>
</template>
