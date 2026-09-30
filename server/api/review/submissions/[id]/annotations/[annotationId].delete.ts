import { environment, requireUser } from '../../../../../utils/auth'

export default defineEventHandler(async event => {
 await requireUser(event,'review')
 const result=await environment(event).DB.prepare('DELETE FROM review_annotation WHERE id=? AND submission_id=?').bind(getRouterParam(event,'annotationId'),getRouterParam(event,'id')).run()
 if(!result.meta.changes)throw createError({statusCode:404,statusMessage:'Review note not found'})
 return {deleted:true}
})
