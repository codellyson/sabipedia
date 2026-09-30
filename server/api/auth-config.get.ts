import { environment } from '../utils/auth'

export default defineEventHandler(event => {
  const env=environment(event)
  return {
    emailVerification:Boolean(env.EMAIL_FROM),
    turnstileSiteKey:env.TURNSTILE_SECRET && env.TURNSTILE_HOSTNAMES ? env.TURNSTILE_SITE_KEY || '' : '',
  }
})
