export type RichNode = {
 type: 'doc' | 'paragraph' | 'text' | 'hardBreak' | 'bulletList' | 'orderedList' | 'listItem'
 text?: string
 marks?: Array<{type: 'bold' | 'italic'}>
 attrs?: {start?: number; type?: string | null}
 content?: RichNode[]
}
export type RichDocument = RichNode & {type: 'doc'}

// A small, bounded document grammar shared by the API and renderer. No HTML or arbitrary attributes.
export function isRichDocument(value: unknown): value is RichDocument {
 let count = 0, characters = 0
 function valid(value: unknown, depth: number, parent: string): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 8 || ++count > 1000) return false
  const n = value as Record<string, unknown>
  if (Object.keys(n).some(k => !['type','text','marks','attrs','content'].includes(k))) return false
  const allowed: Record<string, string[]> = {root:['doc'],doc:['paragraph','bulletList','orderedList'],paragraph:['text','hardBreak'],bulletList:['listItem'],orderedList:['listItem'],listItem:['paragraph','bulletList','orderedList']}
  if (typeof n.type !== 'string' || !allowed[parent]?.includes(n.type)) return false
  if (n.type === 'text') {
   if (typeof n.text !== 'string' || !n.text || n.attrs || n.content) return false
   characters += n.text.length
   if (characters > 4000) return false
   return n.marks === undefined || Array.isArray(n.marks) && n.marks.length <= 2 && n.marks.every(m => m && typeof m === 'object' && Object.keys(m).length === 1 && ['bold','italic'].includes(m.type))
  }
  if (n.text !== undefined || n.marks !== undefined) return false
  if (n.attrs !== undefined) {
   if (n.type !== 'orderedList' || !n.attrs || typeof n.attrs !== 'object' || Array.isArray(n.attrs)) return false
   const a = n.attrs as Record<string, unknown>
   if (Object.keys(a).some(k => !['start','type'].includes(k))) return false
   if (a.start !== undefined && (!Number.isInteger(a.start) || Number(a.start) < 1 || Number(a.start) > 1000)) return false
   if (a.type !== undefined && a.type !== null && !['1','a','A','i','I'].includes(String(a.type))) return false
  }
  if (n.type === 'hardBreak') return n.content === undefined
  if (n.content === undefined) return n.type === 'paragraph'
  if (!Array.isArray(n.content) || n.content.length > 200) return false
  if (n.type !== 'paragraph' && !n.content.length) return false
  if (n.type === 'listItem' && (n.content[0] as RichNode)?.type !== 'paragraph') return false
  return n.content.every(child => valid(child, depth + 1, String(n.type)))
 }
 return valid(value, 0, 'root')
}
export function richText(node: RichNode): string {
 if (node.type === 'text') return node.text || ''
 if (node.type === 'hardBreak') return '\n'
 return (node.content || []).map(richText).join(node.type === 'paragraph' ? '' : '\n').trim()
}
export function documentFromText(text: string): RichDocument {
 return {type:'doc',content:text.split('\n').map(line => ({type:'paragraph',...(line ? {content:[{type:'text',text:line}]} : {})}))}
}
