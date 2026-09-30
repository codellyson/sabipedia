import type { GuideContent } from '~~/shared/guide'
import { environment, requireUser } from '../../../utils/auth'

type VersionRow = {id:string;guide_id:string;number:number;content:string;created_at:string;slug:string;author:string;published_by:string}
const present=(row:VersionRow)=>({...row,content:JSON.parse(row.content) as GuideContent})

export default defineEventHandler(async event => {
 await requireUser(event,'review')
 const db=environment(event).DB
 const revision=await db.prepare(`SELECT v.id,v.guide_id,v.number,v.content,v.created_at,g.slug,
  author.name author,publisher.name published_by
  FROM guide_version v JOIN guide g ON g.id=v.guide_id
  JOIN user author ON author.id=v.author_id JOIN user publisher ON publisher.id=v.published_by
  WHERE v.id=?`).bind(getRouterParam(event,'id')).first<VersionRow>()
 if(!revision) throw createError({statusCode:404,statusMessage:'Revision not found'})
 const previous=await db.prepare(`SELECT v.id,v.guide_id,v.number,v.content,v.created_at,g.slug,
  author.name author,publisher.name published_by
  FROM guide_version v JOIN guide g ON g.id=v.guide_id
  JOIN user author ON author.id=v.author_id JOIN user publisher ON publisher.id=v.published_by
  WHERE v.guide_id=? AND v.number<? ORDER BY v.number DESC LIMIT 1`).bind(revision.guide_id,revision.number).first<VersionRow>()
 return {revision:present(revision),previous:previous?present(previous):null}
})
