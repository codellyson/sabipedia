import { guideInput, type GuideContent } from '../../shared/guide'

export type GuideSubmissionInput = {
  content: GuideContent
  guideId?: string
  baseVersionId?: string
}

export async function submitGuide(db: D1Database, authorId: string, input: GuideSubmissionInput) {
  const parsed = guideInput.safeParse(input.content)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Check the guide fields' })
  const { guideId, baseVersionId } = input
  if (guideId) {
    const guide = await db.prepare('SELECT current_version_id FROM guide WHERE id=?').bind(guideId).first<{ current_version_id: string }>()
    if (!guide || guide.current_version_id !== baseVersionId) throw createError({ statusCode: 409, statusMessage: 'This guide changed. Reload it before submitting a correction' })
  }
  for (const mediaId of parsed.data.mediaIds) {
    const owned = await db.prepare(`SELECT id FROM media WHERE id=? AND (owner_id=? OR EXISTS(SELECT 1 FROM guide_version v,json_each(v.content,'$.mediaIds') j WHERE v.id=? AND v.guide_id=? AND j.value=media.id))`).bind(mediaId, authorId, baseVersionId || '', guideId || '').first()
    if (!owned) throw createError({ statusCode: 403, statusMessage: 'An attached file is not yours' })
  }
  const id = crypto.randomUUID()
  await db.prepare('INSERT INTO submission(id,guide_id,base_version_id,author_id,content) VALUES(?,?,?,?,?)').bind(id, guideId || null, baseVersionId || null, authorId, JSON.stringify(parsed.data)).run()
  return { id, state: 'awaiting_review' as const }
}
