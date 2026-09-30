import { z } from 'zod'
import { environment, requireUser } from '../../../../utils/auth'

export default defineEventHandler(async event => {
 const user=await requireUser(event,'review'),db=environment(event).DB,submissionId=getRouterParam(event,'id')!
 const body=z.object({quote:z.string().trim().min(1).max(1000),note:z.string().trim().min(2).max(2000),startOffset:z.number().int().min(0),endOffset:z.number().int().positive()}).strict().safeParse(await readBody(event))
 if(!body.success||body.data.endOffset<=body.data.startOffset)throw createError({statusCode:400,statusMessage:'Select text and write a review note'})
 const submission=await db.prepare("SELECT id FROM submission WHERE id=? AND state='awaiting_review'").bind(submissionId).first()
 if(!submission)throw createError({statusCode:409,statusMessage:'This submission is no longer awaiting review'})
 const id=crypto.randomUUID()
 await db.prepare('INSERT INTO review_annotation(id,submission_id,reviewer_id,quote,note,start_offset,end_offset) VALUES(?,?,?,?,?,?,?)').bind(id,submissionId,user.id,body.data.quote,body.data.note,body.data.startOffset,body.data.endOffset).run()
 return {id}
})
