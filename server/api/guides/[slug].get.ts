import { environment } from '../../utils/auth'
import { guideSelect, present, type GuideRow } from '../../utils/guides'
export default defineEventHandler(async event => {
 const db=environment(event).DB
 const row=await db.prepare(guideSelect+' WHERE g.slug=?').bind(getRouterParam(event,'slug')).first<GuideRow>()
 if(!row) throw createError({statusCode:404,statusMessage:'Guide not found'})
 const history=await db.prepare(`SELECT v.id,v.number,v.created_at,u.name author,json_extract(v.content,'$.changeNote') change_note,
 (SELECT count(*) FROM confirmation c WHERE c.version_id=v.id) confirmations FROM guide_version v JOIN user u ON u.id=v.author_id WHERE v.guide_id=? ORDER BY v.number DESC`).bind(row.id).all()
 const media=await db.prepare(`SELECT m.id,m.content_type FROM media m,json_each(?,'$.mediaIds') j WHERE m.id=j.value`).bind(row.content).all<{id:string;content_type:string}>()
 const current=present(row)
 const candidates=await db.prepare(`SELECT g.slug,v.content FROM guide g JOIN guide_version v ON v.id=g.current_version_id
  WHERE g.id<>? AND json_extract(v.content,'$.category')=? ORDER BY v.created_at DESC LIMIT 100`).bind(row.id,current.content.category).all<{slug:string;content:string}>()
 const stop=new Set(['how','to','make','cook','prepare','a','an','the','and','or','with','your','for','of','in','on','recipe','nigerian','nigeria'])
 const words=(value:string)=>new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter(word=>word.length>2&&!stop.has(word))||[])
 const currentWords=words([current.content.title,current.content.summary,...current.content.requirements].join(' '))
 const related=candidates.results.map(candidate=>{
  const content=JSON.parse(candidate.content)
  const candidateWords=words([content.title,content.summary,...content.requirements].join(' '))
  const score=[...candidateWords].filter(word=>currentWords.has(word)).length
  return {slug:candidate.slug,title:content.title,summary:content.summary,category:content.category,score}
 }).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,6).map(({score:_,...item})=>item)
 return {...current,history:history.results,media:media.results,related}
})
