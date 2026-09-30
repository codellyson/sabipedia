import { environment, requireUser } from '../../utils/auth'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'submit')
 const result=await environment(event).DB.prepare('SELECT id,state,content,moderator_note,created_at FROM submission WHERE author_id=? ORDER BY created_at DESC').bind(user.id).all()
 return result.results.map((r: Record<string,unknown>)=>({...r,content:JSON.parse(String(r.content))}))
})
