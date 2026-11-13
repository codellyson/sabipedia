import test from 'node:test'
import assert from 'node:assert/strict'
import { runAiReview } from '../server/utils/ai-review.ts'
import type { GuideContent } from '../shared/guide.ts'

const content: GuideContent = { title: 'Cook jollof', summary: 'How to cook jollof', category: 'Food & Cooking', community: '', location: '', experiencedAt: '', requirements: [], steps: ['Cook it'], tips: [], warnings: [], sources: [], variations: [], mediaIds: [], changeNote: '' }

function fakeDb() {
  const writes: unknown[][] = []
  const DB = { prepare: () => ({ bind: (...args: unknown[]) => ({ run: async () => { writes.push(args) } }) }) } as unknown as D1Database
  return { DB, writes }
}

test('AI review records that the check is not configured when no key is set', async () => {
  const { DB, writes } = fakeDb()
  const result = await runAiReview({ DB }, 'sub-1', content)
  assert.equal(result.status, 'failed')
  assert.equal(writes[0]?.[1], 'sub-1')
  assert.equal(JSON.parse(String(writes[0]?.[0])).status, 'failed')
})

test('AI review stores a failure instead of throwing when the API call fails', async () => {
  const { DB, writes } = fakeDb()
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('network down') }
  try {
    const result = await runAiReview({ DB, ANTHROPIC_API_KEY: 'test-key' }, 'sub-2', content)
    assert.equal(result.status, 'failed')
    assert.equal(writes.length, 1)
  } finally {
    globalThis.fetch = realFetch
  }
})
