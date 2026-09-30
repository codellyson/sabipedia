import type { H3Event } from 'h3'
import { environment } from './auth'

export function devLoginAllowed(event: H3Event): boolean {
 const env=environment(event)
 const origin=getRequestURL(event).origin
 return env.DEV_LOGIN_ENABLED==='1' &&
  typeof env.DEV_LOGIN_PASSWORD==='string' && env.DEV_LOGIN_PASSWORD.length>=32 &&
  new URL(env.BETTER_AUTH_URL).hostname==='localhost' && origin===env.BETTER_AUTH_URL
}
