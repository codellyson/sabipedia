import type { GuideContent } from '~~/shared/guide'
import { environment, requireUser } from '../../../utils/auth'

type Row = {id:string;state:string;content:string;created_at:string;author:string;author_email:string;guide_id:string|null;base_version_id:string|null}

export default defineEventHandler(async event => {
 await requireUser(event,'review')
 const db=environment(event).DB
 const row=await db.prepare(`SELECT s.id,s.state,s.content,s.created_at,s.guide_id,s.base_version_id,u.name author,u.email author_email
  FROM submission s JOIN user u ON u.id=s.author_id WHERE s.id=?`).bind(getRouterParam(event,'id')).first<Row>()
 if(!row)throw createError({statusCode:404,statusMessage:'Submission not found'})
 const annotations=await db.prepare(`SELECT a.id,a.quote,a.note,a.start_offset,a.end_offset,a.created_at,u.name reviewer
  FROM review_annotation a JOIN user u ON u.id=a.reviewer_id WHERE a.submission_id=? ORDER BY a.created_at`).bind(row.id).all()
 return {...row,content:JSON.parse(row.content) as GuideContent,annotations:annotations.results}
})
