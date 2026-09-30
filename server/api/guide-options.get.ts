import { environment } from '../utils/auth'
export default defineEventHandler(async event => {
 const rows = await environment(event).DB.prepare(`
  SELECT 'community' kind, trim(json_extract(v.content,'$.community')) value
  FROM guide g JOIN guide_version v ON v.id=g.current_version_id
  UNION ALL
  SELECT 'location' kind, trim(json_extract(v.content,'$.location')) value
  FROM guide g JOIN guide_version v ON v.id=g.current_version_id
 `).all<{kind:'community'|'location';value:string|null}>()
 const unique = (kind:'community'|'location') => {
  const values = new Map<string,string>()
  for (const row of rows.results) {
   if (row.kind!==kind || !row.value) continue
   const key=row.value.toLocaleLowerCase('en-NG')
   if (!values.has(key)) values.set(key,row.value)
  }
  return [...values.values()].sort((a,b)=>a.localeCompare(b,'en-NG'))
 }
 return {communities:unique('community'),locations:unique('location')}
})
