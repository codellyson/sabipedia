import { environment, requireUser } from '../../utils/auth'
import { guideInput } from '../../../shared/guide'
import { z } from 'zod'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'submit')
 const body=z.object({content:guideInput,guideId:z.string().optional(),baseVersionId:z.string().optional()}).strict().safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:body.error.issues[0]?.message || 'Check the guide fields'})
 const {content,guideId,baseVersionId}=body.data,db=environment(event).DB
 if(guideId){ const guide=await db.prepare('SELECT current_version_id FROM guide WHERE id=?').bind(guideId).first<{current_version_id:string}>(); if(!guide || guide.current_version_id!==baseVersionId) throw createError({statusCode:409,statusMessage:'This guide changed. Reload it before submitting a correction'}) }
 for(const mediaId of content.mediaIds){const owned=await db.prepare(`SELECT id FROM media WHERE id=? AND (owner_id=? OR EXISTS(SELECT 1 FROM guide_version v,json_each(v.content,'$.mediaIds') j WHERE v.id=? AND v.guide_id=? AND j.value=media.id))`).bind(mediaId,user.id,baseVersionId||'',guideId||'').first();if(!owned)throw createError({statusCode:403,statusMessage:'An attached file is not yours'})}
 const id=crypto.randomUUID()
 await db.prepare('INSERT INTO submission(id,guide_id,base_version_id,author_id,content) VALUES(?,?,?,?,?)').bind(id,guideId||null,baseVersionId||null,user.id,JSON.stringify(content)).run()
 return {id}
})
