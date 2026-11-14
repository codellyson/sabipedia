import assert from 'node:assert/strict'
import test from 'node:test'
import { canReviewLanguage, lessonInput } from '../shared/learn.ts'

const phrase = { text: 'Ẹ ṣé', meaning: 'Thank you', audioId: '6f1c2a5e-8b1d-4c3e-9f7a-2d4b6c8e0a1b' }

test('lesson needs a recording on every phrase', () => {
 assert.equal(lessonInput.safeParse({ language: 'yoruba', title: 'Greetings', summary: 'Hello', phrases: [phrase] }).success, true)
 const missing = lessonInput.safeParse({ language: 'yoruba', title: 'Greetings', summary: 'Hello', phrases: [{ ...phrase, audioId: undefined }] })
 assert.equal(missing.success, false)
 assert.equal(missing.error?.issues[0]?.message, 'Record every phrase before sending')
 assert.equal(lessonInput.safeParse({ language: 'french', title: 'x', summary: 'x', phrases: [phrase] }).success, false)
})

test('language reviewers review only their languages', () => {
 assert.equal(canReviewLanguage('contributor', ['hausa'], 'hausa'), true)
 assert.equal(canReviewLanguage('contributor', ['hausa'], 'yoruba'), false)
 assert.equal(canReviewLanguage('contributor,moderator', [], 'igbo'), true)
 assert.equal(canReviewLanguage(null, [], 'igbo'), false)
})
