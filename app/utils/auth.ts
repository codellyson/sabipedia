import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'
import { ac, roles } from '~~/shared/access'
export const authClient=createAuthClient({plugins:[adminClient({ac,roles})]})
