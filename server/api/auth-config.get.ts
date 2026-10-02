import { environment } from '../utils/auth'

export default defineEventHandler(event => {
  const env=environment(event)
  return {
    emailVerification:env.EMAIL_VERIFICATION_REQUIRED==='1',
    turnstileSiteKey:env.TURNSTILE_SECRET && env.TURNSTILE_HOSTNAMES ? env.TURNSTILE_SITE_KEY || '' : '',
  }
})
