import { languageBySlug } from '../../../../shared/learn'
import { environment } from '../../../utils/auth'
import { lessonSelect, presentLesson, type LessonRow } from '../../../utils/learn'
export default defineEventHandler(async event => {
 const language = getRouterParam(event, 'language')!
 if (!languageBySlug(language)) throw createError({ statusCode: 404, statusMessage: 'Language not found' })
 const rows = await environment(event).DB.prepare(lessonSelect + ' WHERE l.language=? ORDER BY l.created_at').bind(language).all<LessonRow>()
 return rows.results.map(presentLesson).map(l => ({ slug: l.slug, title: l.content.title, summary: l.content.summary, phrases: l.content.phrases.length }))
})
