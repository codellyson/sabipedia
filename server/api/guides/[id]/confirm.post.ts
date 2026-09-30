import { environment, requireUser } from '../../../utils/auth'
import { z } from 'zod'
import { confirmationReasons } from '../../../../shared/guide'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'confirm'),db=environment(event).DB
 const body=z.object({versionId:z.string(),reason:z.enum(confirmationReasons),community:z.string().trim().max(120).default(''),location:z.string().trim().max(120).default('')}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:'Choose how you know this practice'})
 const b=body.data
 const result=await db.prepare(`INSERT INTO confirmation(id,version_id,user_id,reason,community,location)
 SELECT ?,g.current_version_id,?,?,?,? FROM guide g JOIN guide_version v ON v.id=g.current_version_id WHERE g.id=? AND g.current_version_id=? AND v.author_id<>?
 ON CONFLICT(version_id,user_id) DO NOTHING`).bind(crypto.randomUUID(),user.id,b.reason,b.community,b.location,getRouterParam(event,'id'),b.versionId,user.id).run()
 if(!result.meta.changes) throw createError({statusCode:409,statusMessage:'You already confirmed this revision, or a newer revision is available'})
 return {confirmed:true}
})
