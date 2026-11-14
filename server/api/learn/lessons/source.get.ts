import { environment, requireUser } from '../../../utils/auth'
import { lessonSelect, type LessonRow } from '../../../utils/learn'
// Loads content into the editor: a published page to correct, or one of your own rejected submissions to fix.
export default defineEventHandler(async event => {
 const user = await requireUser(event, 'submit'), db = environment(event).DB, query = getQuery(event)
 if (typeof query.lesson === 'string') {
  const row = await db.prepare(lessonSelect + ' WHERE l.id=?').bind(query.lesson).first<LessonRow>()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  return { lessonId: row.id, baseVersionId: row.version_id, content: JSON.parse(row.content) }
 }
 const s = await db.prepare("SELECT lesson_id,base_version_id,content FROM lesson_submission WHERE id=? AND author_id=? AND state='rejected'").bind(String(query.submission || ''), user.id).first<{ lesson_id: string | null; base_version_id: string | null; content: string }>()
 if (!s) throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
 return { lessonId: s.lesson_id, baseVersionId: s.base_version_id, content: JSON.parse(s.content) }
})
