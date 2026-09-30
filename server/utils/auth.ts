
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import type { H3Event } from 'h3'
import { ac, roles } from '../../shared/access'
import { passwordResetEmail, sendTransactionalEmail } from './email'
export function environment(event: H3Event) {
 const env = event.context.cloudflare?.env as Env | undefined
 if (!env?.DB) throw createError({statusCode: 503, statusMessage: 'Database unavailable. Use the local Worker preview.'})
 return env
}
export function authFor(event: H3Event) {
 const env = environment(event)
 if (!env.BETTER_AUTH_SECRET) throw createError({statusCode:503,statusMessage:'Authentication secret is not configured'})
 return betterAuth({ appName: 'wikihownaija', database: env.DB, secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL,
 emailAndPassword: { enabled: true, minPasswordLength: 12, revokeSessionsOnPasswordReset: true,
  sendResetPassword: async ({user,url}) => sendTransactionalEmail(env,{to:user.email,...passwordResetEmail(user.name,url)}),
 },
 advanced:{backgroundTasks:{handler:promise=>event.waitUntil(promise)}},
 plugins: [admin({ac, roles, defaultRole: 'contributor'})] })
}
export async function requireUser(event: H3Event, action: 'submit'|'review'|'publish'|'confirm'|'flag') {
 const auth = authFor(event)
 const session = await auth.api.getSession({headers: event.headers})
 if (!session) throw createError({statusCode:401,statusMessage:'Sign in to continue'})
 const permission = await auth.api.userHasPermission({body: {userId:session.user.id,permissions:{guide:[action]}}})
 if (!permission.success) throw createError({statusCode:403,statusMessage:'You do not have permission for this action'})
 return session.user
}
