import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'cheerio'

if (process.argv.length > 2) throw new Error('Use npm run scrape:food:batch without arguments. Publishers are allowlisted in tools/food-batch-sources.json.')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const publishers = JSON.parse(await readFile(new URL('./food-batch-sources.json', import.meta.url), 'utf8'))
const existing = JSON.parse(await readFile(new URL('./food-source-registry.json', import.meta.url), 'utf8'))
const existingUrls = new Set(existing.map(item => normalizeUrl(item.url)))
const outFile = join(root, '.cache', 'food-batch-scrape.json')
const previousReport = JSON.parse(await readFile(outFile,'utf8').catch(()=>'{"sources":[]}'))
const previousByUrl = new Map(previousReport.sources.map(source=>[source.requestedUrl,source]))
const freshAfter = Date.now()-30*24*60*60*1000
const userAgent = 'WikiHowNaijaFoodResearch/0.2 (+http://localhost:3100/about)'
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const clean = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim()
const nigeriaTerms = /nigerian|jollof|egusi|moi-moi|moin-moin|suya|akara|puff-puff|chin-chin|ogbono|okra|okro|efo-|banga|afang|edikang|yam|plantain|beans|stew|pepper-soup|fried-rice|coconut-rice|fufu|eba|amala|zobo|meat-pie|egg-roll|fish-roll|kilishi|dodo|porridge|nkwobi|isi-ewu|asun|tuwo|masa|buns|snail|catfish|goat-meat/i

function normalizeUrl(value) {
 const url = new URL(value)
 url.hash = ''; url.search = ''; url.pathname = url.pathname.replace(/\/+$/, '') || '/'
 return url.toString()
}
function site(value) { return new URL(value).hostname.replace(/^www\./, '') }
function sameSite(a,b) { return site(a) === site(b) }
async function fetchText(url, accept='text/html,application/xhtml+xml,application/xml,text/xml') {
 const response = await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'user-agent':userAgent,accept,'accept-language':'en-NG,en;q=0.9'}})
 if (!response.ok) throw new Error(`HTTP ${response.status}`)
 if (!sameSite(response.url,url)) throw new Error(`Redirected outside ${site(url)}`)
 return {text:await response.text(),url:response.url,status:response.status}
}
function locations(xml) {
 const $ = load(xml,{xmlMode:true})
 return $('loc').map((_,node)=>clean($(node).text())).get().filter(Boolean)
}
async function discover(publisher) {
 const first = await fetchText(publisher.sitemap,'application/xml,text/xml')
 const firstLocations = locations(first.text)
 const childSitemaps = firstLocations.filter(url => /sitemap.*\.xml/i.test(url))
 const usefulChildren = childSitemaps.filter(url => /post|recipe/i.test(url) && !/attachment|author|category|tag|page-/i.test(url)).slice(0,8)
 const pages = childSitemaps.length
  ? (await Promise.all(usefulChildren.map(url => fetchText(url,'application/xml,text/xml').then(result => locations(result.text))))).flat()
  : firstLocations
 const candidates = [...new Set(pages.map(normalizeUrl))].filter(url => {
  if (!sameSite(url,publisher.sitemap) || existingUrls.has(url)) return false
  const path = new URL(url).pathname
  if (path === '/' || /\/category\/|\/tag\/|\/author\/|\/about|\/contact|privacy|terms|shop|ebook/i.test(path)) return false
  return publisher.filter === 'all' || nigeriaTerms.test(path)
 })
 if (candidates.length <= publisher.limit) return candidates
 const selected = []
 const step = candidates.length / publisher.limit
 for (let index=0; index<publisher.limit; index++) selected.push(candidates[Math.floor(index*step)])
 return [...new Set(selected)]
}
function recipeObjects(value) {
 if (Array.isArray(value)) return value.flatMap(recipeObjects)
 if (!value || typeof value !== 'object') return []
 const type = value['@type']
 const isRecipe = type === 'Recipe' || Array.isArray(type) && type.includes('Recipe')
 return [...(isRecipe?[value]:[]),...recipeObjects(value['@graph'])]
}
function instructions(value) {
 if (typeof value === 'string') return [clean(value)].filter(Boolean)
 if (Array.isArray(value)) return value.flatMap(instructions)
 if (!value || typeof value !== 'object') return []
 if (value.text || value.name) return [clean(value.text || value.name)].filter(Boolean)
 return instructions(value.itemListElement)
}
function extractRecipe(html,pageUrl) {
 const $ = load(html)
 const recipes = []
 $('script[type="application/ld+json"]').each((_,node)=>{try{recipes.push(...recipeObjects(JSON.parse($(node).text())))}catch{}})
 const recipe = recipes.sort((a,b)=>(b.recipeIngredient?.length||0)-(a.recipeIngredient?.length||0))[0]
 let ingredients = Array.isArray(recipe?.recipeIngredient) ? recipe.recipeIngredient.map(clean).filter(Boolean) : []
 let steps = instructions(recipe?.recipeInstructions)
 if (!ingredients.length) ingredients = $('[itemprop="recipeIngredient"],.wprm-recipe-ingredient').map((_,node)=>clean($(node).text())).get().filter(Boolean)
 if (!steps.length) steps = $('[itemprop="recipeInstructions"],.wprm-recipe-instruction-text').map((_,node)=>clean($(node).text())).get().filter(Boolean)
 ingredients = [...new Set(ingredients)].slice(0,40)
 steps = [...new Set(steps)].slice(0,60)
 const title = clean(recipe?.name) || clean($('h1').first().text())
 const canonicalRaw = $('link[rel="canonical"]').attr('href') || pageUrl
 const canonicalUrl = normalizeUrl(new URL(canonicalRaw,pageUrl).toString())
 if (!sameSite(canonicalUrl,pageUrl)) throw new Error('Canonical URL points outside the allowlisted publisher')
 if (!title || ingredients.length < 3 || steps.length < 2) throw new Error(`No reliable recipe structure (${ingredients.length} ingredients, ${steps.length} steps)`)
 const digest = createHash('sha256').update([title,...ingredients,...steps].join('\n')).digest('hex')
 return {title,canonicalUrl,ingredients,steps,contentHash:digest,extraction:recipe?'recipe-json-ld':'recipe-markup'}
}

