import { environment } from '../../utils/auth'
import { guideSelect, present, type GuideRow } from '../../utils/guides'
export default defineEventHandler(async event => {
 const query=getQuery(event), q=String(query.q||'').slice(0,200), category=String(query.category||''), community=String(query.community||''), location=String(query.location||'')
 const result=await environment(event).DB.prepare(guideSelect+` WHERE (?='' OR json_extract(v.content,'$.title') LIKE ? OR json_extract(v.content,'$.summary') LIKE ?) AND (?='' OR json_extract(v.content,'$.category')=?) AND (?='' OR json_extract(v.content,'$.community') LIKE ?) AND (?='' OR json_extract(v.content,'$.location') LIKE ?) ORDER BY v.created_at DESC LIMIT 100`)
 .bind(q,'%'+q+'%','%'+q+'%',category,category,community,'%'+community+'%',location,'%'+location+'%').all<GuideRow>()
 return result.results.map(present)
})
