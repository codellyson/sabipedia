import test from 'node:test'
import assert from 'node:assert/strict'
import { newsletterConfirmEmail, passwordResetEmail, reviewDecisionEmail, sendTransactionalEmail, verificationEmail } from '../server/utils/email.ts'

test('transactional email uses a named, configured sender',async()=>{
 let sent: unknown
 const env={EMAIL_FROM:'notifications@sabipedia.com',EMAIL:{send:async (message: unknown)=>{sent=message}}} as Env
 await sendTransactionalEmail(env,{to:'reader@example.com',subject:'Test',text:'Hello',html:'<p>Hello</p>'})
 assert.deepEqual((sent as {from:unknown}).from,{email:'notifications@sabipedia.com',name:'Sabipedia'})
})

test('password reset email escapes user-controlled HTML',()=>{
 const message=passwordResetEmail('<img src=x onerror=alert(1)>','https://example.com/reset?x=1&y=2')
 assert.doesNotMatch(message.html,/<img src=x/)
 assert.match(message.html,/&lt;img/)
 assert.match(message.html,/x=1&amp;y=2/)
 assert.match(message.text,/https:\/\/example\.com\/reset\?x=1&y=2/)
})

test('verification email contains a safe verification link and expiry',()=>{
 const message=verificationEmail('<b>Ada</b>','https://example.com/verify?token=a&callbackURL=b')
 assert.match(message.subject,/Verify/)
 assert.doesNotMatch(message.html,/<b>Ada/)
 assert.match(message.html,/token=a&amp;callbackURL=b/)
 assert.match(message.text,/expires in one hour/)
})

test('review decision email includes the outcome, note and submissions link',()=>{
 const message=reviewDecisionEmail({name:'Ada',title:'How to make soup',published:false,note:'Add one clearer step.',url:'https://example.com/my-guides'})
 assert.match(message.subject,/Changes requested/)
 assert.match(message.text,/Add one clearer step/)
 assert.match(message.html,/See my submissions/)
})

test('newsletter confirm email links confirm and unsubscribe, escaping HTML',()=>{
 const m=newsletterConfirmEmail('https://sabipedia.com/newsletter?confirm=a&b','https://sabipedia.com/newsletter?unsubscribe=a')
 assert.match(m.html,/confirm=a&amp;b/)
 assert.match(m.text,/unsubscribe=a/)
})
