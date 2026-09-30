import { environment, requireUser } from '../../utils/auth'
export default defineEventHandler(async event => {
 await requireUser(event,'review');const db=environment(event).DB
 const [submissions,disputes,decisions]=await Promise.all([
 db.prepare(`SELECT s.*,u.name author FROM submission s JOIN user u ON u.id=s.author_id WHERE s.state='awaiting_review' ORDER BY s.created_at`).all(),
 db.prepare(`SELECT d.*,g.slug,u.name author FROM dispute d JOIN guide g ON g.id=d.guide_id JOIN user u ON u.id=d.author_id WHERE d.status='open' ORDER BY d.created_at`).all(),
 db.prepare(`SELECT s.id,s.state,s.moderator_note,s.reviewed_at,json_extract(s.content,'$.title') title,
  author.name author,reviewer.name reviewer,g.slug FROM submission s
  JOIN user author ON author.id=s.author_id LEFT JOIN user reviewer ON reviewer.id=s.reviewed_by
  LEFT JOIN guide g ON g.id=s.guide_id WHERE s.state IN ('published','rejected')
  ORDER BY COALESCE(s.reviewed_at,s.created_at) DESC LIMIT 50`).all()])
 return {
  submissions:submissions.results.map((r: Record<string,unknown>)=>({...r,content:JSON.parse(String(r.content))})),
  disputes:disputes.results,
  decisions:decisions.results
 }
})
