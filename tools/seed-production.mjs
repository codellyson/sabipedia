import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { guideInput } from '../shared/guide.ts'

const apply = process.argv.slice(2).join(' ') === '--apply'
if (process.argv.length > 2 && !apply) throw new Error('Use --apply to import curated candidates into production D1.')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const [officialGuides, foodGuides, officialReport, foodReport, batchReport] = await Promise.all([
 readFile(new URL('./source-submissions.json', import.meta.url), 'utf8').then(JSON.parse),
 readFile(new URL('./food-source-submissions.json', import.meta.url), 'utf8').then(JSON.parse),
 readFile(new URL('../.cache/official-source-scrape.json', import.meta.url), 'utf8').then(JSON.parse),
 readFile(new URL('../.cache/food-source-scrape.json', import.meta.url), 'utf8').then(JSON.parse),
 readFile(new URL('../.cache/food-batch-scrape.json', import.meta.url), 'utf8').then(JSON.parse)
])

const freshAfter = Date.now() - 30 * 24 * 60 * 60 * 1000
const fresh = source => source.status === 'ok' && Date.parse(source.fetchedAt) >= freshAfter
const officialEvidence = new Map(officialReport.sources.filter(fresh).map(source => [source.guide, source]))
const foodEvidence = new Map(foodReport.sources.filter(fresh).map(source => [source.id, source]))
const curated = [
 ...officialGuides.filter(guide => officialEvidence.has(guide.slug)).map(guide => ({ id: `source-${guide.slug}`, content: guideInput.parse(guide.content) })),
 ...foodGuides.filter(guide => foodEvidence.has(guide.sourceId)).map(guide => ({ id: `food-source-${guide.slug}`, content: guideInput.parse(guide.content) }))
]
const promotionalHealthClaim = /belly fat|weight loss|blood pressure|fight inflammation|no diet|no exercise/i
function dishName(title) {
 let dish = title
  .replace(/^how\s+to\s+(?:make|cook|prepare)\s+/i, '')
  .replace(/\s+recipe\s+for\s+.*$/i, '')
  .replace(/\s+(?:recipe|recipes)\s*$/i, '')
  .replace(/\s+\(video\)\s*$/i, '')
  .replace(/\s+[-–—|:]\s+.*$/, '')
  .trim()
 if (dish === dish.toUpperCase()) dish = dish.charAt(0) + dish.slice(1).toLowerCase()
 return dish
}
function batchContent(recipe) {
 const dish = dishName(recipe.title)
 return guideInput.parse({
  title: `How to make ${dish}`.slice(0, 180),
  summary: `Prepare ${dish} using the ingredients and method collected from ${recipe.publisher}. Review quantities and cooking times against the linked source before publishing.`.slice(0, 600),
  category: 'Food & Cooking', community: 'Nigerian home cooks', location: 'Nigeria', experiencedAt: '',
  requirements: recipe.ingredients, steps: recipe.steps, tips: [], warnings: [], variations: [],
  sources: [`${recipe.publisher} — ${recipe.title}: ${recipe.canonicalUrl} (checked ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(recipe.fetchedAt))})`],
  mediaIds: [], changeNote: `Source-extracted recipe draft. Moderator must check accuracy and rewrite source wording before publication. Evidence: ${recipe.contentHash.slice(0, 12)}.`
 })
}
const candidates = [...curated]
const titles = new Set(curated.map(candidate => candidate.content.title.toLowerCase()))
const exclusions = { health: 0, sparse: 0, duplicate: 0, invalid: 0 }
for (const recipe of batchReport.sources.filter(fresh)) {
 if (promotionalHealthClaim.test(recipe.title)) { exclusions.health++; continue }
 if (recipe.steps.length < 3 || recipe.steps.join(' ').length < 120 || recipe.steps.filter(step => step.length >= 30).length < 2) { exclusions.sparse++; continue }
 try {
  const content = batchContent(recipe)
  if (titles.has(content.title.toLowerCase())) { exclusions.duplicate++; continue }
  titles.add(content.title.toLowerCase())
  candidates.push({ id: `food-batch-${recipe.contentHash.slice(0, 20)}`, content })
 } catch (error) {
  exclusions.invalid++
  console.warn(`Skipping ${recipe.title}: ${error instanceof Error ? error.message : String(error)}`)
 }
}
if (!candidates.length) throw new Error('No candidates have a successful source check from the past 30 days.')
console.log(`Production source import: ${candidates.length} review candidates (${curated.length} curated, ${candidates.length - curated.length} batch).`)
console.log(`Excluded: ${officialGuides.length + foodGuides.length - curated.length} curated without fresh successful evidence; ${batchReport.sources.length - batchReport.sources.filter(fresh).length} batch sources without fresh successful evidence; ${JSON.stringify(exclusions)}.`)
for (const candidate of candidates) console.log(`- ${candidate.content.title}`)
if (!apply) {
 console.log('Dry run only. Pass --apply to add these candidates to the production moderator queue.')
 process.exit(0)
}

const quote = value => `'${String(value).replaceAll("'", "''")}'`
const sql = [
 `INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,role)
 VALUES ('source-researcher','WikiHowNaija source research','official-sources@demo.invalid',0,datetime('now'),datetime('now'),'contributor')
 ON CONFLICT(id) DO NOTHING;`
]
for (const candidate of candidates) {
 sql.push(`INSERT INTO submission (id,author_id,content,state,created_at)
 VALUES (${quote(candidate.id)},'source-researcher',${quote(JSON.stringify(candidate.content))},'awaiting_review',datetime('now'))
 ON CONFLICT(id) DO NOTHING;`)
}

const temp = await mkdtemp(join(tmpdir(), 'wikihownaija-production-seed-'))
try {
 const file = join(temp, 'seed.sql')
 await writeFile(file, sql.join('\n') + '\n')
 const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--remote', '--file', file, '--yes'], { cwd: root, stdio: 'inherit' })
 if (result.error) throw result.error
 if (result.status !== 0) process.exitCode = result.status || 1
 else console.log('Production candidates added. Existing submissions and review decisions were preserved.')
} finally {
 await rm(temp, { recursive: true, force: true })
}
