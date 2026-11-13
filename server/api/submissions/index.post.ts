import { environment, requireUser } from '../../utils/auth'
import { guideInput } from '../../../shared/guide'
import { z } from 'zod'
import { submitGuide } from '../../utils/submit-guide'
export default defineEventHandler(async event => {
 const user=await requireUser(event,'submit')
 const body=z.object({content:guideInput,guideId:z.string().optional(),baseVersionId:z.string().optional()}).strict().safeParse(await readBody(event))
 if(!body.success) throw createError({statusCode:400,statusMessage:body.error.issues[0]?.message || 'Check the guide fields'})
 const result=await submitGuide(environment(event),user.id,body.data,task=>event.waitUntil(task))
 return {id:result.id}
})
