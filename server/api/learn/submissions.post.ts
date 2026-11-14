import { z } from 'zod'
import { lessonInput } from '../../../shared/learn'
import { environment, requireUser } from '../../utils/auth'
export default defineEventHandler(async event => {
 const user = await requireUser(event, 'submit'), db = environment(event).DB
 const body = z.object({ content: lessonInput, lessonId: z.string().optional(), baseVersionId: z.string().optional() }).strict().safeParse(await readBody(event))
 if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message || 'Check the page fields' })
 const { content, lessonId, baseVersionId } = body.data
 if (lessonId) {
  const lesson = await db.prepare('SELECT language,current_version_id FROM lesson WHERE id=?').bind(lessonId).first<{ language: string; current_version_id: string }>()
  if (!lesson || lesson.current_version_id !== baseVersionId) throw createError({ statusCode: 409, statusMessage: 'This page changed. Reload it before sending a correction' })
  if (lesson.language !== content.language) throw createError({ statusCode: 400, statusMessage: 'A correction cannot change the language' })
 }
 for (const audioId of new Set(content.phrases.map(p => p.audioId))) {
  const owned = await db.prepare(`SELECT id FROM media WHERE id=? AND (owner_id=? OR EXISTS(SELECT 1 FROM lesson_version v,json_each(v.content,'$.phrases') p
   WHERE v.id=? AND json_extract(p.value,'$.audioId')=media.id))`).bind(audioId, user.id, baseVersionId || '').first()
  if (!owned) throw createError({ statusCode: 403, statusMessage: 'A recording is not yours' })
 }
 const id = crypto.randomUUID()
 await db.prepare('INSERT INTO lesson_submission(id,lesson_id,base_version_id,language,author_id,content) VALUES(?,?,?,?,?,?)')
  .bind(id, lessonId || null, baseVersionId || null, content.language, user.id, JSON.stringify(content)).run()
 return { id }
})
