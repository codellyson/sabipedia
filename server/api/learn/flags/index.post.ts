import { z } from 'zod'
import { environment, requireUser } from '../../../utils/auth'
export default defineEventHandler(async event => {
 const user = await requireUser(event, 'flag'), db = environment(event).DB
 const body = z.object({ lessonId: z.string(), phraseIndex: z.number().int().min(0), note: z.string().trim().min(1, 'Say what is wrong').max(1000) }).safeParse(await readBody(event))
 if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message || 'Check the report' })
 const lesson = await db.prepare(`SELECT l.current_version_id FROM lesson l JOIN lesson_version v ON v.id=l.current_version_id
  WHERE l.id=? AND json_array_length(v.content,'$.phrases')>?`).bind(body.data.lessonId, body.data.phraseIndex).first<{ current_version_id: string }>()
 if (!lesson) throw createError({ statusCode: 404, statusMessage: 'Phrase not found' })
 await db.prepare('INSERT INTO phrase_flag(id,lesson_id,version_id,phrase_index,author_id,note) VALUES(?,?,?,?,?,?)')
  .bind(crypto.randomUUID(), body.data.lessonId, lesson.current_version_id, body.data.phraseIndex, user.id, body.data.note).run()
 return { ok: true }
})
