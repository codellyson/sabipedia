export default defineEventHandler(event => {
 if (!event.path.startsWith('/api/') || ['GET','HEAD','OPTIONS'].includes(event.method)) return
 const origin = getHeader(event, 'origin')
 const configured = event.context.cloudflare?.env?.BETTER_AUTH_URL
 if (!origin || origin !== configured) throw createError({statusCode:403,statusMessage:'Request origin is not allowed'})
})
