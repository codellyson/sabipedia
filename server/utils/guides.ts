import type { GuideContent } from '../../shared/guide'
export type GuideRow = {id:string;slug:string;version_id:string;number:number;content:string;created_at:string;author:string; confirmations:number;local_confirmations:number;disputes:number}
export const guideSelect = `SELECT g.id,g.slug,v.id version_id,v.number,v.content,v.created_at,u.name author,
 (SELECT count(*) FROM confirmation c WHERE c.version_id=v.id AND c.user_id<>v.author_id AND c.reason<>'Other') confirmations,
 (SELECT count(*) FROM confirmation c WHERE c.version_id=v.id AND c.user_id<>v.author_id AND c.reason<>'Other' AND
 ((trim(c.community)<>'' AND lower(trim(c.community))=lower(trim(json_extract(v.content,'$.community')))) OR
 (trim(c.location)<>'' AND lower(trim(c.location))=lower(trim(json_extract(v.content,'$.location')))))) local_confirmations,
 (SELECT count(*) FROM dispute d WHERE d.guide_id=g.id AND d.status='open') disputes
 FROM guide g JOIN guide_version v ON v.id=g.current_version_id JOIN user u ON u.id=v.author_id`
export function present(row: GuideRow) {
 const content = JSON.parse(row.content) as GuideContent
 return {...row,content,verified:row.confirmations>=3 && (!content.community && !content.location || row.local_confirmations>=1) && row.disputes===0}
}
