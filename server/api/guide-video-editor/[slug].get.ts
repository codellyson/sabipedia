import { environment, requireUser } from '../../utils/auth'

type VideoRow = {id:string;version_id:string;status:'draft'|'published'|'rejected';created_at:string}

export default defineEventHandler(async event => {
 await requireUser(event,'review')
 const db=environment(event).DB
 const guide=await db.prepare('SELECT id,current_version_id FROM guide WHERE slug=?').bind(getRouterParam(event,'slug')).first<{id:string;current_version_id:string}>()
 if(!guide) throw createError({statusCode:404,statusMessage:'Article not found'})
 const draft=await db.prepare("SELECT id,version_id,status,created_at FROM guide_video WHERE guide_id=? AND version_id=? AND status='draft' ORDER BY created_at DESC LIMIT 1").bind(guide.id,guide.current_version_id).first<VideoRow>()
 const previous=await db.prepare("SELECT 1 FROM guide_video WHERE guide_id=? AND version_id<>? AND status='published' LIMIT 1").bind(guide.id,guide.current_version_id).first()
 const currentPublished=await db.prepare("SELECT 1 FROM guide_video WHERE guide_id=? AND version_id=? AND status='published' LIMIT 1").bind(guide.id,guide.current_version_id).first()
 return {draft,stale:Boolean(previous && !currentPublished)}
})
