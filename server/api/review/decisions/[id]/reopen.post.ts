import { environment, requireUser } from '../../../../utils/auth'

export default defineEventHandler(async event => {
 await requireUser(event,'review')
 const id=getRouterParam(event,'id')!
 const result=await environment(event).DB.prepare(`UPDATE submission
  SET state='awaiting_review',moderator_note=NULL,reviewed_by=NULL,reviewed_at=NULL
  WHERE id=? AND state='rejected'`).bind(id).run()
 if(!result.meta.changes) throw createError({statusCode:409,statusMessage:'Only a submission sent back for changes can be reopened'})
 return {state:'awaiting_review'}
})
