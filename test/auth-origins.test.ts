import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedAuthOrigins } from '../server/utils/auth-origins.ts'

test('auth origins include only configured exact origins', () => {
 const origins = allowedAuthOrigins('https://nigeria-knowledge-bank.codellyson.workers.dev', 'https://wikihownaija.kreativekorna.com')
 assert.deepEqual(origins, [
  'https://nigeria-knowledge-bank.codellyson.workers.dev',
  'https://wikihownaija.kreativekorna.com'
 ])
 assert.equal(origins.includes('https://other.kreativekorna.com'), false)
 assert.equal(origins.includes('http://wikihownaija.kreativekorna.com'), false)
})
