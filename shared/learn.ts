import { z } from 'zod'

export const languages = [
 { slug: 'yoruba', name: 'Yoruba', native: 'Yorùbá', blurb: 'Spoken across the South-West. Yoruba is tonal: listen to every phrase, the marks show the pitch.' },
 { slug: 'hausa', name: 'Hausa', native: 'Hausa', blurb: 'Spoken across the North and in markets far beyond it.' },
 { slug: 'igbo', name: 'Igbo', native: 'Igbo', blurb: 'Spoken across the South-East. Igbo is tonal: listen to every phrase, the marks show the pitch.' },
 { slug: 'pidgin', name: 'Nigerian Pidgin', native: 'Naijá', blurb: 'Understood almost everywhere in Nigeria, from the market to the office.' },
] as const
export const languageSlugs = languages.map(l => l.slug) as [string, ...string[]]
export const languageBySlug = (slug: string) => languages.find(l => l.slug === slug)

const line = (max: number) => z.string().trim().max(max)
export const phraseInput = z.object({
 text: line(300).min(1, 'Write every phrase'),
 meaning: line(300).min(1, 'Give every phrase an English meaning'),
 pronunciation: line(200).default(''),
 note: line(600).default(''),
 audioId: z.string({ error: 'Record every phrase before sending' }).uuid('Record every phrase before sending'),
}).strict()
export const lessonInput = z.object({
 language: z.enum(languageSlugs),
 title: line(140).min(1, 'Give the page a title'),
 summary: line(300).min(1, 'Say what the page covers'),
 phrases: z.array(phraseInput).min(1, 'Add at least one phrase').max(60),
 changeNote: line(600).default(''),
}).strict()
export type LessonContent = z.infer<typeof lessonInput>
export type Phrase = z.infer<typeof phraseInput>

// Admins and moderators review every language; everyone else only the languages they were given.
export function canReviewLanguage(role: string | null | undefined, assigned: string[], language: string) {
 if (role?.split(',').some(r => r === 'admin' || r === 'moderator')) return true
 return assigned.includes(language)
}
