import { z } from 'zod'
import { isRichDocument, richText, type RichDocument } from './rich-text.ts'
export const categories = ['Food & Cooking','Culture & Traditions','Everyday Life','Government & Processes','Language & Etiquette','Skills & Crafts'] as const
export const confirmationReasons = ['I do this myself','This is common in my community','I learned it from a family/community member','I have a source','Other'] as const
const text = z.string().trim().min(1).max(4000)
export const guideInput = z.object({
 title: text.max(180), summary: text.max(600), category: z.enum(categories),
 community: z.string().trim().max(120), location: z.string().trim().max(120),
 experiencedAt: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date').default(''),
 requirements: z.array(text).max(40), steps: z.array(text).min(1).max(60),
 stepDocuments: z.array(z.custom<RichDocument>(isRichDocument, 'Use supported step formatting')).max(60).optional(),
 stepMediaIds: z.array(z.array(z.string().uuid()).max(4)).max(60).optional(),
 tips: z.array(text).max(30), warnings: z.array(text).max(30), sources: z.array(text).max(30),
 variations: z.array(text).max(30), mediaIds: z.array(z.string().uuid()).max(20), changeNote: z.string().trim().max(600).default('')
}).strict().superRefine((content,ctx) => {
 if (content.stepDocuments && content.stepDocuments.every(isRichDocument) && (content.stepDocuments.length !== content.steps.length || content.stepDocuments.some((doc,i) => richText(doc) !== content.steps[i]))) ctx.addIssue({code:'custom',path:['stepDocuments'],message:'Step formatting must match the procedure text'})
 if (content.stepMediaIds?.length && content.stepMediaIds.length !== content.steps.length) ctx.addIssue({code:'custom',path:['stepMediaIds'],message:'Step images must stay with their step'})
 const stepMedia=content.stepMediaIds?.flat()||[]
 if (stepMedia.some(id=>!content.mediaIds.includes(id)) || new Set(stepMedia).size!==stepMedia.length) ctx.addIssue({code:'custom',path:['stepMediaIds'],message:'Each step image must belong to this guide and one step'})
})
export type GuideContent = z.infer<typeof guideInput>
