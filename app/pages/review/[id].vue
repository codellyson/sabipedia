<script setup lang="ts">
import type { GuideContent } from '~~/shared/guide'
import type { AiReview } from '~~/server/utils/ai-review'
import { findQuote } from '~~/shared/find-quote'
import { aiName } from '~~/shared/ai-name'

type Annotation={id:string;quote:string;note:string;start_offset:number;end_offset:number;reviewer:string;created_at:string}
type Submission={id:string;state:'awaiting_review'|'published'|'rejected';content:GuideContent;created_at:string;author:string;author_email:string;guide_id:string|null;base_version_id:string|null;ai_review:AiReview|null;annotations:Annotation[]}
const route=useRoute()
const {data:submission,error,refresh}=await useFetch<Submission>('/api/review/submissions/'+encodeURIComponent(String(route.params.id)))
if(error.value)throw createError({statusCode:error.value.statusCode||404,statusMessage:error.value.statusMessage||'Submission not found'})
useSeoMeta({title:()=>submission.value?`Review ${submission.value.content.title} — Sabipedia`:'Review guide — Sabipedia'})
const decision=ref<'publish'|'reject'|''>(''),note=ref(''),busy=ref(false),message=ref('')
const checkedSources=ref<number[]>([])
const checking=ref(false)
const verdictLabels={looks_ready:'Looks ready',needs_changes:'Needs changes',reject:'Likely reject'}
const verdictClass={looks_ready:'is-published',needs_changes:'is-warning',reject:'is-rejected'}
const checkLabels={copied:'Copied from a source',internal_note:'Internal note left in',vague:'Vague or incomplete',sources:'Sources',junk:'Junk or off-topic'}
async function runAiCheck(){
 if(!submission.value)return
 checking.value=true
 try{await $fetch(`/api/review/submissions/${submission.value.id}/ai-check`,{method:'POST'});await refresh();await nextTick();renderHighlights()}
 finally{checking.value=false}
}
const documentRoot=ref<HTMLElement>(),selectionDraft=ref<{quote:string;startOffset:number;endOffset:number}|null>(null),annotationNote=ref('')
const allSourcesChecked=computed(()=>!submission.value?.content.sources.length||checkedSources.value.length===submission.value.content.sources.length)
const submitted=computed(()=>{
 const value=submission.value?.created_at||'';const date=new Date(value.includes('T')?value:value.replace(' ','T')+'Z')
 return Number.isNaN(date.valueOf())?value:new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'long',year:'numeric'}).format(date)
})
function toggleSource(index:number){checkedSources.value=checkedSources.value.includes(index)?checkedSources.value.filter(i=>i!==index):[...checkedSources.value,index]}
function offsetToPoint(root:HTMLElement,offset:number){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let traversed=0,node:Node|null
 while((node=walker.nextNode())){const length=node.textContent?.length||0;if(traversed+length>=offset)return {node,offset:Math.max(0,offset-traversed)};traversed+=length}
 return {node:root,offset:root.childNodes.length}
}
function rangeFor(start:number,end:number){
 const root=documentRoot.value;if(!root)return null
 const a=offsetToPoint(root,start),b=offsetToPoint(root,end),range=document.createRange()
 try{range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset);return range}catch{return null}
}
const aiFlags=computed(()=>submission.value?.ai_review?.status==='done'?submission.value.ai_review.flags:[])
type FlagSpan={start:number;end:number;exact:boolean;anchor:string}
const flagSpans=ref<(FlagSpan|null)[]>([])
const activeFlag=ref<number|null>(null)
// Where a flag's note attaches when its quote is not found word for word: the field it names, else the title.
function fieldAnchor(field:string,content:GuideContent):[string,string]{
 const first=(items:string[],label:string):[string,string]=>items[0]?[items[0],label]:[content.title,'the title']
 if(field==='summary')return [content.summary,'the summary']
 if(field==='requirements')return ['What you need','What you need']
 if(field==='steps')return ['How to do it','How to do it']
 if(field==='sources'&&content.sources.length)return ['Sources & references','Sources']
 if(field==='tips')return first(content.tips,'the tips')
 if(field==='warnings')return first(content.warnings,'the warnings')
 if(field==='variations')return first(content.variations,'the variations')
 return [content.title,'the title']
}
function locateFlags(){
 const text=documentRoot.value?.textContent||'',content=submission.value?.content
 flagSpans.value=aiFlags.value.map(flag=>{
  if(!content||!text)return null
  const [target,anchor]=fieldAnchor(flag.field??'general',content),field=findQuote(text,target)
  const exact=flag.quote.trim()?findQuote(text,flag.quote,field?.start)||findQuote(text,flag.quote):null
  if(exact)return {...exact,exact:true,anchor:''}
  const span=field||findQuote(text,content.title)
  return span?{...span,exact:false,anchor}:null
 })
}
const adoptedFlags=computed(()=>flagSpans.value.map((span,i)=>!!span&&!!submission.value?.annotations.some(a=>a.start_offset===span.start&&a.end_offset===span.end&&a.note===aiFlags.value[i]?.detail)))
const openFlags=computed(()=>aiFlags.value.filter((_,i)=>!adoptedFlags.value[i]).length)
function renderHighlights(){
 locateFlags()
 const highlights=(CSS as any).highlights,HighlightCtor=(window as any).Highlight
 if(!highlights||!HighlightCtor)return
 highlights.delete('review-annotations');highlights.delete('ai-flags')
 const ranges=(submission.value?.annotations||[]).map(item=>rangeFor(item.start_offset,item.end_offset)).filter(Boolean)
 if(ranges.length)highlights.set('review-annotations',new HighlightCtor(...ranges))
 const flagRanges=flagSpans.value.map((span,i)=>span?.exact&&!adoptedFlags.value[i]?rangeFor(span.start,span.end):null).filter(Boolean)
 if(flagRanges.length)highlights.set('ai-flags',new HighlightCtor(...flagRanges))
}
function showFlag(index:number){activeFlag.value=activeFlag.value===index?null:index;const span=flagSpans.value[index];if(span&&activeFlag.value===index)showRange(span.start,span.end)}
async function adoptFlag(index:number){
 const span=flagSpans.value[index],flag=aiFlags.value[index]
 if(!submission.value||!span||!flag)return
 busy.value=true;message.value=''
 try{await $fetch(`/api/review/submissions/${submission.value.id}/annotations`,{method:'POST',body:{quote:(documentRoot.value?.textContent||'').slice(span.start,span.end).slice(0,1000),note:flag.detail,startOffset:span.start,endOffset:span.end}});await refresh();await nextTick();renderHighlights()}
 catch(e:any){message.value=e.data?.statusMessage||'Could not save review note'}finally{busy.value=false}
}
function captureSelection(){
 const root=documentRoot.value,selection=window.getSelection();if(!root||!selection||selection.isCollapsed||!selection.rangeCount)return
 const range=selection.getRangeAt(0),container=range.commonAncestorContainer.nodeType===Node.TEXT_NODE?range.commonAncestorContainer.parentElement:range.commonAncestorContainer as HTMLElement
 if(!container||!root.contains(container))return
 const before=document.createRange();before.selectNodeContents(root);before.setEnd(range.startContainer,range.startOffset)
 const raw=selection.toString(),quote=raw.trim();if(!quote)return
 const leading=raw.length-raw.trimStart().length,startOffset=before.toString().length+leading
 selectionDraft.value={quote:quote.slice(0,1000),startOffset,endOffset:startOffset+quote.length};annotationNote.value=''
}
async function addAnnotation(){
 if(!submission.value||!selectionDraft.value||annotationNote.value.trim().length<2)return
 busy.value=true;message.value=''
 try{await $fetch(`/api/review/submissions/${submission.value.id}/annotations`,{method:'POST',body:{quote:selectionDraft.value.quote,note:annotationNote.value,startOffset:selectionDraft.value.startOffset,endOffset:selectionDraft.value.endOffset}});selectionDraft.value=null;annotationNote.value='';window.getSelection()?.removeAllRanges();await refresh();await nextTick();renderHighlights()}
 catch(e:any){message.value=e.data?.statusMessage||'Could not save review note'}finally{busy.value=false}
}
async function removeAnnotation(id:string){
 if(!submission.value)return
 busy.value=true
 try{await $fetch(`/api/review/submissions/${submission.value.id}/annotations/${id}`,{method:'DELETE'});await refresh();await nextTick();renderHighlights()}
 catch(e:any){message.value=e.data?.statusMessage||'Could not remove review note'}finally{busy.value=false}
}
function showAnnotation(item:Annotation){showRange(item.start_offset,item.end_offset)}
function showRange(start:number,end:number){const range=rangeFor(start,end);if(!range)return;const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);range.getBoundingClientRect().top&&window.scrollTo({top:window.scrollY+range.getBoundingClientRect().top-160,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
onMounted(async()=>{document.addEventListener('selectionchange',captureSelection);await nextTick();renderHighlights()})
onBeforeUnmount(()=>{document.removeEventListener('selectionchange',captureSelection);(CSS as any).highlights?.delete('review-annotations');(CSS as any).highlights?.delete('ai-flags')})
async function review(){
 if(!submission.value||!decision.value)return
 busy.value=true;message.value=''
 try{await $fetch('/api/review/'+submission.value.id,{method:'POST',body:{action:decision.value,note:note.value}});await navigateTo('/review')}
 catch(e:any){message.value=e.data?.statusMessage||'Could not save review'}finally{busy.value=false}
}
</script>

<template>
 <section v-if="submission" class="review-workspace">
  <header class="review-workspace-header"><NuxtLink to="/review" class="writer-return"><UIcon name="i-lucide-arrow-left" class="button-icon"/>Back to review queue</NuxtLink><div><p class="eyebrow">Guide review</p><h1>{{submission.content.title}}</h1><p>Submitted by {{submission.author}} on {{submitted}}</p></div><span class="decision-status" :class="submission.state==='published'?'is-published':submission.state==='rejected'?'is-rejected':''">{{submission.state==='awaiting_review'?'Waiting for review':submission.state==='published'?'Published':'Changes requested'}}</span></header>
  <div class="review-workspace-layout">
   <main class="review-document-column">
    <div class="review-reader-label"><span>Reader preview</span><small>Select any words to leave a review note.</small></div>
    <div ref="documentRoot" class="review-selectable" @mouseup="captureSelection"><GuidePreview :content="submission.content" /></div>
   </main>
   <aside class="review-editorial-panel">
    <section class="review-ai">
     <div class="review-panel-heading"><p class="review-panel-step"><UIcon name="i-lucide-sparkles" class="button-icon" aria-hidden="true"/>{{aiName}}</p><span>Second opinion · you decide</span></div>
     <p v-if="!submission.ai_review" class="review-selection-help">{{aiName}} is still reading this guide. Reload in a moment.</p>
     <p v-else-if="submission.ai_review.status==='failed'" class="review-source-warning">{{submission.ai_review.error}}.</p>
     <template v-else>
      <div class="review-ai-head"><span class="decision-status" :class="verdictClass[submission.ai_review.verdict]">{{verdictLabels[submission.ai_review.verdict]}}</span><small v-if="aiFlags.length">{{aiFlags.length}} {{aiFlags.length===1?'issue':'issues'}} · {{aiFlags.length-openFlags}} added as notes</small></div>
      <p class="review-ai-summary">{{submission.ai_review.summary}}</p>
      <ol v-if="aiFlags.length" class="review-ai-flags">
       <li v-for="(flag,index) in aiFlags" :key="index" :class="{'is-adopted':adoptedFlags[index],'is-open':activeFlag===index}">
        <button type="button" class="review-ai-flag" :aria-expanded="activeFlag===index" @click="showFlag(index)"><strong>{{checkLabels[flag.check]}}<UIcon v-if="adoptedFlags[index]" name="i-lucide-check" class="button-icon" aria-label="Added as note"/></strong><span>{{flag.detail}}</span></button>
        <template v-if="activeFlag===index">
         <q v-if="flag.quote&&flagSpans[index]?.exact">{{flag.quote}}</q>
         <small v-else-if="flagSpans[index]" class="review-ai-anchor">Note will attach to {{flagSpans[index]!.anchor}}</small>
         <span v-if="adoptedFlags[index]" class="review-ai-adopted"><UIcon name="i-lucide-check" class="button-icon" aria-hidden="true"/>Added as note</span>
         <UButton v-else-if="flagSpans[index]&&submission.state==='awaiting_review'" type="button" color="neutral" variant="outline" size="xs" :disabled="busy" @click="adoptFlag(index)">Add as review note</UButton>
        </template>
       </li>
      </ol>
      <p v-else class="review-selection-help">No problems flagged.</p>
     </template>
     <UButton type="button" color="neutral" variant="ghost" size="xs" class="review-ai-rerun" :disabled="checking" @click="runAiCheck"><UIcon name="i-lucide-refresh-cw" class="button-icon" aria-hidden="true"/>{{checking?`${aiName} is reading…`:submission.ai_review?`Ask ${aiName} again`:`Ask ${aiName}`}}</UButton>
    </section>
    <section><p class="review-panel-step">1 · Understand the submission</p><dl class="review-facts"><div><dt>Contributor</dt><dd>{{submission.author}}</dd></div><div><dt>Topic</dt><dd>{{submission.content.category}}</dd></div><div><dt>Place</dt><dd>{{submission.content.location||'Not specified'}}</dd></div><div><dt>Community</dt><dd>{{submission.content.community||'Not specified'}}</dd></div></dl><div v-if="submission.content.changeNote" class="review-change-note"><strong>Contributor’s note</strong><p>{{submission.content.changeNote}}</p></div></section>
    <section><div class="review-panel-heading"><p class="review-panel-step">2 · Review the writing</p><span>{{submission.annotations.length}} notes</span></div><p v-if="!selectionDraft&&!submission.annotations.length" class="review-selection-help">Highlight words in the reader preview to comment on them.</p><form v-if="selectionDraft" class="review-annotation-composer" @submit.prevent="addAnnotation"><blockquote>“{{selectionDraft.quote}}”</blockquote><label>Review note<textarea v-model="annotationNote" autofocus placeholder="Explain what should change or what you verified." maxlength="2000" /></label><div class="actions"><UButton type="submit" :disabled="busy||annotationNote.trim().length<2">Add note</UButton><UButton type="button" color="neutral" variant="outline" @click="selectionDraft=null">Cancel</UButton></div></form><ol v-if="submission.annotations.length" class="review-annotations"><li v-for="item in submission.annotations" :key="item.id"><button class="review-annotation-link" @click="showAnnotation(item)"><span>“{{item.quote}}”</span><small>{{item.note}}</small></button><UButton type="button" color="neutral" variant="ghost" size="xs" aria-label="Remove review note" :disabled="busy" @click="removeAnnotation(item.id)">Remove</UButton></li></ol></section>
    <section><p class="review-panel-step">3 · Check the sources</p><p v-if="!submission.content.sources.length" class="review-source-warning">No source was supplied. Decide whether lived experience is enough for this guide.</p><div v-else class="review-source-checks"><label v-for="(source,index) in submission.content.sources" :key="source"><input type="checkbox" :checked="checkedSources.includes(index)" @change="toggleSource(index)"><span><SourceList :sources="[source]" /><small>{{checkedSources.includes(index)?'Checked':'Open and check this source'}}</small></span></label></div><p v-if="submission.content.sources.length" class="review-check-progress">{{checkedSources.length}} of {{submission.content.sources.length}} sources checked</p></section>
    <section v-if="submission.state==='awaiting_review'"><p class="review-panel-step">4 · Make a decision</p><fieldset class="review-decision"><legend>What should happen next?</legend><label><input v-model="decision" type="radio" value="publish"><span><strong>Publish this guide</strong><small>Make it available to readers.</small></span></label><label><input v-model="decision" type="radio" value="reject"><span><strong>Return it to the contributor</strong><small>Explain exactly what needs to change.</small></span></label></fieldset><label class="review-note-field">{{decision==='reject'?'What should the contributor change?':'Editorial note (optional)'}}<textarea v-model="note" :placeholder="decision==='reject'?'Summarise the inline notes and the correction needed.':'Record why the guide is ready.'" /></label><p v-if="decision==='publish'&&submission.annotations.length" class="review-source-warning">This guide still has {{submission.annotations.length}} inline review {{submission.annotations.length===1?'note':'notes'}}.</p><p v-if="decision==='publish'&&openFlags" class="review-source-warning">{{aiName}} raised {{openFlags}} {{openFlags===1?'issue':'issues'}} you have not turned into review notes.</p><p v-if="decision==='publish'&&!allSourcesChecked" class="review-source-warning">Some supplied sources have not been marked as checked.</p><p v-if="message" class="notice" role="alert">{{message}}</p><UButton class="review-final-action" :disabled="busy||!decision||(decision==='reject'&&!note.trim())" @click="review">{{busy?'Saving…':decision==='publish'?'Publish guide':decision==='reject'?'Return with feedback':'Choose a decision'}}</UButton></section>
    <section v-else><p class="review-panel-step">Decision recorded</p><p>This submission has already left the active review queue.</p><NuxtLink class="button secondary" to="/review">Return to review queue</NuxtLink></section>
   </aside>
  </div>
 </section>
</template>
