import type { GuideContent } from '~~/shared/guide'
import { environment, requireUser } from '../../utils/auth'

export default defineEventHandler(async event=>{
 const user=await requireUser(event,'submit'),db=environment(event).DB,id=getRouterParam(event,'id')
 const row=await db.prepare(`SELECT id,guide_id,base_version_id,content FROM submission
  WHERE id=? AND author_id=? AND state='rejected'`).bind(id,user.id).first<{id:string;guide_id:string|null;base_version_id:string|null;content:string}>()
 if(!row)throw createError({statusCode:404,statusMessage:'Rejected submission not found'})
 const content=JSON.parse(row.content) as GuideContent
 const media=content.mediaIds.length?await db.prepare(`SELECT id,content_type FROM media WHERE owner_id=? AND id IN (${content.mediaIds.map(()=>'?').join(',')})`).bind(user.id,...content.mediaIds).all<{id:string;content_type:string}>():{results:[]}
 return {...row,content,media:media.results}
})
