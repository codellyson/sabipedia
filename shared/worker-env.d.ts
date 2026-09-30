/// <reference path="../worker-configuration.d.ts" />

interface Env {
  DEV_LOGIN_ENABLED?: string
  DEV_LOGIN_PASSWORD?: string
  EMAIL?: SendEmail
  EMAIL_FROM?: string
}
