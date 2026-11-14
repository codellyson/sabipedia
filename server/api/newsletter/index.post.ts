import { z } from 'zod'
import { siteOrigin } from '../../../shared/seo'
import { environment } from '../../utils/auth'
import { newsletterConfirmEmail, sendTransactionalEmail } from '../../utils/email'
import { newToken, verifyTurnstile } from '../../utils/newsletter'

export default defineEventHandler(async event => {
 const env=environment(event),db=env.DB
 const body=z.object({email:z.string().trim().toLowerCase().email('Enter a valid email address').max(254),captchaToken:z.string().optional()}).safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:body.error.issues[0]?.message||'Enter a valid email address'})
 await verifyTurnstile(event,env,body.data.captchaToken)
 const {email}=body.data
 const row=await db.prepare('SELECT token,confirmed_at,unsubscribed_at,confirm_sent_at>datetime(\'now\',\'-10 minutes\') recent FROM newsletter_subscriber WHERE email=?').bind(email).first<{token:string;confirmed_at:string|null;unsubscribed_at:string|null;recent:number}>()
 // Same reply in every case so the form never reveals who is subscribed.
 if(row&&row.confirmed_at&&!row.unsubscribed_at) return {ok:true}
 if(row?.recent) return {ok:true}
 const token=newToken()
 await db.prepare(`INSERT INTO newsletter_subscriber(email,token,confirm_sent_at) VALUES(?,?,datetime('now'))
  ON CONFLICT(email) DO UPDATE SET token=excluded.token,confirmed_at=NULL,unsubscribed_at=NULL,confirm_sent_at=excluded.confirm_sent_at`).bind(email,token).run()
 await sendTransactionalEmail(env,{to:email,...newsletterConfirmEmail(`${siteOrigin}/newsletter?confirm=${token}`,`${siteOrigin}/newsletter?unsubscribe=${token}`)})
 return {ok:true}
})
