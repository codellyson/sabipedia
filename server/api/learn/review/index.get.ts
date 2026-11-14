import { environment } from '../../../utils/auth'
import { requireLanguageReviewer } from '../../../utils/learn'
import { canReviewLanguage, languageSlugs } from '../../../../shared/learn'
export default defineEventHandler(async event => {
 const { user, assigned } = await requireLanguageReviewer(event), db = environment(event).DB
 const mine = languageSlugs.filter(l => canReviewLanguage(user.role, assigned, l))
 const marks = mine.map(() => '?').join(',')
 const [submissions, flags] = await Promise.all([
  db.prepare(`SELECT s.id,s.lesson_id,s.language,s.content,s.created_at,s.author_id,u.name author,l.slug,
   (SELECT content FROM lesson_version WHERE id=s.base_version_id) base_content
   FROM lesson_submission s JOIN user u ON u.id=s.author_id LEFT JOIN lesson l ON l.id=s.lesson_id
   WHERE s.state='awaiting_review' AND s.language IN (${marks}) ORDER BY s.created_at`).bind(...mine).all<{ content: string; base_content: string | null } & Record<string, unknown>>(),
  db.prepare(`SELECT f.id,f.phrase_index,f.note,f.created_at,u.name author,l.id lesson_id,l.slug,l.language,
   json_extract(v.content,'$.title') title,json_extract(v.content,'$.phrases['||f.phrase_index||'].text') phrase
   FROM phrase_flag f JOIN user u ON u.id=f.author_id JOIN lesson l ON l.id=f.lesson_id JOIN lesson_version v ON v.id=f.version_id
   WHERE f.status='open' AND l.language IN (${marks}) ORDER BY f.created_at`).bind(...mine).all(),
 ])
 return {
  languages: mine,
  userId: user.id,
  submissions: submissions.results.map(s => ({ ...s, content: JSON.parse(s.content), base_content: s.base_content ? JSON.parse(s.base_content) : null })),
  flags: flags.results,
 }
})
