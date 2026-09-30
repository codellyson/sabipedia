import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { guideInput } from '../shared/guide.ts'

// Fixed local target: never forward CLI arguments to Wrangler or seed a remote database.
if (process.argv.length > 2) throw new Error('Use npm run db:seed without arguments; this seed is local only.')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const guides = JSON.parse(await readFile(new URL('./seed-guides.json', import.meta.url), 'utf8'))
const sql = []
const quote = value => "'" + String(value).replaceAll("'", "''") + "'"
function insert(table, row) {
 sql.push(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(value => value === null ? 'NULL' : quote(value)).join(',')}) ON CONFLICT DO NOTHING;`)
}
const stamp = '2026-09-20T09:00:00.000Z'
const users = ['author', 'moderator', 'reader-a', 'reader-b', 'reader-c']
for (const name of users) insert('user', {
 id: 'demo-' + name, name: 'Demo ' + name.replaceAll('-', ' '), email: name + '@demo.invalid',
 emailVerified: 0, createdAt: stamp, updatedAt: stamp, role: name === 'moderator' ? 'moderator' : 'contributor'
})
function version(guideId, number, content) {
 const id = `${guideId}-v${number}`
 insert('guide_version', {id, guide_id: guideId, number, content: JSON.stringify(guideInput.parse(content)), author_id: 'demo-author', published_by: 'demo-moderator', created_at: `2026-09-${String(20 + number).padStart(2,'0')} 09:00:00`})
 return id
}
function confirm(versionId, count, content) {
 for (let i = 0; i < count; i++) insert('confirmation', {id: `${versionId}-confirmation-${i}`, version_id: versionId, user_id: 'demo-' + users[i+2], reason: 'I do this myself', community: i === 0 ? content.community : '', location: i === 0 ? content.location : '', created_at: '2026-09-23 10:00:00'})
}
for (const [i, guide] of guides.entries()) {
 const id = 'demo-' + guide.slug
 insert('guide', {id, slug: 'demo-' + guide.slug, created_by: 'demo-author', created_at: '2026-09-20 09:00:00'})
 const first = version(id, 1, guide.content)
 let current = first
 if (i === 0) {
  confirm(first, 3, guide.content)
  current = version(id, 2, {...guide.content, tips: [...guide.content.tips, 'Check the serving plan with another household member.'], changeNote: 'Added a serving-plan tip. Previous revision confirmations remain on revision 1.'})
 } else confirm(first, [1, 3, 5, 10].includes(i) ? 3 : i % 2 === 0 ? 1 : 0, guide.content)
 // Preserve changes made through the app when this seed is run again.
 sql.push(`UPDATE guide SET current_version_id=${quote(current)} WHERE id=${quote(id)} AND current_version_id IS NULL;`)
 if (i === 5) insert('dispute', {id: 'demo-rota-dispute', guide_id: id, version_id: current, author_id: 'demo-reader-c', note: 'Demo major correction: the rota needs an explicit fallback when an assigned participant cannot collect water. Review before treating this example as complete.', status: 'open', created_at: '2026-09-24 09:00:00'})
}
insert('submission', {id: 'demo-new-submission', author_id: 'demo-reader-a', content: JSON.stringify(guideInput.parse({...guides[4].content, title: 'Making a shared household contact list', summary: 'Demo submission — organise agreed service contacts in one accessible place.', steps: ['Ask household members which contacts should be included.', 'Record each contact’s purpose and the date the details were checked.', 'Agree who can access the list and how updates will be made.'], changeNote: 'New demo guide for moderator review.'})), state: 'awaiting_review', created_at: '2026-09-25 09:00:00'})
insert('submission', {id: 'demo-correction-submission', guide_id: 'demo-' + guides[5].slug, base_version_id: 'demo-' + guides[5].slug + '-v1', author_id: 'demo-reader-b', content: JSON.stringify(guideInput.parse({...guides[5].content, steps: [...guides[5].content.steps, 'Agree a backup participant or another arrangement for missed collection days.'], changeNote: 'Demo correction: add a fallback for a missed collection day.'})), state: 'awaiting_review', created_at: '2026-09-25 10:00:00'})
const temp = await mkdtemp(join(tmpdir(), 'knowledge-bank-seed-'))
try {
 const file = join(temp, 'seed.sql')
 await writeFile(file, sql.join('\n') + '\n')
 const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local', '--file', file, '--yes'], {cwd: root, stdio: 'inherit'})
 if (result.error) throw result.error
 if (result.status !== 0) process.exitCode = result.status || 1
 else console.log('Local demo data ready: 12 guides, revision history, confirmations, one dispute and two review submissions. Re-running preserves existing rows and moderation changes.')
} finally {
 await rm(temp, {recursive: true, force: true})
}
