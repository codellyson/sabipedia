import { authFor, environment } from '../utils/auth'
import { devLoginAllowed } from '../utils/dev-login'

export default defineEventHandler(async event => {
 if(!devLoginAllowed(event)) throw createError({statusCode:404,statusMessage:'Not found'})
 const env=environment(event),auth=authFor(event)
 const email='dev-moderator@localhost.test'
 const existing=await env.DB.prepare('SELECT id FROM user WHERE email=?').bind(email).first()
 if(!existing){
  const signup=await auth.handler(new Request(new URL('/api/auth/sign-up/email',env.BETTER_AUTH_URL),{
   method:'POST',headers:{'Content-Type':'application/json','Origin':env.BETTER_AUTH_URL},
   body:JSON.stringify({name:'Dev Moderator',email,password:env.DEV_LOGIN_PASSWORD})
  }))
  if(!signup.ok) throw createError({statusCode:500,statusMessage:'Could not create the local dev account'})
 }
 await env.DB.prepare("UPDATE user SET role='moderator' WHERE email=?").bind(email).run()
 const response=await auth.handler(new Request(new URL('/api/auth/sign-in/email',env.BETTER_AUTH_URL),{
  method:'POST',headers:{'Content-Type':'application/json','Origin':env.BETTER_AUTH_URL},
  body:JSON.stringify({email,password:env.DEV_LOGIN_PASSWORD})
 }))
 if(!response.ok) throw createError({statusCode:500,statusMessage:'Could not sign in to the local dev account'})
 return response
})
