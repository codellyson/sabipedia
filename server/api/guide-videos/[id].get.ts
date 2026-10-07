import { environment, requireUser } from '../../utils/auth'

export default defineEventHandler(async event => {
 const env=environment(event)
 const video=await env.DB.prepare(`SELECT v.object_key,v.content_type,v.size,v.status,
  (g.current_version_id=v.version_id) current_version
  FROM guide_video v JOIN guide g ON g.id=v.guide_id WHERE v.id=?`)
  .bind(getRouterParam(event,'id')).first<{object_key:string;content_type:string;size:number;status:string;current_version:number}>()
 if(!video) throw createError({statusCode:404,statusMessage:'Video not found'})
 const publicVideo=video.status==='published' && Boolean(video.current_version)
 if(!publicVideo) await requireUser(event,'review')
 const rangeHeader=getHeader(event,'range')
 let start=0,end=video.size-1
 if(rangeHeader) {
  const match=/^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  if(!match || (!match[1] && !match[2])) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${video.size}`}})
  if(match[1]) {
   start=Number(match[1]);end=match[2]?Number(match[2]):video.size-1
  } else start=Math.max(0,video.size-Number(match[2]))
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=video.size||end<start||end>=video.size)
   return new Response(null,{status:416,headers:{'Content-Range':`bytes */${video.size}`}})
 }
 const object=await env.MEDIA.get(video.object_key,rangeHeader?{range:{offset:start,length:end-start+1}}:undefined)
 if(!object?.body) throw createError({statusCode:404,statusMessage:'Video file not found'})
 const headers=new Headers({
  'Content-Type':video.content_type,
  'Content-Length':String(end-start+1),
  'Accept-Ranges':'bytes',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
 })
 if(rangeHeader) headers.set('Content-Range',`bytes ${start}-${end}/${video.size}`)
 return new Response(object.body,{status:rangeHeader?206:200,headers})
})
