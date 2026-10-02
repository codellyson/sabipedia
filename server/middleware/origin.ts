import { allowedAuthOrigins } from '../utils/auth-origins'

export default defineEventHandler(event => {
 if (!event.path.startsWith('/api/') || ['GET','HEAD','OPTIONS'].includes(event.method)) return
 if (event.path === '/api/mcp' || ['/api/auth/oauth2/token','/api/auth/oauth2/register'].includes(event.path)) return
 const origin = getHeader(event, 'origin')
 const env = event.context.cloudflare?.env
 const allowed = allowedAuthOrigins(env?.BETTER_AUTH_URL, env?.AUTH_ALLOWED_ORIGINS)
 if (!origin || !allowed.includes(origin)) throw createError({statusCode:403,statusMessage:'Request origin is not allowed'})
})
