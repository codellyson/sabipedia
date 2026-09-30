<script setup lang="ts">
const props=withDefaults(defineProps<{items:readonly string[];placeholder:string;allowCustom?:boolean;disabled?:boolean;loading?:boolean;required?:boolean}>(),{allowCustom:false})
const model=defineModel<string>({required:true})
const value=computed({get:()=>model.value||undefined,set:(value:string|null|undefined)=>{model.value=value||''}})
const options=computed(()=>[...new Set([...props.items,...(model.value?[model.value]:[])])])
</script>
<template>
 <div class="choice-field"><UInputMenu v-model="value" :items="options" :mode="allowCustom?'autocomplete':'combobox'" :placeholder="placeholder" :disabled="disabled" :loading="loading" :required="required" :maxlength="allowCustom?120:undefined" open-on-focus class="choice-input" :ui="{base:'choice-control',content:'choice-menu',viewport:'choice-options',item:'writer-select-option',trailing:'choice-trailing',trailingIcon:'writer-icon',itemTrailingIcon:'writer-icon',trailingClear:'choice-clear',empty:'choice-empty'}">
  <template #empty>{{allowCustom?'No existing match. You can use the value you typed.':'No matching options.'}}</template>
 </UInputMenu><UButton v-if="model && !disabled" type="button" class="choice-reset" aria-label="Clear selection" icon="i-lucide-x" :ui="{leadingIcon:'writer-icon'}" @click="model=''" /></div>
</template>
