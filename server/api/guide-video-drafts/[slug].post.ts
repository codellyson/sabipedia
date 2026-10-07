import { environment, requireUser } from '../../utils/auth'

export default defineEventHandler(async event => {
 const user=await requireUser(event,'publish')
 const env=environment(event)
 const guide=await env.DB.prepare('SELECT id,current_version_id FROM guide WHERE slug=?').bind(getRouterParam(event,'slug')).first<{id:string;current_version_id:string}>()
 if(!guide) throw createError({statusCode:404,statusMessage:'Guide not found'})
 const form=await readFormData(event)
 const file=form.get('file'),versionId=form.get('versionId')
 if(versionId!==guide.current_version_id) throw createError({statusCode:409,statusMessage:'The guide changed. Reload before generating a video.'})
 if(!(file instanceof File) || !['video/webm','video/mp4'].includes(file.type) || file.size===0 || file.size>40_000_000)
  throw createError({statusCode:400,statusMessage:'Use a generated WebM or MP4 video under 40 MB.'})
 const existing=await env.DB.prepare("SELECT id FROM guide_video WHERE guide_id=? AND version_id=? AND status IN ('draft','published') LIMIT 1").bind(guide.id,guide.current_version_id).first()
 if(existing) throw createError({statusCode:409,statusMessage:'This guide revision already has a video or draft.'})
 const id=crypto.randomUUID(),key=`guide-videos/${guide.id}/${id}`
 await env.MEDIA.put(key,file,{httpMetadata:{contentType:file.type}})
 try {
  const result=await env.DB.prepare(`INSERT INTO guide_video(id,guide_id,version_id,object_key,content_type,size,created_by)
   SELECT ?,g.id,g.current_version_id,?,?,?,? FROM guide g
   WHERE g.id=? AND g.current_version_id=? AND NOT EXISTS(
    SELECT 1 FROM guide_video WHERE guide_id=g.id AND version_id=g.current_version_id AND status IN ('draft','published'))`)
   .bind(id,key,file.type,file.size,user.id,guide.id,guide.current_version_id).run()
  if(!result.meta.changes) throw createError({statusCode:409,statusMessage:'The guide or video changed. Reload and try again.'})
 } catch(error) { await env.MEDIA.delete(key); throw error }
 return {id,status:'draft'}
})
