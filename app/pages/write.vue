<script setup lang="ts">
import { categories, guideInput, type GuideContent } from '~~/shared/guide'
import { documentFromText, isRichDocument, richText, type RichDocument } from '~~/shared/rich-text'
import type { GuideDetail } from '~~/shared/types'
import { authClient } from '../utils/auth'
definePageMeta({key:route=>'/write:'+String(route.query.edit||'new')})
const route = useRoute(), requestFetch = useRequestFetch(), session = authClient.useSession()
useSeoMeta({title:'Document a guide — wikihownaija'})
const queryValue = (name:string) => typeof route.query[name] === 'string' ? String(route.query[name]) : ''
const form = reactive({title:queryValue('topic'),summary:'',category:'',community:'',location:queryValue('location'),experiencedAt:queryValue('date'),requirements:'',tips:'',warnings:'',variations:'',sources:'',changeNote:''})
type StepCard = {id:number;document:RichDocument;mediaIds:string[]}
type Attachment = {file:File;id?:string;stepId?:number;preview:string}
const stepCards = ref<StepCard[]>([{id:1,document:documentFromText(''),mediaIds:[]}])
let nextStepId = 2
const mediaIds = ref<string[]>([]), attachments = ref<Attachment[]>([])
const existingMedia = ref<Array<{id:string;content_type:string}>>([])
const stepMediaIdSet=computed(()=>new Set(stepCards.value.flatMap(step=>step.mediaIds)))
const generalExistingMedia=computed(()=>existingMedia.value.filter(item=>!stepMediaIdSet.value.has(item.id)))
const stage = ref(0), furthestStage = ref(0), message = ref(''), errors = ref<Record<string,string>>({}), busy = ref(false), done = ref(false)
const stageHeading = ref<HTMLElement>(), saveStatus = ref(''), draftReady = ref(false)
const stages = ['Topic','Place & date','What you need','Steps & photos','Helpful tips','Check']
const categoryItems:string[] = [...categories]
const {data:options,status:optionsStatus,error:optionsError}=await useGuideOptions()
const dirty = ref(false)
let guideId:string|undefined, baseVersionId:string|undefined
if (typeof route.query.edit === 'string') {
 const g = await requestFetch<GuideDetail>('/api/guides/'+encodeURIComponent(route.query.edit)), c = g.content
 Object.assign(form,{title:c.title,summary:c.summary,category:c.category,community:c.community,location:c.location,experiencedAt:c.experiencedAt||'',requirements:c.requirements.join('\n'),tips:c.tips.join('\n'),warnings:c.warnings.join('\n'),variations:c.variations.join('\n'),sources:c.sources.join('\n'),changeNote:''})
 stepCards.value = c.steps.map((text,i) => ({id:i+1,document:c.stepDocuments?.[i] || documentFromText(text),mediaIds:[...(c.stepMediaIds?.[i]||[])]}))
 nextStepId = stepCards.value.length+1
 mediaIds.value = [...c.mediaIds]; existingMedia.value = g.media
 guideId = g.id; baseVersionId = g.version_id
}
const lines = (value:string) => value.split('\n').map(s => s.trim()).filter(Boolean)
const content = computed(() => ({title:form.title.trim(),summary:form.summary.trim(),category:form.category as GuideContent['category'],community:form.community.trim(),location:form.location.trim(),experiencedAt:form.experiencedAt,requirements:lines(form.requirements),steps:stepCards.value.map(s => richText(s.document)),stepDocuments:stepCards.value.map(s => s.document),stepMediaIds:stepCards.value.map(s=>s.mediaIds),tips:lines(form.tips),warnings:lines(form.warnings),variations:lines(form.variations),sources:lines(form.sources),mediaIds:mediaIds.value,changeNote:form.changeNote.trim()}))
const signedIn = computed(() => !!session.value.data?.user)
const localISO = (date=new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const dateParts = (value:string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localISO()).split('-')
const initialDate = dateParts(form.experiencedAt)
const dateYear = ref(initialDate[0]!), dateMonth = ref(initialDate[1]!), dateDay = ref(initialDate[2]!)
const currentYear = new Date().getFullYear()
const dateDays = Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0'))
const dateMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'].map((label,i)=>({label,value:String(i+1).padStart(2,'0')}))
const dateYears = Array.from({length:currentYear-1999},(_,i)=>String(currentYear-i))
const rememberedLocation = ref(false)
function loadDate(value:string) { const [year,month,day]=dateParts(value);dateYear.value=year!;dateMonth.value=month!;dateDay.value=day!;form.experiencedAt=`${year}-${month}-${day}` }
function syncDate() { const max=new Date(Number(dateYear.value),Number(dateMonth.value),0).getDate();dateDay.value=String(Math.min(Number(dateDay.value),max)).padStart(2,'0');form.experiencedAt=`${dateYear.value}-${dateMonth.value}-${dateDay.value}` }
watch([dateYear,dateMonth,dateDay],syncDate)
function setRelativeDate(days:number) { const date=new Date();date.setDate(date.getDate()+days);loadDate(localISO(date)) }
const draftKey = 'wikihownaija:guide-draft:'+(guideId || 'new')
type Draft = {version:number;baseVersionId?:string;form:typeof form;stepDocuments:RichDocument[];stepMediaIds?:string[][];mediaIds:string[];savedAt:string}
const pendingDraft = ref<Draft|null>(null), staleDraft = ref(false)
function saveDraft() {
 if (!draftReady.value || !dirty.value || pendingDraft.value || done.value) return
 try {
  const draft:Draft = {version:2,baseVersionId,form:{...form},stepDocuments:stepCards.value.map(s=>s.document),stepMediaIds:stepCards.value.map(s=>[...s.mediaIds]),mediaIds:[...mediaIds.value],savedAt:new Date().toISOString()}
  localStorage.setItem(draftKey,JSON.stringify(draft)); saveStatus.value = 'Draft saved on this device'
 } catch { saveStatus.value = 'Draft could not be saved on this device' }
}
onMounted(() => {
 try {
  if (!guideId && !form.location) { const location=localStorage.getItem('wikihownaija:last-location')||'';if(location){form.location=location;rememberedLocation.value=true} }
  if (!form.experiencedAt) loadDate(localISO())
  const saved = localStorage.getItem(draftKey)
  if (saved) {
   const d = JSON.parse(saved) as Draft
   if ([1,2].includes(d.version) && d.form && Object.keys(form).every(key => typeof d.form[key as keyof typeof form]==='string') && Array.isArray(d.stepDocuments) && d.stepDocuments.length>0 && d.stepDocuments.length<=60 && d.stepDocuments.every(isRichDocument) && Array.isArray(d.mediaIds) && d.mediaIds.every(id=>typeof id==='string')) {
    if (Object.values(d.form).some(value=>value.trim()) || d.stepDocuments.some(doc=>richText(doc)) || d.mediaIds.length) {pendingDraft.value = d; staleDraft.value = d.baseVersionId !== baseVersionId}
   }
  }
 } catch { saveStatus.value = 'Saved draft could not be read' }
 draftReady.value = true
})
function resumeDraft() {
 if (!pendingDraft.value || staleDraft.value) return
 Object.assign(form,pendingDraft.value.form)
 loadDate(form.experiencedAt)
 stepCards.value = pendingDraft.value.stepDocuments.map((document,i)=>({id:i+1,document,mediaIds:[...(pendingDraft.value?.stepMediaIds?.[i]||[])]}))
 nextStepId = stepCards.value.length+1; mediaIds.value = [...pendingDraft.value.mediaIds]
 pendingDraft.value = null; dirty.value = true; saveStatus.value = 'Draft restored. Reattach any files that were not uploaded.'
}
function discardDraft() {
 try { localStorage.removeItem(draftKey) } catch {}
 pendingDraft.value = null; dirty.value = false; saveStatus.value = 'Start a new draft'; staleDraft.value = false
}
let saveTimer:ReturnType<typeof setTimeout>|undefined
watch([form,stepCards,mediaIds],()=>{if(!draftReady.value)return;dirty.value=true;saveStatus.value='Saving draft…';clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,500)},{deep:true})
onBeforeUnmount(()=>{clearTimeout(saveTimer);saveDraft();attachments.value.forEach(item=>URL.revokeObjectURL(item.preview))})
function focusStage() {
 const panel=stageHeading.value
 if (!panel) return
 panel.focus({preventScroll:true})
 const bounds=panel.getBoundingClientRect()
 if (bounds.top<24 || bounds.top>window.innerHeight-80) panel.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
}
const stageFields = [
 ['title','summary','category'],
 ['community','location','experiencedAt'],
 ['requirements'],
 ['steps','stepDocuments','stepMediaIds'],
 ['tips','warnings','variations','sources','mediaIds','changeNote'],
 ['title','summary','category','community','location','experiencedAt','requirements','steps','stepDocuments','stepMediaIds','tips','warnings','variations','sources','mediaIds','changeNote']
] as const
function validate(section:number) {
 errors.value = {}; message.value = ''
 const parsed = guideInput.safeParse(content.value)
 if (parsed.success) return true
 for (const issue of parsed.error.issues) {
  const field = String(issue.path[0])
  if (!stageFields[section]?.includes(field as never)) continue
  if (!errors.value[field]) errors.value[field] = field==='category' ? 'Choose a category.' : field==='steps' ? 'Write something in every step, or remove the empty step.' : issue.message
 }
 if (!Object.keys(errors.value).length) return true
 message.value = 'Check the fields below before continuing.'
 return false
}
function goTo(next:number) {
 if (next > stage.value && !validate(stage.value)) return
 if (stage.value===1 && form.location.trim()) { try {localStorage.setItem('wikihownaija:last-location',form.location.trim());rememberedLocation.value=true} catch {} }
 furthestStage.value=Math.max(furthestStage.value,next)
 stage.value = next; errors.value = {}; message.value = ''
}
function moveStep(index:number, direction:number) {
 const next = index+direction
 if (next<0 || next>=stepCards.value.length) return
 const [item] = stepCards.value.splice(index,1); if(item) stepCards.value.splice(next,0,item)
}
function addStep() { stepCards.value.push({id:nextStepId++,document:documentFromText(''),mediaIds:[]}) }
function removeStep(index:number) {
 const [removed]=stepCards.value.splice(index,1)
 if(!removed)return
 mediaIds.value=mediaIds.value.filter(id=>!removed.mediaIds.includes(id))
 for(let i=attachments.value.length-1;i>=0;i--)if(attachments.value[i]?.stepId===removed.id)removeAttachment(i)
}
function addFiles(files:File[],stepId?:number) {
 const accepted=stepId?new Set(['image/png','image/jpeg','image/webp']):new Set(['image/png','image/jpeg','image/webp','audio/mpeg','audio/mp4','audio/webm'])
 for(const file of files){
  if(!accepted.has(file.type)||file.size>10_000_000){message.value=stepId?'Use PNG, JPEG or WebP images under 10 MB.':'Use PNG, JPEG, WebP, MP3, M4A or WebM files under 10 MB.';continue}
  if(mediaIds.value.length+attachments.value.filter(a=>!a.id).length>=20){message.value='Attach up to 20 files.';break}
  if(stepId&&attachments.value.filter(a=>a.stepId===stepId).length+(stepCards.value.find(s=>s.id===stepId)?.mediaIds.length||0)>=4){message.value='Add up to 4 images to each step.';break}
  attachments.value.push({file,stepId,preview:URL.createObjectURL(file)})
 }
}
function chooseFiles(event:Event) {
 const input = event.target as HTMLInputElement
 message.value = ''
 addFiles(Array.from(input.files||[]))
 input.value = ''
}
function chooseStepImages(event:Event,stepId:number){const input=event.target as HTMLInputElement;message.value='';addFiles(Array.from(input.files||[]),stepId);input.value=''}
const stepAttachments=(stepId:number)=>attachments.value.map((item,index)=>({item,index})).filter(({item})=>item.stepId===stepId)
function removeAttachment(index:number) {
 const [removed] = attachments.value.splice(index,1)
 if(!removed)return
 URL.revokeObjectURL(removed.preview)
 if (removed.id) {mediaIds.value = mediaIds.value.filter(id=>id!==removed.id);stepCards.value.forEach(step=>step.mediaIds=step.mediaIds.filter(id=>id!==removed.id))}
}
function removeStepMedia(step:StepCard,id:string){step.mediaIds=step.mediaIds.filter(value=>value!==id);mediaIds.value=mediaIds.value.filter(value=>value!==id)}
async function submit() {
 if (stage.value<stages.length-1) {goTo(stage.value+1);return}
 if (!validate(stages.length-1) || !signedIn.value) return
 busy.value=true;message.value=''
 try {
  for (const item of attachments.value) {
   if (item.id) continue
   const upload = new FormData();upload.append('file',item.file)
   const media=await $fetch<{id:string}>('/api/media',{method:'POST',body:upload})
   item.id=media.id;mediaIds.value.push(media.id)
   if(item.stepId)stepCards.value.find(step=>step.id===item.stepId)?.mediaIds.push(media.id)
  }
  await $fetch('/api/submissions',{method:'POST',body:{guideId,baseVersionId,content:content.value}})
  done.value=true
  try { localStorage.removeItem(draftKey) } catch {}
 } catch(e:any) {message.value=e.data?.statusMessage || 'Could not submit your guide. Your draft is still saved.'}
 finally {busy.value=false}
}
function beforeSignIn() {saveDraft()}
</script>
<template>
 <section class="writer">
  <div class="writer-intro"><NuxtLink class="writer-return" :to="guideId ? '/guides/'+String(route.query.edit) : '/'"><UIcon name="i-lucide-arrow-left" class="button-icon"/>{{guideId ? 'Back to guide' : 'See all guides'}}</NuxtLink><h1>{{guideId?'Make this guide better.':'Share what you know.'}}</h1><p class="lead">{{guideId ? 'Update the details, explain your changes, then send them for review.' : 'Answer five simple questions. We will turn your answers into a helpful guide.'}}</p><p class="writer-media-promise"><UIcon name="i-lucide-image-plus" aria-hidden="true"/>You can add photos to each step.</p></div>
  <div v-if="done" class="empty"><h2>Our review team has your guide.</h2><p>We will check it before it appears on the site. Thank you for sharing what you know.</p><NuxtLink class="button" to="/">See all guides</NuxtLink></div>
  <template v-else>
   <div v-if="pendingDraft" class="draft-banner" role="status"><div><strong>{{staleDraft?'This guide has changed since you saved your answers.':'You have saved answers on this device.'}}</strong><p>{{staleDraft?'Start with the latest version before suggesting a correction.':'Continue where you stopped. You may need to add your files again.'}}</p></div><div class="actions"><UButton v-if="!staleDraft" type="button" @click="resumeDraft">Continue writing</UButton><UButton type="button" class="secondary" @click="discardDraft">{{staleDraft?'Use latest version':'Start again'}}</UButton></div></div>
   <nav class="writer-progress" aria-label="Guide writing progress"><UButton v-for="(label,i) in stages" :key="label" class="progress-step" :class="{'is-complete':i<stage}" type="button" :aria-current="stage===i?'step':undefined" :disabled="busy||!!pendingDraft||i>furthestStage" @click="goTo(i)"><span class="progress-number">{{i+1}}</span><span class="progress-label">{{label}}</span></UButton></nav>
   <form class="writer-layout" novalidate @submit.prevent="submit">
    <fieldset class="writer-fields" :disabled="busy||!!pendingDraft">
     <MotionHeight><Transition name="stage" mode="out-in" @after-enter="focusStage"><div :key="stage" ref="stageHeading" tabindex="-1" class="writer-panel">
      <template v-if="stage===0">
       <div class="section-heading"><p class="eyebrow">Question 1 of 5</p><h2>What do you know how to do?</h2><p>Choose one thing you have done and can explain clearly.</p></div>
       <UFormField name="title" label="Guide title" description="Start with an action, like “Prepare…” or “Make…”." :error="errors.title" required class="writer-form-field"><UInput v-model="form.title" maxlength="180" placeholder="How to correct a name on my NIN" class="writer-input" autofocus /></UFormField>
       <UFormField name="summary" label="What will someone learn?" description="A sentence or two is enough." :error="errors.summary" :help="`${form.summary.length} / 600`" required class="writer-form-field"><UTextarea v-model="form.summary" maxlength="600" :rows="3" placeholder="Explain what this method helps someone do…" class="writer-input" /></UFormField>
       <UFormField name="category" :error="errors.category" required class="writer-form-field"><template #label><HelpLabel label="Category" definition="The main topic your guide belongs to. This helps people find it." /></template><ChoiceInput v-model="form.category" :items="categoryItems" placeholder="Choose a topic" :disabled="busy||!!pendingDraft" required /></UFormField>
      </template>

      <template v-else-if="stage===1">
       <div class="section-heading"><p class="eyebrow">Question 2 of 5</p><h2>Where and when did you do it?</h2><p>The steps may be different in another place or may change over time. These details help people know if your guide will work for them.</p></div>
       <div class="pair"><UFormField description="You can leave this blank." class="writer-form-field"><template #label><HelpLabel label="Community" definition="A group of people who share a place, culture or way of doing something, such as a village, school or trade group." /></template><ChoiceInput v-model="form.community" :items="options.communities" :loading="optionsStatus==='pending'" allow-custom placeholder="Choose or type a community" :disabled="busy||!!pendingDraft" /></UFormField><UFormField label="Town, city or state" :description="rememberedLocation?'Filled from your last guide.':'We will remember this for the next guide you write.'" class="writer-form-field"><ChoiceInput v-model="form.location" :items="options.locations" :loading="optionsStatus==='pending'" allow-custom placeholder="Choose or type a place" :disabled="busy||!!pendingDraft" /></UFormField></div>
       <p v-if="optionsError" class="field-hint" role="status">We could not load the suggestions. You can still type your own answer.</p>
       <div class="experience-date"><div><h3>When did you do it?</h3><p class="field-hint">We chose today. Pick another date if you did it earlier.</p></div><div class="date-fields"><UFormField label="Day" class="writer-form-field"><USelect v-model="dateDay" :items="dateDays" :ui="{base:'date-select-control',content:'writer-select-menu',item:'writer-select-option'}" /></UFormField><UFormField label="Month" class="writer-form-field"><USelect v-model="dateMonth" :items="dateMonths" value-key="value" :ui="{base:'date-select-control',content:'writer-select-menu',item:'writer-select-option'}" /></UFormField><UFormField label="Year" class="writer-form-field"><USelect v-model="dateYear" :items="dateYears" :ui="{base:'date-select-control',content:'writer-select-menu',item:'writer-select-option'}" /></UFormField></div><div class="quick-date-row"><UButton type="button" class="secondary" @click="setRelativeDate(0)">Today</UButton><UButton type="button" class="secondary" @click="setRelativeDate(-1)">Yesterday</UButton><UButton type="button" class="secondary" @click="setRelativeDate(-7)">A week ago</UButton></div></div>
      </template>

      <template v-else-if="stage===2">
       <div class="section-heading"><p class="eyebrow">Question 3 of 5</p><h2>What should someone have before starting?</h2><p>List any papers, money, tools, online accounts, ingredients or other things they need. Put one item on each line.</p></div>
       <UFormField label="What they will need" :error="errors.requirements" class="writer-form-field"><UTextarea v-model="form.requirements" class="writer-input" :rows="8" placeholder="NIN slip&#10;A valid ID&#10;The correction fee" /></UFormField>
      </template>

      <template v-else-if="stage===3">
       <div class="section-heading"><p class="eyebrow">Question 4 of 5</p><h2>Talk us through what happened.</h2><p>Use one action per step. Add a photo when it will help someone see what to do.</p></div>
       <TransitionGroup tag="div" name="step" class="step-cards"><article v-for="(step,i) in stepCards" :key="step.id" class="step-card"><div class="step-card-heading"><h3>Step {{i+1}}</h3><div class="step-controls"><UButton type="button" class="quiet-button" :disabled="i===0" :aria-label="`Move step ${i+1} up`" @click="moveStep(i,-1)"><UIcon name="i-lucide-arrow-up" class="button-icon"/></UButton><UButton type="button" class="quiet-button" :disabled="i===stepCards.length-1" :aria-label="`Move step ${i+1} down`" @click="moveStep(i,1)"><UIcon name="i-lucide-arrow-down" class="button-icon"/></UButton><UButton type="button" class="quiet-button" :disabled="stepCards.length===1" :aria-label="`Remove step ${i+1}`" @click="removeStep(i)"><UIcon name="i-lucide-trash-2" class="button-icon"/>Remove</UButton></div></div><StepEditor v-model="step.document" :label="`Step ${i+1} instructions`"/><div class="step-media-editor"><div v-if="step.mediaIds.length||stepAttachments(step.id).length" class="step-media-list"><figure v-for="id in step.mediaIds" :key="id"><img :src="`/api/media/${id}`" :alt="`Image for step ${i+1}`"><UButton type="button" class="media-remove" :aria-label="`Remove image from step ${i+1}`" @click="removeStepMedia(step,id)"><UIcon name="i-lucide-x"/></UButton></figure><figure v-for="entry in stepAttachments(step.id)" :key="entry.index"><img :src="entry.item.preview" :alt="entry.item.file.name"><UButton type="button" class="media-remove" :aria-label="`Remove ${entry.item.file.name}`" @click="removeAttachment(entry.index)"><UIcon name="i-lucide-x"/></UButton><figcaption>{{entry.item.file.name}}</figcaption></figure></div><label class="step-image-add"><UIcon name="i-lucide-image-plus" class="button-icon"/><span><strong>Add photos to this step</strong><small>Show what the reader should see or do. Up to 4 PNG, JPEG or WebP photos.</small></span><input type="file" multiple accept="image/png,image/jpeg,image/webp" @change="chooseStepImages($event,step.id)"></label></div></article></TransitionGroup>
       <p v-if="errors.steps||errors.stepDocuments" class="field-error" role="alert">{{errors.steps||errors.stepDocuments}}</p>
       <UButton type="button" class="secondary add-step" :disabled="stepCards.length>=60" @click="addStep"><UIcon name="i-lucide-plus" class="button-icon"/>Add another step</UButton>
      </template>

      <template v-else-if="stage===4">
       <div class="section-heading"><p class="eyebrow">Question 5 of 5</p><h2>What could save someone from stress?</h2><p>Share useful shortcuts, delays, scams, common mistakes or ways the steps change from place to place. Skip anything that does not apply.</p></div>
       <div class="extra-fields"><UFormField label="Helpful tips" class="writer-form-field"><UTextarea v-model="form.tips" class="writer-input" :rows="3" placeholder="One useful tip per line" /></UFormField><UFormField label="Things to watch out for" class="writer-form-field"><UTextarea v-model="form.warnings" class="writer-input" :rows="3" placeholder="One warning or common mistake per line" /></UFormField><UFormField class="writer-form-field"><template #label><HelpLabel label="What changes in other places?" definition="Tell us if people do any part differently in another town, state or community." /></template><UTextarea v-model="form.variations" class="writer-input" :rows="3" placeholder="Name the place and explain what is different" /></UFormField></div>
       <UCollapsible class="writer-extras" :ui="{content:'animated-disclosure'}"><template #default="{open}"><UButton type="button" class="disclosure-trigger"><UIcon name="i-lucide-chevron-right" class="disclosure-chevron button-icon" :class="{'is-open':open}" aria-hidden="true"/>Add general photos or audio <span class="field-hint">Optional</span></UButton></template><template #content><div class="extra-fields"><label class="upload-control">Choose files for the whole guide<input type="file" multiple accept="image/png,image/jpeg,image/webp,audio/mpeg,audio/mp4,audio/webm" @change="chooseFiles"><span class="field-hint">Use this for media that does not belong to one step. PNG, JPEG, WebP, MP3, M4A or WebM · up to 10 MB each.</span></label><div v-for="m in generalExistingMedia" :key="m.id" class="attachment-row"><span>Previously published {{m.content_type.startsWith('audio/')?'audio':'image'}}</span><UButton v-if="mediaIds.includes(m.id)" type="button" class="quiet-button" @click="mediaIds=mediaIds.filter(id=>id!==m.id)">Remove from guide</UButton><span v-else class="muted">Removed</span></div><div v-for="entry in attachments.map((item,index)=>({item,index})).filter(({item})=>!item.stepId)" :key="entry.index" class="attachment-row"><span>{{entry.item.file.name}} <small>({{(entry.item.file.size/1000000).toFixed(1)}} MB)</small></span><UButton type="button" class="quiet-button" :aria-label="`Remove ${entry.item.file.name}`" @click="removeAttachment(entry.index)">Remove</UButton></div></div></template></UCollapsible>
       <UFormField description="Add one answer per line. Ask the person before naming them." class="writer-form-field"><template #label><HelpLabel label="Where did you learn this?" definition="You can add a website, book, office or the name of the person who taught you." /></template><UTextarea v-model="form.sources" class="writer-input" :rows="3" placeholder="A website, book, office or person" /></UFormField>
       <UFormField v-if="guideId" label="What did you change?" class="writer-form-field"><UTextarea v-model="form.changeNote" class="writer-input" maxlength="600" placeholder="Briefly explain your correction or addition." /></UFormField>
      </template>

      <template v-else>
       <div class="section-heading"><p class="eyebrow">Check your answers</p><h2>Is everything correct and in the right order?</h2><p>Read through the guide before sending it to our review team.</p></div>
       <GuidePreview :content="content" />
       <p v-if="mediaIds.length||attachments.length" class="field-hint">{{mediaIds.length+attachments.filter(a=>!a.id).length}} supporting files will accompany this guide.</p>
       <div class="submission-note"><strong>What happens next?</strong><p>Someone from our review team checks the guide before it appears on the site. Other Nigerians can then say if they have done it this way too.</p></div>
       <div v-if="!signedIn" class="signin-callout"><strong>Sign in to send your guide.</strong><p>Your draft is saved on this device so you can return to it after signing in.</p><NuxtLink class="button" :to="{path:'/login',query:{next:route.fullPath}}" @click="beforeSignIn">Sign in to continue<UIcon name="i-lucide-arrow-right" class="button-icon"/></NuxtLink></div>
      </template>
      <div v-if="message" class="notice" role="alert"><p>{{message}}</p><ul v-if="Object.keys(errors).length"><li v-for="(error,field) in errors" :key="field">{{field}}: {{error}}</li></ul></div>
     </div></Transition></MotionHeight>
     <div class="writer-bottom"><UButton v-if="stage>0" type="button" class="secondary" @click="goTo(stage-1)"><UIcon name="i-lucide-arrow-left" class="button-icon"/>Back</UButton><small class="draft-status" role="status">{{saveStatus||'Your draft stays on this device'}}</small><UButton v-if="stage<stages.length-1" type="submit" class="writer-next secondary">Continue to {{stages[stage+1]?.toLowerCase()}}<UIcon name="i-lucide-arrow-right" class="button-icon"/></UButton><UButton v-else type="submit" class="writer-next secondary" :disabled="!signedIn||busy">{{busy?'Sending your guide…':'Submit for review'}}<UIcon v-if="!busy" name="i-lucide-arrow-right" class="button-icon"/></UButton></div>
    </fieldset>
   </form>
  </template>
 </section>
</template>
