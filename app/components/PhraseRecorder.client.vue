<script setup lang="ts">
const model=defineModel<string|undefined>()
const props=defineProps<{label:string}>()
const state=ref<'idle'|'recording'|'saving'>('idle'),seconds=ref(0),message=ref('')
let recorder:MediaRecorder|undefined,timer:ReturnType<typeof setInterval>|undefined,player:HTMLAudioElement|undefined
async function upload(blob:Blob,name:string){
 state.value='saving';message.value=''
 try{
  // Browsers add codec details (audio/webm;codecs=opus); the server accepts the bare type.
  const form=new FormData();form.append('file',new File([blob],name,{type:blob.type.replace(/;.*$/,'').replace('audio/x-m4a','audio/mp4')}))
  model.value=(await $fetch<{id:string}>('/api/media',{method:'POST',body:form})).id
 }catch(e:any){message.value=e?.data?.statusMessage||'Could not save the recording. Try again.'}
 finally{state.value='idle'}
}
async function start(){
 message.value=''
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true})
  const chunks:Blob[]=[]
  recorder=new MediaRecorder(stream)
  recorder.ondataavailable=e=>chunks.push(e.data)
  recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());clearInterval(timer);const type=recorder!.mimeType||'audio/webm';upload(new Blob(chunks,{type}),type.includes('mp4')?'phrase.m4a':'phrase.webm')}
  recorder.start();seconds.value=0;state.value='recording'
  timer=setInterval(()=>{if(++seconds.value>=30)stop()},1000)
 }catch{message.value='Allow microphone access in your browser to record.'}
}
function stop(){if(recorder?.state==='recording')recorder.stop()}
function play(){player?.pause();player=new Audio(`/api/media/${model.value}`);player.play().catch(()=>{message.value='Could not play the recording.'})}
function pick(e:Event){const file=(e.target as HTMLInputElement).files?.[0];if(file)upload(file,file.name);(e.target as HTMLInputElement).value=''}
onBeforeUnmount(()=>{stop();player?.pause()})
</script>
<template>
 <div class="recorder" role="group" :aria-label="`Recording for ${props.label}`">
  <template v-if="state==='recording'"><button type="button" class="recorder-stop" @click="stop"><span class="recorder-dot" aria-hidden="true"/>Stop · 0:{{String(seconds).padStart(2,'0')}}</button></template>
  <template v-else>
   <button v-if="model" type="button" class="secondary" @click="play"><UIcon name="i-lucide-play" class="button-icon" aria-hidden="true"/>Play</button>
   <button type="button" class="secondary" :disabled="state==='saving'" @click="start"><UIcon name="i-lucide-mic" class="button-icon" aria-hidden="true"/>{{model?'Re-record':'Record'}}</button>
   <label class="button secondary recorder-upload">Upload<input type="file" accept="audio/mpeg,audio/mp4,audio/webm,.m4a,.mp3" :disabled="state==='saving'" @change="pick"></label>
   <span v-if="state==='saving'" class="field-hint" role="status">Saving…</span>
   <span v-else-if="!model" class="field-hint">Needs a recording</span>
  </template>
  <span v-if="message" class="field-hint recorder-error" role="alert">{{message}}</span>
 </div>
</template>
