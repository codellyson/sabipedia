import type { GuideContent } from '~~/shared/guide'
import { environment, requireUser } from '../../../../utils/auth'
import { runAiReview } from '../../../../utils/ai-review'

export default defineEventHandler(async event => {
 await requireUser(event,'review')
 const env=environment(event)
 const row=await env.DB.prepare('SELECT id,content FROM submission WHERE id=?').bind(getRouterParam(event,'id')).first<{id:string;content:string}>()
 if(!row)throw createError({statusCode:404,statusMessage:'Submission not found'})
 return runAiReview(env,row.id,JSON.parse(row.content) as GuideContent)
})
