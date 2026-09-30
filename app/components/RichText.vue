<script lang="ts">
import { defineComponent, h, type PropType, type VNodeChild } from 'vue'
import { isRichDocument, type RichDocument, type RichNode } from '~~/shared/rich-text'
function renderNode(node: RichNode): VNodeChild {
 if (node.type === 'text') {
  let result: VNodeChild = node.text || ''
  for (const mark of node.marks || []) result = h(mark.type === 'bold' ? 'strong' : 'em', {}, [result])
  return result
 }
 if (node.type === 'hardBreak') return h('br')
 const tags = {doc:'div',paragraph:'p',bulletList:'ul',orderedList:'ol',listItem:'li'}
 return h(tags[node.type], node.type === 'orderedList' ? {start:node.attrs?.start, type:node.attrs?.type || undefined} : {}, (node.content || []).map(renderNode))
}
export default defineComponent({
 props: {document: {type:Object as PropType<RichDocument>,default:undefined}, text:{type:String,default:''}},
 setup: props => () => h('div', {class:'rich-text'}, props.document && isRichDocument(props.document) ? [renderNode(props.document)] : props.text)
})
</script>
