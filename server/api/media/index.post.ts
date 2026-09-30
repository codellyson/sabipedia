import { environment, requireUser } from '../../utils/auth'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'submit'),env=environment(event)
 const form=await readFormData(event),file=form.get('file')
 if(!(file instanceof File))throw createError({statusCode:400,statusMessage:'Choose a file'})
 const accepted=new Set(['image/png','image/jpeg','image/webp','audio/mpeg','audio/mp4','audio/webm'])
 if(!accepted.has(file.type)||file.size>10_000_000)throw createError({statusCode:400,statusMessage:'Use PNG, JPEG, WebP, MP3, M4A, or WebM under 10 MB'})
 const id=crypto.randomUUID(),key=`uploads/${user.id}/${id}`
 await env.MEDIA.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}})
 try{await env.DB.prepare('INSERT INTO media(id,owner_id,object_key,content_type,size) VALUES(?,?,?,?,?)').bind(id,user.id,key,file.type,file.size).run()}
 catch(e){await env.MEDIA.delete(key);throw e}
 return {id}
})
