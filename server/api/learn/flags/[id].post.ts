import { environment } from '../../../utils/auth'
import { requireLanguageReviewer } from '../../../utils/learn'
export default defineEventHandler(async event => {
 const db = environment(event).DB, id = getRouterParam(event, 'id')
 const flag = await db.prepare("SELECT l.language FROM phrase_flag f JOIN lesson l ON l.id=f.lesson_id WHERE f.id=? AND f.status='open'").bind(id).first<{ language: string }>()
 if (!flag) throw createError({ statusCode: 404, statusMessage: 'Report not found' })
 const { user } = await requireLanguageReviewer(event, flag.language)
 await db.prepare("UPDATE phrase_flag SET status='resolved',resolved_by=? WHERE id=?").bind(user.id, id).run()
 return { ok: true }
})
