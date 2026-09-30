import { z } from 'zod'
import { environment, requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
 const user = await requireUser(event, 'review')
 const db = environment(event).DB
 const id = getRouterParam(event, 'id')!
 const body = z.object({
  action: z.enum(['review', 'dismiss']),
  note: z.string().trim().max(2000).default('')
 }).safeParse(await readBody(event))
 if (!body.success) throw createError({ statusCode: 400, statusMessage: 'Invalid community review' })
 if (body.data.action === 'dismiss' && !body.data.note) throw createError({ statusCode: 400, statusMessage: 'Explain why this report is being dismissed' })
 const status = body.data.action === 'review' ? 'reviewed' : 'dismissed'
 const result = await db.prepare(`UPDATE community_evidence
  SET status=?, moderator_note=?, reviewed_by=?, reviewed_at=datetime('now')
  WHERE id=? AND status='awaiting_review'`).bind(status, body.data.note, user.id, id).run()
 if (!result.meta.changes) throw createError({ statusCode: 409, statusMessage: 'Community report already reviewed' })
 return { status }
})
