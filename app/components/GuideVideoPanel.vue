<script setup lang="ts">
import type { GuideDetail } from '~~/shared/types'

const props=defineProps<{guide:GuideDetail;canReview:boolean}>()
const emit=defineEmits<{published:[]}>()
type EditorState={draft:{id:string;version_id:string;status:string;created_at:string}|null;stale:boolean}
const editorState=ref<EditorState|null>(null)
const busy=ref(false),progress=ref(0),message=ref(''),reviewed=ref(false)
const videoUrl=(id:string)=>`/api/guide-videos/${encodeURIComponent(id)}`

async function loadEditorState() {
 if(!props.canReview)return
 try{editorState.value=await $fetch<EditorState>(`/api/guide-video-editor/${encodeURIComponent(props.guide.slug)}`)}
 catch{message.value='Could not load video review status.'}
}
watch(()=>props.canReview,canReview=>{if(import.meta.client&&canReview)void loadEditorState()},{immediate:true})
watch(()=>props.guide.version_id,()=>{editorState.value=null;reviewed.value=false;if(import.meta.client&&props.canReview)void loadEditorState()})

async function generate() {
 busy.value=true;message.value='';progress.value=0;reviewed.value=false
 try {
  const {generateGuideVideo}=await import('~/utils/guide-video.client')
  const file=await generateGuideVideo(props.guide,value=>progress.value=value)
  const form=new FormData();form.set('file',file);form.set('versionId',props.guide.version_id)
  await $fetch(`/api/guide-video-drafts/${encodeURIComponent(props.guide.slug)}`,{method:'POST',body:form})
  await loadEditorState()
  message.value='Draft ready. Watch it and approve it to show readers.'
 } catch(error:any) {message.value=error?.data?.statusMessage||error?.message||'Could not generate the video.'}
 finally{busy.value=false}
}

async function review(action:'publish'|'reject') {
 const id=editorState.value?.draft?.id
 if(!id)return
 busy.value=true;message.value=''
 try {
  await $fetch(`/api/guide-video-reviews/${encodeURIComponent(props.guide.slug)}`,{method:'POST',body:{id,action}})
  await loadEditorState()
  reviewed.value=false
  if(action==='publish'){emit('published');message.value='The video is now visible beside this guide.'}
  else message.value='Draft rejected. You can generate a new one.'
 } catch(error:any) {message.value=error?.data?.statusMessage||error?.message||'Could not save the review decision.'}
 finally{busy.value=false}
}
</script>

<template>
 <section v-if="guide.video||canReview" class="guide-video-panel" aria-labelledby="guide-video-title">
  <div class="guide-video-heading"><div><p class="eyebrow">WATCH THE HIGHLIGHTS</p><h2 id="guide-video-title">Video guide</h2><p>A short visual summary. Read the steps below for full instructions and sources.</p></div><span v-if="guide.video" class="guide-video-label">Captioned · no audio</span></div>
  <video v-if="guide.video" class="guide-video-player" :src="videoUrl(guide.video.id)" controls preload="metadata" playsinline aria-label="Captioned visual summary of this guide" />
  <div v-if="canReview" class="guide-video-editor">
   <p v-if="editorState?.stale" class="reader-warning">The guide changed after its last video was published. Generate and review a new video for this revision.</p>
   <template v-if="editorState?.draft">
    <p><strong>Draft awaiting review.</strong> This video is visible only to editors until approved.</p>
    <video class="guide-video-player" :src="videoUrl(editorState.draft.id)" controls preload="metadata" playsinline aria-label="Draft visual summary for editor review" />
    <label class="guide-video-confirm"><input v-model="reviewed" type="checkbox"> I watched the draft and checked it against this guide.</label>
    <div class="guide-video-actions"><button class="primary" :disabled="busy||!reviewed" @click="review('publish')">Approve video</button><button class="secondary" :disabled="busy" @click="review('reject')">Reject draft</button></div>
   </template>
   <template v-else-if="!guide.video">
    <p>The editor’s browser makes a captioned video from approved guide highlights and photos. Keep this tab open while it records.</p>
    <button class="primary" :disabled="busy||!editorState" @click="generate">{{busy?`Generating video… ${progress}%`:'Generate video draft'}}</button>
   </template>
   <p v-if="message" class="notice" role="status">{{message}}</p>
  </div>
 </section>
</template>
