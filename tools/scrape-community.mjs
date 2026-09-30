import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'cheerio'

if (process.argv.length > 2) throw new Error('Use npm run scrape:community without arguments. Threads are allowlisted in tools/community-source-registry.json.')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const registry = JSON.parse(await readFile(new URL('./community-source-registry.json', import.meta.url), 'utf8'))
const outFile = join(root, '.cache', 'community-source-scrape.json')
const previousReport = JSON.parse(await readFile(outFile, 'utf8').catch(() => '{"sources":[]}'))
const previousById = new Map(previousReport.sources.map(source => [source.id, source]))
const freshAfter = Date.now() - 7 * 24 * 60 * 60 * 1000
const userAgent = 'WikiHowNaijaCommunityResearch/0.1 (+http://localhost:3100/about)'
const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

function redact(value) {
 return clean(value)
 .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted email]')
 .replace(/(?:\+?234|0)[\s().-]*[789][01][\s().-]*(?:\d[\s().-]*){8}\b/g, '[redacted phone]')
  .replace(/(^|\s)@[A-Za-z0-9_]{2,30}\b/g, '$1[redacted handle]')
  .replace(/https?:\/\/\S+/g, '[link]')
}

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
 const response = await fetch(new URL('/robots.txt', target.origin), { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(10000) })
 if (response.ok && !allowedByRobots(await response.text(), target.pathname)) throw new Error('Blocked by robots.txt')
}

let browser
async function chromePath() {
 const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe')
 ].filter(Boolean)
 for (const candidate of candidates) try { await access(candidate); return candidate } catch {}
 throw new Error('Chrome not found. Set CHROME_PATH to scrape public Nairaland threads.')
}

async function render(url) {
 if (!browser) {
  const { default: puppeteer } = await import('puppeteer-core')
  browser = await puppeteer.launch({ executablePath: await chromePath(), headless: true, args: ['--disable-dev-shm-usage', '--no-first-run'] })
 }
 const page = await browser.newPage()
 try {
  await page.setUserAgent(userAgent)
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {})
  await page.waitForSelector('.narrow', { timeout: 15000 })
  const finalUrl = page.url()
  if (new URL(finalUrl).hostname !== new URL(url).hostname) throw new Error(`Redirected outside nairaland.com to ${new URL(finalUrl).hostname}`)
  return { html: await page.content(), httpStatus: response?.status() || 200, finalUrl }
 } finally {
  await page.close()
 }
}

function extract(html) {
 const $ = load(html)
 const title = clean($('h1').first().text()) || clean($('title').text()).replace(/\s+-\s+Nairaland.*$/i, '')
 const posts = []
 $('.narrow').each((index, element) => {
  const copy = $(element).clone()
  copy.find('blockquote,script,style,img').remove()
  const text = redact(copy.text())
  const wordCount = text.split(/\s+/).filter(Boolean).length
  if (wordCount < 12) return
  const excerpt = text.slice(0, 1200)
  posts.push({
   postNumber: index + 1,
   excerpt,
   wordCount,
   sha256: createHash('sha256').update(text).digest('hex')
  })
 })
 return { title, posts: posts.slice(0, 40) }
}

const sources = []
for (const [index, source] of registry.entries()) {
 const previous = previousById.get(source.id)
 if (previous?.status === 'ok' && previous.url === source.url && Date.parse(previous.fetchedAt) >= freshAfter) {
  sources.push({ ...previous, posts: previous.posts.map(post => ({ ...post, excerpt: redact(post.excerpt) })) })
  console.log(`kept ${source.id}: fresh scrape from ${previous.fetchedAt}`)
  continue
 }
 if (index) await wait(1500)
 const fetchedAt = new Date().toISOString()
 try {
  const target = new URL(source.url)
  if (target.hostname !== 'www.nairaland.com') throw new Error('Community source is outside the allowlisted host')
  await checkRobots(source.url)
  const page = await render(source.url)
  const extracted = extract(page.html)
  if (!extracted.posts.length) throw new Error('No useful public posts found')
  sources.push({ ...source, fetchedAt, status: 'ok', method: 'browser', httpStatus: page.httpStatus, finalUrl: page.finalUrl, ...extracted })
  console.log(`scraped ${source.id}: ${extracted.posts.length} public posts`)
 } catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  sources.push({ ...source, fetchedAt, status: 'failed', error: message })
  console.error(`failed ${source.id}: ${message}`)
  if (message.includes('selector `.narrow`')) {
   console.error('Nairaland presented a browser challenge. Stopping this run instead of sending more requests; run the command again later to continue.')
   for (const deferred of registry.slice(index + 1)) {
    const saved = previousById.get(deferred.id)
    sources.push(saved?.status === 'ok' ? saved : { ...deferred, status: 'deferred', error: 'Not requested after Nairaland browser challenge' })
   }
   break
  }
 }
}

if (browser) await browser.close()
await mkdir(dirname(outFile), { recursive: true })
await writeFile(outFile, JSON.stringify({
 version: 1,
 finishedAt: new Date().toISOString(),
 sourceType: 'community-report',
 notice: 'Public user reports are unverified. Use them to identify questions, local variations and possible warnings; confirm factual claims against official sources before publication.',
 userAgent,
 sources
}, null, 2) + '\n')

const passed = sources.filter(source => source.status === 'ok').length
console.log(`\n${passed}/${sources.length} community threads scraped → ${outFile}`)
if (!passed) process.exitCode = 1
