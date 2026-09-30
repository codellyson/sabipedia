import test from 'node:test'
import assert from 'node:assert/strict'
import { passwordResetEmail, reviewDecisionEmail } from '../server/utils/email.ts'

test('password reset email escapes user-controlled HTML',()=>{
 const message=passwordResetEmail('<img src=x onerror=alert(1)>','https://example.com/reset?x=1&y=2')
 assert.doesNotMatch(message.html,/<img/)
 assert.match(message.html,/&lt;img/)
 assert.match(message.html,/x=1&amp;y=2/)
 assert.match(message.text,/https:\/\/example\.com\/reset\?x=1&y=2/)
})

test('review decision email includes the outcome, note and submissions link',()=>{
 const message=reviewDecisionEmail({name:'Ada',title:'How to make soup',published:false,note:'Add one clearer step.',url:'https://example.com/my-guides'})
 assert.match(message.subject,/Changes requested/)
 assert.match(message.text,/Add one clearer step/)
 assert.match(message.html,/See my submissions/)
})
