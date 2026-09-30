import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { guideInput } from '../shared/guide.ts'

// Source research enters moderation locally. This command never publishes to a remote D1 database.
if (process.argv.length > 2) throw new Error('Use npm run db:preseed without arguments; this seed is local only.')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const guides = JSON.parse(await readFile(new URL('./source-submissions.json', import.meta.url), 'utf8'))
const scrape = JSON.parse(await readFile(new URL('../.cache/official-source-scrape.json', import.meta.url), 'utf8').catch(() => {
 throw new Error('No scrape evidence found. Run npm run scrape before npm run db:preseed.')
}))
const freshAfter = Date.now() - 30 * 24 * 60 * 60 * 1000
const scrapedByGuide = new Map(scrape.sources.filter(source => source.status === 'ok' && Date.parse(source.fetchedAt) >= freshAfter).map(source => [source.guide,source]))
const eligible = guides.filter(guide => scrapedByGuide.has(guide.slug))
const skipped = guides.filter(guide => !scrapedByGuide.has(guide.slug))
if (skipped.length) console.warn(`Skipping ${skipped.length} guide(s) without a successful scrape from the last 30 days: ${skipped.map(guide => guide.slug).join(', ')}`)
if (!eligible.length) throw new Error('No guide has fresh successful scrape evidence.')
const quote = value => "'" + String(value).replaceAll("'", "''") + "'"
const sql = []
function insert(table, row) {
 sql.push(`INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(value => value === null ? 'NULL' : quote(value)).join(',')}) ON CONFLICT DO NOTHING;`)
}

const stamp = '2026-09-29 12:00:00'
insert('user', {
 id: 'source-researcher', name: 'Official source research', email: 'official-sources@demo.invalid',
 emailVerified: 0, createdAt: stamp, updatedAt: stamp, role: 'contributor'
})
for (const guide of eligible) {
 insert('submission', {
  id: 'source-' + guide.slug,
  author_id: 'source-researcher',
  content: JSON.stringify(guideInput.parse(guide.content)),
  state: 'awaiting_review',
  created_at: stamp
 })
}

const temp = await mkdtemp(join(tmpdir(), 'knowledge-bank-preseed-'))
try {
 const file = join(temp, 'preseed.sql')
 await writeFile(file, sql.join('\n') + '\n')
 const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local', '--file', file, '--yes'], {cwd: root, stdio: 'inherit'})
 if (result.error) throw result.error
 if (result.status !== 0) process.exitCode = result.status || 1
 else console.log(`Local source queue ready: ${eligible.length} government-process starters with fresh scrape evidence awaiting moderator review. Re-running preserves existing submissions and review decisions.`)
} finally {
 await rm(temp, {recursive: true, force: true})
}
