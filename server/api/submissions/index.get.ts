import { environment, requireUser } from '../../utils/auth'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'submit')
 const db=environment(event).DB
 const [result,annotationResult]=await Promise.all([
  db.prepare(`SELECT s.id,s.state,s.content,s.moderator_note,s.created_at,s.reviewed_at,g.slug
   FROM submission s LEFT JOIN guide g ON g.id=s.guide_id WHERE s.author_id=? ORDER BY s.created_at DESC`).bind(user.id).all(),
  db.prepare(`SELECT a.submission_id,a.quote,a.note,a.created_at FROM review_annotation a
   JOIN submission s ON s.id=a.submission_id WHERE s.author_id=? ORDER BY a.created_at`).bind(user.id).all(),
 ])
 const annotations=new Map<string,Record<string,unknown>[]>()
 for(const item of annotationResult.results as Record<string,unknown>[]){const key=String(item.submission_id);annotations.set(key,[...(annotations.get(key)||[]),item])}
 return result.results.map((r: Record<string,unknown>)=>({...r,content:JSON.parse(String(r.content)),annotations:annotations.get(String(r.id))||[]}))
})
