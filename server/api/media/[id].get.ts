import { environment } from '../../utils/auth'
export default defineEventHandler(async event => {
 const env=environment(event),id=getRouterParam(event,'id')
 const row=await env.DB.prepare(`SELECT m.object_key,m.content_type FROM media m WHERE m.id=? AND EXISTS(
 SELECT 1 FROM guide g JOIN guide_version v ON v.id=g.current_version_id,
 json_each(v.content,'$.mediaIds') j WHERE j.value=m.id)`).bind(id).first<{object_key:string;content_type:string}>()
 if(!row)throw createError({statusCode:404,statusMessage:'Media not found'})
 const object=await env.MEDIA.get(row.object_key)
 if(!object)throw createError({statusCode:404,statusMessage:'Media not found'})
 setHeader(event,'Content-Type',row.content_type)
 setHeader(event,'X-Content-Type-Options','nosniff')
 setHeader(event,'Cache-Control','public,max-age=3600')
 return object.body
})
