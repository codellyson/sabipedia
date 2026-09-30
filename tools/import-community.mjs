import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

if (process.argv.length > 2) throw new Error('Use npm run db:import-community without arguments; this import is local only.')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const report = JSON.parse(await readFile(new URL('../.cache/community-source-scrape.json', import.meta.url), 'utf8').catch(() => {
 throw new Error('No community scrape found. Run npm run scrape:community first.')
}))
const freshAfter = Date.now() - 7 * 24 * 60 * 60 * 1000
const eligible = report.sources.filter(source => source.status === 'ok' && Date.parse(source.fetchedAt) >= freshAfter)
if (!eligible.length) throw new Error('No successful community scrape from the last seven days.')

const quote = value => "'" + String(value).replaceAll("'", "''") + "'"
const sql = eligible.map(source => {
 const excerpts = source.posts.map(post => post.excerpt)
 const hash = createHash('sha256').update(source.posts.map(post => post.sha256).join(':')).digest('hex')
 const values = [source.id, source.guide, source.finalUrl || source.url, source.title, JSON.stringify(excerpts), excerpts.length, hash, source.fetchedAt]
 return `INSERT INTO community_evidence(id,guide_slug,source_url,source_title,excerpts,post_count,content_hash,scraped_at)
VALUES (${values.map(quote).join(',')})
ON CONFLICT(id) DO UPDATE SET
 guide_slug=excluded.guide_slug,
 source_url=excluded.source_url,
 source_title=excluded.source_title,
 excerpts=excluded.excerpts,
 post_count=excluded.post_count,
 content_hash=excluded.content_hash,
 scraped_at=excluded.scraped_at;`
}).join('\n')

const temp = await mkdtemp(join(tmpdir(), 'knowledge-bank-community-'))
try {
 const file = join(temp, 'community.sql')
 await writeFile(file, sql + '\n')
 const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local', '--file', file, '--yes'], { cwd: root, stdio: 'inherit' })
 if (result.error) throw result.error
 if (result.status !== 0) process.exitCode = result.status || 1
 else console.log(`Recorded ${eligible.length} community evidence item(s) in the local moderator queue.`)
} finally {
 await rm(temp, { recursive: true, force: true })
}
