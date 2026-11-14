import { z } from 'zod'
import { languageSlugs } from '../../../../shared/learn'
import { environment, requireUser } from '../../../utils/auth'
export default defineEventHandler(async event => {
 const user = await requireUser(event, 'publish'), db = environment(event).DB
 if (!user.role?.split(',').includes('admin')) throw createError({ statusCode: 403, statusMessage: 'Only admins manage language reviewers' })
 const body = z.object({ email: z.string().trim().toLowerCase().email('Enter an email address'), language: z.enum(languageSlugs), remove: z.boolean().default(false) }).safeParse(await readBody(event))
 if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message || 'Check the reviewer' })
 const target = await db.prepare('SELECT id FROM user WHERE lower(email)=?').bind(body.data.email).first<{ id: string }>()
 if (!target) throw createError({ statusCode: 404, statusMessage: 'No account uses that email. Ask them to sign up first' })
 if (body.data.remove) await db.prepare('DELETE FROM language_reviewer WHERE user_id=? AND language=?').bind(target.id, body.data.language).run()
 else await db.prepare('INSERT OR IGNORE INTO language_reviewer(user_id,language,added_by) VALUES(?,?,?)').bind(target.id, body.data.language, user.id).run()
 return { ok: true }
})
