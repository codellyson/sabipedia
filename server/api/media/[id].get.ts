import { authFor, environment } from '../../utils/auth'
import { canReadUnpublishedMedia } from '../../utils/media-access'
import { assignedLanguages } from '../../utils/learn'
import { canReviewLanguage } from '../../../shared/learn'
export default defineEventHandler(async event => {
 const env=environment(event),id=getRouterParam(event,'id')
 const row=await env.DB.prepare(`SELECT m.object_key,m.content_type,m.owner_id,m.size,
 EXISTS(SELECT 1 FROM guide g JOIN guide_version v ON v.id=g.current_version_id,
 json_each(v.content,'$.mediaIds') j WHERE j.value=m.id)
 OR EXISTS(SELECT 1 FROM lesson l JOIN lesson_version v ON v.id=l.current_version_id,
 json_each(v.content,'$.phrases') p WHERE json_extract(p.value,'$.audioId')=m.id) AS published,
 COALESCE((SELECT s.author_id FROM submission s,json_each(s.content,'$.mediaIds') j
 WHERE j.value=m.id ORDER BY s.created_at DESC LIMIT 1),
 (SELECT s.author_id FROM lesson_submission s,json_each(s.content,'$.phrases') p
 WHERE json_extract(p.value,'$.audioId')=m.id ORDER BY s.created_at DESC LIMIT 1)) AS submission_author_id,
 (SELECT s.language FROM lesson_submission s,json_each(s.content,'$.phrases') p
 WHERE json_extract(p.value,'$.audioId')=m.id ORDER BY s.created_at DESC LIMIT 1) AS lesson_language
 FROM media m WHERE m.id=?`).bind(id).first<{
  object_key:string;content_type:string;owner_id:string;size:number;published:number;submission_author_id:string|null;lesson_language:string|null
 }>()
 if(!row)throw createError({statusCode:404,statusMessage:'Media not found'})
 if(!row.published){
  const user=(await authFor(event).api.getSession({headers:event.headers}))?.user ?? null
  const languageReviewer=Boolean(user && row.lesson_language && canReviewLanguage(user.role,await assignedLanguages(env.DB,user.id),row.lesson_language))
  if(!languageReviewer && !canReadUnpublishedMedia(user,{ownerId:row.owner_id,submissionAuthorId:row.submission_author_id}))
   throw createError({statusCode:404,statusMessage:'Media not found'})
 }
 // Safari only plays audio when byte ranges work.
 const range=/^bytes=(\d+)-(\d*)$/.exec(getHeader(event,'range')||'')
 const start=range?Number(range[1]):0,end=range?Math.min(range[2]?Number(range[2]):row.size-1,row.size-1):row.size-1
 if(range&&start>end){setHeader(event,'Content-Range',`bytes */${row.size}`);throw createError({statusCode:416,statusMessage:'Range not satisfiable'})}
 const object=await env.MEDIA.get(row.object_key,range?{range:{offset:start,length:end-start+1}}:undefined)
 if(!object)throw createError({statusCode:404,statusMessage:'Media not found'})
 setHeader(event,'Accept-Ranges','bytes')
 if(range){setResponseStatus(event,206);setHeader(event,'Content-Range',`bytes ${start}-${end}/${row.size}`)}
 setHeader(event,'Content-Length',end-start+1)
 setHeader(event,'Content-Type',row.content_type)
 setHeader(event,'X-Content-Type-Options','nosniff')
 setHeader(event,'Cache-Control',row.published?'public,max-age=3600':'private,no-store')
 return object.body
})