const startedAt = new Date().toISOString()
const sources = []
for (const publisher of publishers) {
 let candidates=[]
 try { candidates=await discover(publisher); console.log(`discovered ${candidates.length} candidates from ${publisher.publisher}`) }
 catch(error) { console.error(`discovery failed for ${publisher.publisher}: ${error.message}`); continue }
 for (const [index,url] of candidates.entries()) {
  const previous=previousByUrl.get(url)
  if(previous && Date.parse(previous.fetchedAt)>=freshAfter){sources.push(previous);console.log(`  ${index+1}/${candidates.length} reused: ${previous.title||url}`);continue}
  if (index) await wait(650)
  const fetchedAt = new Date().toISOString()
  try {
   const page = await fetchText(url)
   const recipe = extractRecipe(page.text,page.url)
   sources.push({...recipe,id:`${publisher.id}-${recipe.contentHash.slice(0,12)}`,publisher:publisher.publisher,requestedUrl:url,fetchedAt,status:'ok',httpStatus:page.status})
   console.log(`  ${index+1}/${candidates.length} kept: ${recipe.title}`)
  } catch(error) {
   sources.push({id:`${publisher.id}-${createHash('sha256').update(url).digest('hex').slice(0,12)}`,publisher:publisher.publisher,requestedUrl:url,fetchedAt,status:'skipped',error:error instanceof Error?error.message:String(error)})
   console.log(`  ${index+1}/${candidates.length} skipped: ${url}`)
  }
 }
}
const usable=sources.filter(source=>source.status==='ok')
await mkdir(dirname(outFile),{recursive:true})
await writeFile(outFile,JSON.stringify({version:1,startedAt,finishedAt:new Date().toISOString(),userAgent,notice:'Structured recipe evidence for moderation. Nothing is published automatically.',sources},null,2)+'\n')
console.log(`\n${usable.length}/${sources.length} candidates have usable structured recipe data → ${outFile}`)
if (!usable.length) process.exitCode=1
