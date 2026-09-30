import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'cheerio'

if (process.argv.length > 2) throw new Error('Use npm run scrape:food without arguments. Recipe pages are allowlisted in tools/food-source-registry.json.')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const registry = JSON.parse(await readFile(new URL('./food-source-registry.json', import.meta.url), 'utf8'))
const outFile = join(root, '.cache', 'food-source-scrape.json')
const userAgent = 'WikiHowNaijaFoodResearch/0.1 (+http://localhost:3100/about)'
const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

function allowedByRobots(text, pathname) {
 const groups = []
 let current = null
 for (const raw of text.split(/\r?\n/)) {
  const line = raw.replace(/#.*$/, '').trim()
  if (!line) continue
  const match = /^([^:]+):\s*(.*)$/.exec(line)
  if (!match) continue
  const key = match[1].trim().toLowerCase(), value = match[2].trim()
  if (key === 'user-agent') {
   if (!current || current.rules.length) { current = { agents: [], rules: [] }; groups.push(current) }
   current.agents.push(value.toLowerCase())
  } else if (current && (key === 'allow' || key === 'disallow')) current.rules.push({ type: key, path: value })
 }
 const rule = groups.filter(group => group.agents.includes('*')).flatMap(group => group.rules)
  .filter(item => item.path && pathname.startsWith(item.path)).sort((a, b) => b.path.length - a.path.length)[0]
 return rule?.type !== 'disallow'
}

async function checkRobots(url) {
 const target = new URL(url)
 try {
  const response = await fetch(new URL('/robots.txt', target.origin), { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(10000) })
  if (response.ok && !allowedByRobots(await response.text(), target.pathname)) throw new Error('Blocked by robots.txt')
 } catch (error) {
  if (error instanceof Error && error.message === 'Blocked by robots.txt') throw error
 }
}

function recipeObjects(value) {
 if (Array.isArray(value)) return value.flatMap(recipeObjects)
 if (!value || typeof value !== 'object') return []
 const type = value['@type']
 const matches = type === 'Recipe' || Array.isArray(type) && type.includes('Recipe')
 return [...(matches ? [value] : []), ...recipeObjects(value['@graph'])]
}

function extract(html, fetchedUrl) {
 const $ = load(html)
 const canonicalRaw = $('link[rel="canonical"]').attr('href') || fetchedUrl
 const canonical = new URL(canonicalRaw, fetchedUrl)
 canonical.hash = ''
 const recipes = []
 $('script[type="application/ld+json"]').each((_, node) => {
  try { recipes.push(...recipeObjects(JSON.parse($(node).text()))) } catch {}
 })
 const recipe = recipes[0]
 const title = clean(recipe?.name) || clean($('h1').first().text()) || clean($('title').text())
 const ingredients = Array.isArray(recipe?.recipeIngredient) ? recipe.recipeIngredient.map(clean).filter(Boolean) : []
 const instructions = Array.isArray(recipe?.recipeInstructions) ? recipe.recipeInstructions.flatMap(item => {
  if (typeof item === 'string') return [clean(item)]
  if (Array.isArray(item?.itemListElement)) return item.itemListElement.map(step => clean(step?.text || step?.name)).filter(Boolean)
  return [clean(item?.text || item?.name)].filter(Boolean)
 }) : []
 const scope = $('article').first().length ? $('article').first() : $('main').first().length ? $('main').first() : $('body')
 scope.find('script,style,noscript,svg,nav,header,footer,form').remove()
 const plainText = clean(scope.text())
 const wordCount = plainText.split(/\s+/).filter(Boolean).length
 if (!title || wordCount < 80) throw new Error(`Only ${wordCount} useful words found`)
 return {
  title,
  canonicalUrl: canonical.toString(),
  extraction: recipe ? 'recipe-json-ld' : 'article-text',
  ingredientCount: ingredients.length,
  instructionCount: instructions.length,
  wordCount,
  contentHash: createHash('sha256').update([title, ...ingredients, ...instructions, plainText].join('\n')).digest('hex')
 }
}

const allowedHosts = new Set(registry.map(source => new URL(source.url).hostname))
const sources = []
for (const [index, source] of registry.entries()) {
 if (index) await wait(750)
 const fetchedAt = new Date().toISOString()
 try {
  await checkRobots(source.url)
  const response = await fetch(source.url, {
   redirect: 'follow',
   signal: AbortSignal.timeout(30000),
   headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en-NG,en;q=0.9' }
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (!allowedHosts.has(new URL(response.url).hostname)) throw new Error(`Redirected outside the food-source allowlist to ${new URL(response.url).hostname}`)
  const contentType = response.headers.get('content-type') || ''
  if (!/html|xhtml/i.test(contentType)) throw new Error(`Unsupported content type: ${contentType || 'unknown'}`)
  const result = extract(await response.text(), response.url)
  if (!allowedHosts.has(new URL(result.canonicalUrl).hostname)) throw new Error(`Canonical URL is outside the food-source allowlist: ${result.canonicalUrl}`)
  sources.push({ ...source, ...result, fetchedAt, status: 'ok', httpStatus: response.status })
  console.log(`scraped ${source.publisher}: ${result.title} (${result.extraction}, ${result.wordCount} words)`)
 } catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  sources.push({ ...source, fetchedAt, status: 'failed', error: message })
  console.error(`failed ${source.publisher}: ${message}`)
 }
}

await mkdir(dirname(outFile), { recursive: true })
await writeFile(outFile, JSON.stringify({
 version: 1,
 finishedAt: new Date().toISOString(),
 sourceType: 'food-recipe',
 notice: 'Recipe guides are paraphrased before entering moderation. This file keeps retrieval evidence and hashes, not copied article text.',
 userAgent,
 sources
}, null, 2) + '\n')

const passed = sources.filter(source => source.status === 'ok').length
console.log(`\n${passed}/${sources.length} food sources scraped → ${outFile}`)
if (!passed) process.exitCode = 1
