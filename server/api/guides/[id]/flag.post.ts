import { environment, requireUser } from '../../../utils/auth'
import { z } from 'zod'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'flag'),db=environment(event).DB
 const body=z.object({versionId:z.string(),note:z.string().trim().min(10).max(4000)}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:'Explain the major correction in at least 10 characters'})
 const result=await db.prepare(`INSERT INTO dispute(id,guide_id,version_id,author_id,note) SELECT ?,id,current_version_id,?,? FROM guide WHERE id=? AND current_version_id=?`).bind(crypto.randomUUID(),user.id,body.data.note,getRouterParam(event,'id'),body.data.versionId).run()
 if(!result.meta.changes) throw createError({statusCode:409,statusMessage:'Reload the current revision before flagging it'})
 return {flagged:true}
})
