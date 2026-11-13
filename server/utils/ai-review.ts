import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { GuideContent } from '../../shared/guide'

export const aiReviewModel = 'claude-opus-5-5'
export const aiChecks = ['copied', 'internal_note', 'vague', 'sources', 'junk'] as const

const verdictSchema = z.object({
  verdict: z.enum(['looks_ready', 'needs_changes', 'reject']),
  summary: z.string(),
  flags: z.array(z.object({
    check: z.enum(aiChecks),
    detail: z.string(),
    quote: z.string(),
  })),
})

export type AiReview =
  | ({ status: 'done'; model: string; checkedAt: string } & z.infer<typeof verdictSchema>)
  | { status: 'failed'; error: string; checkedAt: string }

const system = `You help moderators of a Nigerian how-to guide site (recipes, government processes, culture, everyday life) decide whether a community submission is ready to publish. A human moderator makes the final call; you give a second opinion.

Run exactly these checks and raise a flag only when the problem is real:
- copied: steps, tips or summary copied word for word or near word for word from a supplied source page, or prose that reads as lifted from a blog or recipe site rather than written for this guide. Light paraphrase of a short fact is fine.
- internal_note: notes meant for moderators, importers or the author left in reader-facing text, e.g. "Review quantities before publishing", "TODO", "imported from", "check this", placeholder text.
- vague: a recipe missing ingredient quantities, times or heat levels; a process missing fees, offices, documents or order; steps too vague for a first-timer to follow.
- sources: factual claims (fees, laws, office addresses, deadlines, health claims) with no source, or sources that are weak, unrelated, broken or do not support the guide. Lived experience is acceptable for cultural and family practices.
- junk: spam, gibberish, test posts, advertising, or content off-topic for a Nigerian how-to guide site.

Verdict: "looks_ready" when no flag would stop publishing, "needs_changes" when the contributor should fix flagged issues, "reject" for junk or wholesale copying.
Summary: one plain sentence for the moderator. Each flag: the check, a short specific detail saying what to fix, and the exact offending text in quote (empty string if none). Do not flag style preferences.`

const sourceUrls = (sources: string[]) => [...new Set(sources.flatMap(s => s.match(/https?:\/\/[^\s)>\]]+/g) || []))].slice(0, 3)

const pageText = (html: string) => html
  .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim()

async function fetchSource(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { accept: 'text/html,text/plain' } })
    if (!res.ok) return `Source ${url} could not be opened (HTTP ${res.status}).`
    return `Source page ${url}:\n${pageText(await res.text()).slice(0, 15000)}`
  } catch {
    return `Source ${url} could not be opened.`
  }
}

function guideForReview(content: GuideContent) {
  const { stepDocuments, stepMediaIds, mediaIds, ...rest } = content
  return { ...rest, attachedImages: mediaIds.length }
}

export async function reviewGuide(apiKey: string, content: GuideContent): Promise<AiReview> {
  const pages = await Promise.all(sourceUrls(content.sources).map(fetchSource))
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 25_000 })
  const response = await client.messages.parse({
    model: aiReviewModel,
    max_tokens: 4000,
    // low effort keeps the check inside the Worker's waitUntil window
    output_config: { effort: 'low', format: zodOutputFormat(verdictSchema) },
    system,
    messages: [{ role: 'user', content: [
      ...pages.map(text => ({ type: 'text' as const, text })),
      { type: 'text' as const, text: `Submission to review:\n${JSON.stringify(guideForReview(content), null, 1)}` },
    ] }],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) return { status: 'failed', error: 'The AI check returned no verdict', checkedAt: new Date().toISOString() }
  return { status: 'done', model: aiReviewModel, checkedAt: new Date().toISOString(), ...response.parsed_output }
}

export async function runAiReview(env: Pick<Env, 'DB' | 'ANTHROPIC_API_KEY'>, submissionId: string, content: GuideContent) {
  let result: AiReview
  if (!env.ANTHROPIC_API_KEY) result = { status: 'failed', error: 'The AI check is not configured', checkedAt: new Date().toISOString() }
  else {
    try { result = await reviewGuide(env.ANTHROPIC_API_KEY, content) }
    catch (error) {
      console.error('AI review failed', submissionId, error instanceof Error ? error.message : error)
      result = { status: 'failed', error: 'The AI check could not run', checkedAt: new Date().toISOString() }
    }
  }
  await env.DB.prepare('UPDATE submission SET ai_review=? WHERE id=?').bind(JSON.stringify(result), submissionId).run()
  return result
}
