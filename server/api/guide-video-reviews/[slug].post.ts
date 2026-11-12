import { z } from 'zod'
import { environment, requireUser } from '../../utils/auth'

export default defineEventHandler(async event => {
 const user=await requireUser(event,'publish')
 const body=z.object({id:z.string().uuid(),action:z.enum(['publish','reject'])}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:'Invalid video decision'})
 const db=environment(event).DB
 if(body.data.action==='publish'){
  const video=await db.prepare('SELECT created_by FROM guide_video WHERE id=?').bind(body.data.id).first<{created_by:string}>()
  if(video?.created_by===user.id) throw createError({statusCode:403,statusMessage:'Another moderator must publish your own video'})
 }
 const result=await db.prepare(`UPDATE guide_video SET status=?,reviewed_by=?,reviewed_at=datetime('now')
  WHERE id=? AND status='draft' AND EXISTS (
   SELECT 1 FROM guide g WHERE g.id=guide_video.guide_id AND g.slug=? AND g.current_version_id=guide_video.version_id)`)
  .bind(body.data.action==='publish'?'published':'rejected',user.id,body.data.id,getRouterParam(event,'slug')).run()
 if(!result.meta.changes) throw createError({statusCode:409,statusMessage:'The video or guide changed. Reload before reviewing.'})
 return {status:body.data.action==='publish'?'published':'rejected'}
})
