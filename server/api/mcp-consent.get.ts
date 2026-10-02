import { verifyOAuthQueryParams } from '@better-auth/oauth-provider'
import { authFor, environment } from '../utils/auth'

export default defineEventHandler(async event => {
  const query = getRequestURL(event).search.slice(1)
  const auth = authFor(event)
  const { secret } = await auth.$context
  if (!query || !(await verifyOAuthQueryParams(query, secret))) throw createError({ statusCode: 400, statusMessage: 'Invalid authorization request' })
  const params = new URLSearchParams(query)
  const clientId = params.get('client_id')
  const client = clientId && await environment(event).DB.prepare('SELECT name,clientId,disabled FROM oauthClient WHERE clientId=?').bind(clientId).first<{ name: string | null; clientId: string; disabled: number | null }>()
  if (!client || client.disabled) throw createError({ statusCode: 400, statusMessage: 'Unknown or disabled application' })
  return { clientName: client.name || client.clientId, clientId: client.clientId, redirectUri: params.get('redirect_uri'), scopes: (params.get('scope') || '').split(' ').filter(Boolean) }
})
