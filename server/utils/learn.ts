import type { H3Event } from 'h3'
import { canReviewLanguage, type LessonContent } from '../../shared/learn'
import { environment, requireUser } from './auth'

export async function assignedLanguages(db: D1Database, userId: string) {
 const rows = await db.prepare('SELECT language FROM language_reviewer WHERE user_id=?').bind(userId).all<{ language: string }>()
 return rows.results.map(r => r.language)
}

// Language reviewers are often plain contributors, so check their languages instead of the guide 'review' permission.
export async function requireLanguageReviewer(event: H3Event, language?: string) {
 const user = await requireUser(event, 'submit'), db = environment(event).DB
 const assigned = await assignedLanguages(db, user.id)
 const isEditor = canReviewLanguage(user.role, [], '_')
 if (language ? !canReviewLanguage(user.role, assigned, language) : !isEditor && !assigned.length) throw createError({ statusCode: 403, statusMessage: 'You do not review this language' })
 return { user, assigned, isEditor }
}

export type LessonRow = { id: string; slug: string; language: string; version_id: string; number: number; content: string; created_at: string; author: string; reviewer: string | null }
export const lessonSelect = `SELECT l.id,l.slug,l.language,v.id version_id,v.number,v.content,v.created_at,u.name author,r.name reviewer
 FROM lesson l JOIN lesson_version v ON v.id=l.current_version_id JOIN user u ON u.id=v.author_id LEFT JOIN user r ON r.id=v.published_by`
export const presentLesson = (row: LessonRow) => ({ ...row, content: JSON.parse(row.content) as LessonContent })
