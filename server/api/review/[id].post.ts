import { environment, requireUser } from '../../utils/auth'
import { reviewDecisionEmail, sendTransactionalEmail } from '../../utils/email'
import { z } from 'zod'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'publish'),env=environment(event),db=env.DB,id=getRouterParam(event,'id')!
 const body=z.object({action:z.enum(['publish','reject']),note:z.string().trim().max(2000).default('')}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:'Invalid review'})
 const s=await db.prepare(`SELECT s.*,u.name author_name,u.email author_email FROM submission s
 JOIN user u ON u.id=s.author_id WHERE s.id=? AND s.state='awaiting_review'`).bind(id).first<{guide_id:string|null;base_version_id:string|null;content:string;author_id:string;author_name:string;author_email:string}>()
 if(!s) throw createError({statusCode:409,statusMessage:'Submission already reviewed'})
 const content=JSON.parse(s.content),notify=(published:boolean)=>event.waitUntil(sendTransactionalEmail(env,{to:s.author_email,...reviewDecisionEmail({name:s.author_name,title:String(content.title),published,note:body.data.note,url:`${env.BETTER_AUTH_URL}/my-guides`})}).catch(()=>console.error('Could not send submission decision email')))
 if(body.data.action==='reject') {
 if(!body.data.note) throw createError({statusCode:400,statusMessage:'Explain what needs changing'})
 await db.prepare("UPDATE submission SET state='rejected',moderator_note=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=? AND state='awaiting_review'").bind(body.data.note,user.id,id).run();notify(false);return {state:'rejected'}
 }
 if(s.author_id===user.id) throw createError({statusCode:403,statusMessage:'Another moderator must publish your own submission'})
 const gid=s.guide_id||crypto.randomUUID(),vid=crypto.randomUUID()
 const slug=String(content.title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)+'-'+gid.slice(0,8)
 const statements=[]
 if(!s.guide_id) statements.push(db.prepare("INSERT INTO guide(id,slug,created_by) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM submission WHERE id=? AND state='awaiting_review')").bind(gid,slug,s.author_id,id))
 statements.push(db.prepare(`INSERT INTO guide_version(id,guide_id,number,content,author_id,published_by)
 SELECT ?,g.id,COALESCE((SELECT MAX(number) FROM guide_version WHERE guide_id=g.id),0)+1,s.content,s.author_id,?
 FROM guide g,submission s WHERE g.id=? AND s.id=? AND s.state='awaiting_review' AND g.current_version_id IS s.base_version_id`).bind(vid,user.id,gid,id))
 statements.push(db.prepare('UPDATE guide SET current_version_id=? WHERE id=? AND EXISTS(SELECT 1 FROM guide_version WHERE id=?)').bind(vid,gid,vid))
 statements.push(db.prepare("UPDATE submission SET state='published',guide_id=?,moderator_note=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=? AND EXISTS(SELECT 1 FROM guide_version WHERE id=?)").bind(gid,body.data.note||null,user.id,id,vid))
 const results=await db.batch(statements)
 if(!results[s.guide_id?0:1]?.meta.changes) throw createError({statusCode:409,statusMessage:'The guide changed during review. Review a fresh submission'})
 notify(true)
 return {state:'published',guideId:gid}
})
