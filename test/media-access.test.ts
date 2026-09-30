import test from 'node:test'
import assert from 'node:assert/strict'
import { canReadUnpublishedMedia } from '../server/utils/media-access.ts'

const media={ownerId:'owner',submissionAuthorId:'author'}

test('unpublished media is hidden from signed-out users and unrelated contributors',()=>{
 assert.equal(canReadUnpublishedMedia(null,media),false)
 assert.equal(canReadUnpublishedMedia({id:'someone-else',role:'contributor'},media),false)
})

test('unpublished media is available to its owner and submission author',()=>{
 assert.equal(canReadUnpublishedMedia({id:'owner',role:'contributor'},media),true)
 assert.equal(canReadUnpublishedMedia({id:'author',role:'contributor'},media),true)
})

test('editors can review unpublished media',()=>{
 assert.equal(canReadUnpublishedMedia({id:'editor',role:'moderator'},media),true)
 assert.equal(canReadUnpublishedMedia({id:'admin',role:'admin,contributor'},media),true)
})
