import { authFor, environment } from '../../utils/auth'
import { canReadUnpublishedMedia } from '../../utils/media-access'
export default defineEventHandler(async event => {
 const env=environment(event),id=getRouterParam(event,'id')
 const row=await env.DB.prepare(`SELECT m.object_key,m.content_type,m.owner_id,
 EXISTS(SELECT 1 FROM guide g JOIN guide_version v ON v.id=g.current_version_id,
 json_each(v.content,'$.mediaIds') j WHERE j.value=m.id) AS published,
 (SELECT s.author_id FROM submission s,json_each(s.content,'$.mediaIds') j
 WHERE j.value=m.id ORDER BY s.created_at DESC LIMIT 1) AS submission_author_id
 FROM media m WHERE m.id=?`).bind(id).first<{
  object_key:string;content_type:string;owner_id:string;published:number;submission_author_id:string|null
 }>()
 if(!row)throw createError({statusCode:404,statusMessage:'Media not found'})
 if(!row.published){
  const session=await authFor(event).api.getSession({headers:event.headers})
  if(!canReadUnpublishedMedia(session?.user ?? null,{ownerId:row.owner_id,submissionAuthorId:row.submission_author_id}))
   throw createError({statusCode:404,statusMessage:'Media not found'})
 }
 const object=await env.MEDIA.get(row.object_key)
 if(!object)throw createError({statusCode:404,statusMessage:'Media not found'})
 setHeader(event,'Content-Type',row.content_type)
 setHeader(event,'X-Content-Type-Options','nosniff')
 setHeader(event,'Cache-Control',row.published?'public,max-age=3600':'private,no-store')
 return object.body
})
