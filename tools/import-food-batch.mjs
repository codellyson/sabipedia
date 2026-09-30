import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { guideInput } from '../shared/guide.ts'

if (process.argv.length > 2) throw new Error('Use npm run db:import-food-batch without arguments; this import is local only.')
const root=dirname(dirname(fileURLToPath(import.meta.url)))
const report=JSON.parse(await readFile(new URL('../.cache/food-batch-scrape.json',import.meta.url),'utf8').catch(()=>{throw new Error('No batch food scrape found. Run npm run scrape:food:batch first.')}))
const freshAfter=Date.now()-30*24*60*60*1000
const allRecipes=report.sources.filter(source=>source.status==='ok'&&Date.parse(source.fetchedAt)>=freshAfter)
const promotionalHealthClaim=/belly fat|weight loss|blood pressure|fight inflammation|no diet|no exercise/i
const recipes=allRecipes.filter(source=>!promotionalHealthClaim.test(source.title))
const excluded=allRecipes.filter(source=>promotionalHealthClaim.test(source.title))
if(!recipes.length) throw new Error('No fresh structured food recipes to import.')
const quote=value=>"'"+String(value).replaceAll("'","''")+"'"
const stamp=new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/,'')
const sql=[`INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,role) VALUES ('food-batch-researcher','Batch Nigerian food research','food-batch@demo.invalid',0,${quote(stamp)},${quote(stamp)},'contributor') ON CONFLICT DO NOTHING;`]
for(const recipe of excluded) sql.push(`DELETE FROM submission WHERE id=${quote(`food-batch-${recipe.contentHash.slice(0,20)}`)} AND state='awaiting_review';`)

function dishName(name){
 let dish=name
  .replace(/^how\s+to\s+(?:make|cook|prepare)\s+/i,'')
  .replace(/\s+recipe\s+for\s+.*$/i,'')
  .replace(/\s+(?:recipe|recipes)\s*$/i,'')
  .replace(/\s+\(video\)\s*$/i,'')
  .replace(/\s+to\s+(?:fight|help|lower|reduce)\b.*$/i,'')
  .replace(/\s+[-–—|:]\s+.*$/,'')
  .trim()
 if (dish === dish.toUpperCase()) dish=dish.charAt(0)+dish.slice(1).toLowerCase()
 return dish
}
function makeContent(recipe){
 const dish=dishName(recipe.title)
 return guideInput.parse({
  title:`How to make ${dish}`.slice(0,180),
  summary:`Prepare ${dish} using the ingredients and method collected from ${recipe.publisher}. Review quantities and cooking times against the linked source before publishing.`.slice(0,600),
  category:'Food & Cooking',community:'Nigerian home cooks',location:'Nigeria',experiencedAt:'',
  requirements:recipe.ingredients,steps:recipe.steps,tips:[],warnings:[],variations:[],
  sources:[`${recipe.publisher} — ${recipe.title}: ${recipe.canonicalUrl} (checked ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Lagos'}).format(new Date(recipe.fetchedAt))})`],
  mediaIds:[],changeNote:`Batch source-backed recipe candidate. Scrape evidence: ${recipe.contentHash.slice(0,12)}. Requires moderator review.`
 })
}
let imported=0
for(const recipe of recipes){
 try{
  const content=makeContent(recipe)
  const id=`food-batch-${recipe.contentHash.slice(0,20)}`
  sql.push(`INSERT INTO submission (id,author_id,content,state,created_at) VALUES (${quote(id)},'food-batch-researcher',${quote(JSON.stringify(content))},'awaiting_review',${quote(stamp)}) ON CONFLICT(id) DO UPDATE SET content=excluded.content WHERE submission.state='awaiting_review';`)
  imported++
 }catch(error){console.warn(`Skipping ${recipe.title}: ${error instanceof Error?error.message:String(error)}`)}
}
sql.push(`DELETE FROM submission
WHERE state='awaiting_review' AND id LIKE 'food-batch-%'
AND EXISTS (
 SELECT 1 FROM submission curated
 WHERE curated.id NOT LIKE 'food-batch-%'
 AND lower(json_extract(curated.content,'$.title'))=lower(json_extract(submission.content,'$.title'))
);`)
sql.push(`DELETE FROM submission
WHERE state='awaiting_review' AND id LIKE 'food-batch-%'
AND EXISTS (
 SELECT 1 FROM submission earlier
 WHERE earlier.state='awaiting_review' AND earlier.id LIKE 'food-batch-%'
 AND lower(json_extract(earlier.content,'$.title'))=lower(json_extract(submission.content,'$.title'))
 AND earlier.id<submission.id
);`)
if(!imported) throw new Error('The structured recipes did not pass guide validation.')
const temp=await mkdtemp(join(tmpdir(),'knowledge-bank-food-batch-'))
try{
 const file=join(temp,'food-batch.sql');await writeFile(file,sql.join('\n')+'\n')
 const result=spawnSync(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'d1','execute','DB','--local','--file',file,'--yes'],{cwd:root,stdio:'inherit'})
 if(result.error) throw result.error
 if(result.status!==0) process.exitCode=result.status||1
 else console.log(`Recorded ${imported} structured food guide candidate(s) in the local moderator queue.`)
}finally{await rm(temp,{recursive:true,force:true})}
