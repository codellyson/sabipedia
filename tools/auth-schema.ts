import { DatabaseSync } from 'node:sqlite'
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import { ac, roles } from '../shared/access'

export const auth = betterAuth({
  database: new DatabaseSync(':memory:'),
  secret: 'schema-generation-only-secret-long-enough',
  baseURL: 'http://localhost:8788',
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  plugins: [admin({ ac, roles, defaultRole: 'contributor' })]
})
