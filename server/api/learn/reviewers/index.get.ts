import { environment, requireUser } from '../../../utils/auth'
export default defineEventHandler(async event => {
 const user = await requireUser(event, 'publish')
 if (!user.role?.split(',').includes('admin')) throw createError({ statusCode: 403, statusMessage: 'Only admins manage language reviewers' })
 const rows = await environment(event).DB.prepare('SELECT r.user_id,r.language,u.name,u.email FROM language_reviewer r JOIN user u ON u.id=r.user_id ORDER BY r.language,u.name').all()
 return rows.results
})
