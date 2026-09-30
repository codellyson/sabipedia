<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import { Bold } from '@tiptap/extension-bold'
import { Italic } from '@tiptap/extension-italic'
import { BulletList, OrderedList, ListItem, ListKeymap } from '@tiptap/extension-list'
import type { RichDocument } from '~~/shared/rich-text'
const props = defineProps<{modelValue:RichDocument;label:string}>()
const emit = defineEmits<{ 'update:modelValue':[value:RichDocument] }>()
const value = computed({get:()=>props.modelValue,set:(document)=>emit('update:modelValue',document)})
// Nuxt UI's plain-text base plus only the nodes and marks supported by our published format.
const extensions = [Bold,Italic,BulletList,OrderedList,ListItem,ListKeymap]
const items:EditorToolbarItem[][] = [
 [{kind:'mark',mark:'bold',icon:'i-lucide-bold','aria-label':'Bold',tooltip:{text:'Bold'}}, {kind:'mark',mark:'italic',icon:'i-lucide-italic','aria-label':'Italic',tooltip:{text:'Italic'}}],
 [{kind:'bulletList',icon:'i-lucide-list','aria-label':'Bullets',tooltip:{text:'Bullet list'}}, {kind:'orderedList',icon:'i-lucide-list-ordered','aria-label':'Numbered list',tooltip:{text:'Numbered list'}}],
 [{kind:'undo',icon:'i-lucide-undo-2','aria-label':'Undo',tooltip:{text:'Undo'}}, {kind:'redo',icon:'i-lucide-redo-2','aria-label':'Redo',tooltip:{text:'Redo'}}]
]
const editorRoot = ref<{editor?:Editor}|null>(null)
watch(()=>props.label,label=>editorRoot.value?.editor?.setOptions({editorProps:{attributes:{role:'textbox','aria-label':label,'aria-multiline':'true',class:'step-input'}}}))
const editorProps = computed(()=>({attributes:{role:'textbox','aria-label':props.label,'aria-multiline':'true',class:'step-input'}}))
</script>
<template>
 <UEditor ref="editorRoot" v-slot="{editor}" v-model="value" content-type="json" :starter-kit="false" :extensions="extensions" :image="false" :mention="false" :editor-props="editorProps" placeholder="Describe what to do in this step…" class="step-editor">
  <UEditorToolbar :editor="editor" :items="items" :aria-label="label+' formatting'" class="editor-toolbar" active-color="neutral">
   <template #item="{item,isActive,isDisabled,onClick}">
    <UTooltip :text="String(item['aria-label'])">
     <UButton type="button" :icon="item.icon" :aria-label="String(item['aria-label'])" :aria-pressed="'kind' in item && ['undo','redo'].includes(String(item.kind)) ? undefined : isActive(item)" :active="isActive(item)" active-class="is-active" :disabled="isDisabled(item)" @click="onClick($event,item)" />
    </UTooltip>
   </template>
  </UEditorToolbar>
 </UEditor>
</template>
