import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { guideInput } from '../shared/guide.ts'

if (process.argv.length > 2) throw new Error('Use npm run db:import-food without arguments; this import is local only.')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const guides = JSON.parse(await readFile(new URL('./food-source-submissions.json', import.meta.url), 'utf8'))
const report = JSON.parse(await readFile(new URL('../.cache/food-source-scrape.json', import.meta.url), 'utf8').catch(() => {
 throw new Error('No food scrape found. Run npm run scrape:food first.')
}))
const freshAfter = Date.now() - 30 * 24 * 60 * 60 * 1000
const evidenceById = new Map(report.sources.filter(source => source.status === 'ok' && Date.parse(source.fetchedAt) >= freshAfter).map(source => [source.id, source]))
const eligible = guides.filter(guide => evidenceById.has(guide.sourceId))
const skipped = guides.filter(guide => !evidenceById.has(guide.sourceId))
if (skipped.length) console.warn(`Skipping ${skipped.length} guide(s) without a successful scrape from the last 30 days: ${skipped.map(guide => guide.slug).join(', ')}`)
if (!eligible.length) throw new Error('No food guide has fresh successful scrape evidence.')

const quote = value => "'" + String(value).replaceAll("'", "''") + "'"
const sql = []
const insert = (table, row) => sql.push(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(value => value === null ? 'NULL' : quote(value)).join(',')}) ON CONFLICT DO NOTHING;`)
const stamp = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')

insert('user', {
 id: 'food-source-researcher', name: 'Nigerian food source research', email: 'food-sources@demo.invalid',
 emailVerified: 0, createdAt: stamp, updatedAt: stamp, role: 'contributor'
})
for (const guide of eligible) {
 const evidence = evidenceById.get(guide.sourceId)
 const content = guideInput.parse(guide.content)
 content.changeNote = `${content.changeNote} Scrape evidence: ${evidence.contentHash.slice(0, 12)}.`
 const id = 'food-source-' + guide.slug
 sql.push(`INSERT INTO submission (id,author_id,content,state,created_at)
VALUES (${quote(id)},${quote('food-source-researcher')},${quote(JSON.stringify(content))},${quote('awaiting_review')},${quote(stamp)})
ON CONFLICT(id) DO UPDATE SET content=excluded.content
WHERE submission.state='awaiting_review';`)
}

const temp = await mkdtemp(join(tmpdir(), 'knowledge-bank-food-'))
try {
 const file = join(temp, 'food.sql')
 await writeFile(file, sql.join('\n') + '\n')
 const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local', '--file', file, '--yes'], { cwd: root, stdio: 'inherit' })
 if (result.error) throw result.error
 if (result.status !== 0) process.exitCode = result.status || 1
 else console.log(`Recorded ${eligible.length} paraphrased, source-linked food guide(s) in the local moderator queue. Re-running preserves existing submissions and review decisions.`)
} finally {
 await rm(temp, { recursive: true, force: true })
}
