import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'
import { oauthProviderClient } from '@better-auth/oauth-provider/client'
import { ac, roles } from '~~/shared/access'
export const authClient=createAuthClient({plugins:[adminClient({ac,roles}),oauthProviderClient()]})
