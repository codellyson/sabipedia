import { z } from 'zod'
import { environment } from '../../../utils/auth'
import { reviewDecisionEmail, sendTransactionalEmail } from '../../../utils/email'
import { requireLanguageReviewer } from '../../../utils/learn'
export default defineEventHandler(async event => {
 const env = environment(event), db = env.DB, id = getRouterParam(event, 'id')!
 const body = z.object({ action: z.enum(['publish', 'reject']), note: z.string().trim().max(2000).default('') }).safeParse(await readBody(event))
 if (!body.success) throw createError({ statusCode: 400, statusMessage: 'Invalid review' })
 const s = await db.prepare(`SELECT s.*,u.name author_name,u.email author_email FROM lesson_submission s JOIN user u ON u.id=s.author_id
  WHERE s.id=? AND s.state='awaiting_review'`).bind(id).first<{ lesson_id: string | null; base_version_id: string | null; language: string; content: string; author_id: string; author_name: string; author_email: string }>()
 if (!s) throw createError({ statusCode: 409, statusMessage: 'Submission already reviewed' })
 const { user } = await requireLanguageReviewer(event, s.language)
 const title = String(JSON.parse(s.content).title)
 const notify = (published: boolean) => event.waitUntil(sendTransactionalEmail(env, { to: s.author_email, ...reviewDecisionEmail({ name: s.author_name, title, published, note: body.data.note, url: `${env.BETTER_AUTH_URL}/learn/write`, kind: 'phrase page' }) }).catch(() => console.error('Could not send lesson decision email')))
 if (body.data.action === 'reject') {
  if (!body.data.note) throw createError({ statusCode: 400, statusMessage: 'Explain what needs changing' })
  await db.prepare("UPDATE lesson_submission SET state='rejected',reviewer_note=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=? AND state='awaiting_review'").bind(body.data.note, user.id, id).run()
  notify(false)
  return { state: 'rejected' }
 }
 if (s.author_id === user.id && !user.role?.split(',').includes('admin')) throw createError({ statusCode: 403, statusMessage: 'Another reviewer must publish your own page' })
 const lid = s.lesson_id || crypto.randomUUID(), vid = crypto.randomUUID()
 const slug = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) + '-' + lid.slice(0, 8)
 const statements = []
 if (!s.lesson_id) statements.push(db.prepare("INSERT INTO lesson(id,slug,language,created_by) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_submission WHERE id=? AND state='awaiting_review')").bind(lid, slug, s.language, s.author_id, id))
 statements.push(db.prepare(`INSERT INTO lesson_version(id,lesson_id,number,content,author_id,published_by)
  SELECT ?,l.id,COALESCE((SELECT MAX(number) FROM lesson_version WHERE lesson_id=l.id),0)+1,s.content,s.author_id,?
  FROM lesson l,lesson_submission s WHERE l.id=? AND s.id=? AND s.state='awaiting_review' AND l.current_version_id IS s.base_version_id`).bind(vid, user.id, lid, id))
 statements.push(db.prepare('UPDATE lesson SET current_version_id=? WHERE id=? AND EXISTS(SELECT 1 FROM lesson_version WHERE id=?)').bind(vid, lid, vid))
 statements.push(db.prepare("UPDATE lesson_submission SET state='published',lesson_id=?,reviewer_note=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=? AND EXISTS(SELECT 1 FROM lesson_version WHERE id=?)").bind(lid, body.data.note || null, user.id, id, vid))
 const results = await db.batch(statements)
 if (!results[s.lesson_id ? 0 : 1]?.meta.changes) throw createError({ statusCode: 409, statusMessage: 'The page changed during review. Review a fresh submission' })
 notify(true)
 return { state: 'published', lessonId: lid }
})
