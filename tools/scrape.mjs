import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { load } from 'cheerio'

if (process.argv.length > 2) throw new Error('Use npm run scrape without arguments. Sources are allowlisted in tools/source-registry.json.')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const registry = JSON.parse(await readFile(new URL('./source-registry.json', import.meta.url), 'utf8'))
const outFile = join(root, '.cache', 'official-source-scrape.json')
const userAgent = 'WikiHowNaijaSourceResearch/0.1 (+https://wikihownaija.example/about)'

const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const urlKey = value => {
 const url = new URL(value)
 url.hash = ''
 url.search = ''
 url.pathname = url.pathname.replace(/\/+$/, '') || '/'
 return url.toString()
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
   if (!current || current.rules.length) { current = {agents:[], rules:[]}; groups.push(current) }
   current.agents.push(value.toLowerCase())
  } else if (current && (key === 'allow' || key === 'disallow')) current.rules.push({type:key,path:value})
 }
 const rules = groups.filter(group => group.agents.includes('*')).flatMap(group => group.rules)
  .filter(rule => rule.path && pathname.startsWith(rule.path))
  .sort((a,b) => b.path.length-a.path.length)
 return rules[0]?.type !== 'disallow'
}

async function fetchPage(url) {
 const target = new URL(url)
 const response = await fetch(target, {
  redirect:'follow', signal:AbortSignal.timeout(25000),
  headers:{'user-agent':userAgent,'accept':'text/html,application/xhtml+xml','accept-language':'en-NG,en;q=0.9'}
 })
 if (!response.ok) throw new Error(`HTTP ${response.status}`)
 if (new URL(response.url).hostname !== target.hostname) throw new Error(`Redirected outside the allowlisted host to ${new URL(response.url).hostname}`)
 const contentType = response.headers.get('content-type') || ''
 if (!/html|xhtml/i.test(contentType)) throw new Error(`Unsupported content type: ${contentType || 'unknown'}`)
 return {html:await response.text(), finalUrl:response.url, contentType, httpStatus:response.status, method:'http'}
}

async function checkRobots(url) {
 const target = new URL(url)
 try {
  const robots = await fetch(new URL('/robots.txt', target.origin), {headers:{'user-agent':userAgent}, signal:AbortSignal.timeout(10000)})
  if (robots.ok && !allowedByRobots(await robots.text(), target.pathname)) throw new Error('Blocked by robots.txt')
 } catch (error) {
  if (error.message === 'Blocked by robots.txt') throw error
  // An absent or unreachable robots file is not a crawl prohibition.
 }
}

let browser
async function chromePath() {
 const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES,'Google','Chrome','Application','chrome.exe')
 ].filter(Boolean)
 for (const candidate of candidates) try { await access(candidate); return candidate } catch {}
 throw new Error('Chrome not found. Set CHROME_PATH to enable rendered-page scraping.')
}

async function renderPage(url) {
 if (!browser) {
  const {default:puppeteer} = await import('puppeteer-core')
  browser = await puppeteer.launch({executablePath:await chromePath(),headless:true,args:['--disable-dev-shm-usage','--no-first-run']})
 }
 const page = await browser.newPage()
 try {
  await page.setUserAgent(userAgent)
  await page.setExtraHTTPHeaders({'accept-language':'en-NG,en;q=0.9'})
  const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})
  await page.waitForNetworkIdle({idleTime:750,timeout:12000}).catch(()=>{})
  await page.waitForSelector('main,article,h1',{timeout:10000}).catch(()=>{})
  const finalUrl = page.url()
  if (new URL(finalUrl).hostname !== new URL(url).hostname) throw new Error(`Redirected outside the allowlisted host to ${new URL(finalUrl).hostname}`)
  return {html:await page.content(),finalUrl,contentType:response?.headers()['content-type']||'text/html',httpStatus:response?.status()||200,method:'browser'}
 } finally { await page.close() }
}

function extract(html) {
 const $ = load(html)
 $('script,style,noscript,svg,canvas,iframe,nav,header,footer,[aria-hidden="true"],.cookie,.cookies,.modal').remove()
 const title = clean($('h1').first().text()) || clean($('title').text())
 let scope = $('main').first()
 if (!scope.length) scope = $('article').first()
 if (!scope.length) scope = $('[role="main"]').first()
 if (!scope.length) scope = $('body')
 const sections = []
 let current = {heading:title || 'Page', text:[]}
 const seen = new Set()
 scope.find('h1,h2,h3,h4,p,li,dt,dd,tr').each((_, element) => {
  const tag = element.tagName?.toLowerCase()
  const text = clean($(element).text())
  if (!text || text.length < 3 || seen.has(text)) return
  seen.add(text)
  if (/^h[1-4]$/.test(tag)) {
   if (current.text.length) sections.push(current)
   current = {heading:text,text:[]}
   return
  }
  if (text.length <= 2000) current.text.push(text)
 })
 if (current.text.length) sections.push(current)
 const useful = sections.filter(section => section.text.join(' ').length >= 40).slice(0,80)
 const plainText = useful.flatMap(section => [section.heading,...section.text]).join('\n')
 return {title, sections:useful, wordCount:plainText.split(/\s+/).filter(Boolean).length, plainText}
}

const startedAt = new Date().toISOString()
const sources = []
for (const source of registry) {
 const base = {...source,url:urlKey(source.url),fetchedAt:new Date().toISOString()}
 try {
  await checkRobots(source.url)
  let page, extracted, firstError
  try {
   page = await fetchPage(source.url)
   extracted = extract(page.html)
   if (extracted.wordCount < 30) throw new Error(`Only ${extracted.wordCount} useful words extracted`)
  } catch (error) {
   firstError = error
   page = await renderPage(source.url)
   extracted = extract(page.html)
   if (extracted.wordCount < 30) throw new Error(`${firstError.message}; browser fallback extracted only ${extracted.wordCount} useful words`)
  }
  sources.push({...base,status:'ok',method:page.method,httpStatus:page.httpStatus,contentType:page.contentType,finalUrl:urlKey(page.finalUrl),title:extracted.title,wordCount:extracted.wordCount,sha256:createHash('sha256').update(extracted.plainText).digest('hex'),sections:extracted.sections})
  console.log(`scraped ${source.id}: ${extracted.wordCount} words (${page.method})`)
 } catch (error) {
  sources.push({...base,status:'failed',error:error instanceof Error ? error.message : String(error)})
  console.error(`failed ${source.id}: ${error instanceof Error ? error.message : String(error)}`)
 }
}

if (browser) await browser.close()

await mkdir(dirname(outFile), {recursive:true})
await writeFile(outFile, JSON.stringify({version:1,startedAt,finishedAt:new Date().toISOString(),userAgent,sources},null,2)+'\n')
const passed = sources.filter(source => source.status === 'ok').length
console.log(`\n${passed}/${sources.length} sources scraped → ${outFile}`)
if (!passed) process.exitCode = 1
