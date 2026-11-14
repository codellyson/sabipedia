import { environment } from '../../../utils/auth'
import { lessonSelect, presentLesson, type LessonRow } from '../../../utils/learn'
export default defineEventHandler(async event => {
 const row = await environment(event).DB.prepare(lessonSelect + ' WHERE l.language=? AND l.slug=?').bind(getRouterParam(event, 'language'), getRouterParam(event, 'slug')).first<LessonRow>()
 if (!row) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
 return presentLesson(row)
})
