import { authFor, environment } from '../../utils/auth'
import { assignedLanguages } from '../../utils/learn'
import { canReviewLanguage, languageSlugs } from '../../../shared/learn'
export default defineEventHandler(async event => {
 const session = await authFor(event).api.getSession({ headers: event.headers })
 if (!session) return { signedIn: false, reviews: [] as string[], isAdmin: false, submissions: [] as Record<string, unknown>[] }
 const db = environment(event).DB, assigned = await assignedLanguages(db, session.user.id)
 const submissions = await db.prepare(`SELECT s.id,s.state,s.language,s.reviewer_note,s.created_at,s.reviewed_at,json_extract(s.content,'$.title') title,l.slug
  FROM lesson_submission s LEFT JOIN lesson l ON l.id=s.lesson_id WHERE s.author_id=? ORDER BY s.created_at DESC LIMIT 50`).bind(session.user.id).all()
 return {
  signedIn: true,
  reviews: languageSlugs.filter(l => canReviewLanguage(session.user.role, assigned, l)),
  isAdmin: Boolean(session.user.role?.split(',').includes('admin')),
  submissions: submissions.results,
 }
})
