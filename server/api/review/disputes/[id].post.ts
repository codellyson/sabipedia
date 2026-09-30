import { environment, requireUser } from '../../../utils/auth'
import { z } from 'zod'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'review')
 const body=z.object({resolution:z.string().trim().min(10).max(2000)}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:'Explain how the dispute was resolved'})
 await environment(event).DB.prepare("UPDATE dispute SET status='resolved',resolution=?,resolved_by=? WHERE id=? AND status='open'").bind(body.data.resolution,user.id,getRouterParam(event,'id')).run()
 return {resolved:true}
})
