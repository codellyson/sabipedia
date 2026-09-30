import { environment, requireUser } from '../../utils/auth'
import { z } from 'zod'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'publish'),db=environment(event).DB,id=getRouterParam(event,'id')!
 const body=z.object({action:z.enum(['publish','reject']),note:z.string().trim().max(2000).default('')}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:'Invalid review'})
 const s=await db.prepare("SELECT * FROM submission WHERE id=? AND state='awaiting_review'").bind(id).first<{guide_id:string|null;base_version_id:string|null;content:string;author_id:string}>()
 if(!s) throw createError({statusCode:409,statusMessage:'Submission already reviewed'})
 if(body.data.action==='reject') {
 if(!body.data.note) throw createError({statusCode:400,statusMessage:'Explain what needs changing'})
 await db.prepare("UPDATE submission SET state='rejected',moderator_note=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=? AND state='awaiting_review'").bind(body.data.note,user.id,id).run();return {state:'rejected'}
 }
 const gid=s.guide_id||crypto.randomUUID(),vid=crypto.randomUUID()
 const content=JSON.parse(s.content),slug=String(content.title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)+'-'+gid.slice(0,8)
 const statements=[]
 if(!s.guide_id) statements.push(db.prepare("INSERT INTO guide(id,slug,created_by) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM submission WHERE id=? AND state='awaiting_review')").bind(gid,slug,s.author_id,id))
 statements.push(db.prepare(`INSERT INTO guide_version(id,guide_id,number,content,author_id,published_by)
 SELECT ?,g.id,COALESCE((SELECT MAX(number) FROM guide_version WHERE guide_id=g.id),0)+1,s.content,s.author_id,?
 FROM guide g,submission s WHERE g.id=? AND s.id=? AND s.state='awaiting_review' AND g.current_version_id IS s.base_version_id`).bind(vid,user.id,gid,id))
 statements.push(db.prepare('UPDATE guide SET current_version_id=? WHERE id=? AND EXISTS(SELECT 1 FROM guide_version WHERE id=?)').bind(vid,gid,vid))
 statements.push(db.prepare("UPDATE submission SET state='published',guide_id=?,moderator_note=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=? AND EXISTS(SELECT 1 FROM guide_version WHERE id=?)").bind(gid,body.data.note||null,user.id,id,vid))
 const results=await db.batch(statements)
 if(!results[s.guide_id?0:1]?.meta.changes) throw createError({statusCode:409,statusMessage:'The guide changed during review. Review a fresh submission'})
 return {state:'published',guideId:gid}
})
