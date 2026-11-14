import { z } from 'zod'
import { environment } from '../../utils/auth'

export default defineEventHandler(async event => {
 const db=environment(event).DB
 const body=z.object({token:z.string().regex(/^[0-9a-f]{48}$/),action:z.enum(['confirm','unsubscribe'])}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:'This link is not valid'})
 const sql=body.data.action==='confirm'
  ?"UPDATE newsletter_subscriber SET confirmed_at=coalesce(confirmed_at,datetime('now')),unsubscribed_at=NULL WHERE token=?"
  :"UPDATE newsletter_subscriber SET unsubscribed_at=datetime('now') WHERE token=?"
 const {meta}=await db.prepare(sql).bind(body.data.token).run()
 if(!meta.changes) throw createError({statusCode:404,statusMessage:'This link is not valid or has been replaced by a newer one'})
 return {ok:true}
})
