
import { betterAuth } from 'better-auth'
import { admin, captcha } from 'better-auth/plugins'
import type { H3Event } from 'h3'
import { ac, roles } from '../../shared/access'
import { passwordResetEmail, sendTransactionalEmail, verificationEmail } from './email'
export function environment(event: H3Event) {
 const env = event.context.cloudflare?.env as Env | undefined
 if (!env?.DB) throw createError({statusCode: 503, statusMessage: 'Database unavailable. Use the local Worker preview.'})
 return env
}
export function authFor(event: H3Event) {
 const env = environment(event)
 if (!env.BETTER_AUTH_SECRET) throw createError({statusCode:503,statusMessage:'Authentication secret is not configured'})
 const verificationEnabled=Boolean(env.EMAIL_FROM)
 const allowedHostnames=(env.TURNSTILE_HOSTNAMES||'').split(',').map(value=>value.trim()).filter(Boolean)
 const turnstileEnabled=Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY && allowedHostnames.length)
 return betterAuth({ appName: 'wikihownaija', database: env.DB, secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL,
 emailVerification: verificationEnabled ? {
  sendVerificationEmail: async ({user,url}) => sendTransactionalEmail(env,{to:user.email,...verificationEmail(user.name,url)}),
  sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: true, expiresIn: 3600,
 } : undefined,
 emailAndPassword: { enabled: true, minPasswordLength: 12, revokeSessionsOnPasswordReset: true, requireEmailVerification: verificationEnabled,
  sendResetPassword: async ({user,url}) => sendTransactionalEmail(env,{to:user.email,...passwordResetEmail(user.name,url)}),
  customSyntheticUser: ({coreFields,additionalFields,id}) => ({...coreFields,role:'contributor',banned:false,banReason:null,banExpires:null,...additionalFields,id}),
 },
 rateLimit:{enabled:true,storage:'database'},
 advanced:{ipAddress:{ipAddressHeaders:['cf-connecting-ip']},backgroundTasks:{handler:promise=>event.waitUntil(promise)}},
 plugins: [admin({ac, roles, defaultRole: 'contributor'}),...(turnstileEnabled?[captcha({provider:'cloudflare-turnstile',secretKey:env.TURNSTILE_SECRET!,endpoints:['/sign-up/email','/sign-in/email','/request-password-reset','/send-verification-email'],expectedAction:'auth',allowedHostnames})]:[])] })
}
export async function requireUser(event: H3Event, action: 'submit'|'review'|'publish'|'confirm'|'flag') {
 const auth = authFor(event)
 const session = await auth.api.getSession({headers: event.headers})
 if (!session) throw createError({statusCode:401,statusMessage:'Sign in to continue'})
 if (environment(event).EMAIL_FROM && !session.user.emailVerified) throw createError({statusCode:403,statusMessage:'Verify your email to continue'})
 const permission = await auth.api.userHasPermission({body: {userId:session.user.id,permissions:{guide:[action]}}})
 if (!permission.success) throw createError({statusCode:403,statusMessage:'You do not have permission for this action'})
 return session.user
}
