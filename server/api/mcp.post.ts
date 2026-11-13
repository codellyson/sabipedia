import { requireMcpAuth } from '@better-auth/mcp'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { categories } from '../../shared/guide'
import { authFor, environment } from '../utils/auth'
import { submitGuide } from '../utils/submit-guide'
import { mcpResourceUrl } from '../utils/mcp-resource'

const item = z.string().trim().min(1).max(4000)
const inputSchema = z.object({
  title: item.max(180).describe('Action-focused title for one procedure'),
  summary: item.max(600).describe('What the reader will learn'),
  category: z.enum(categories),
  community: z.string().trim().max(120).default(''),
  location: z.string().trim().max(120).default(''),
  experiencedAt: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).default(''),
  requirements: z.array(item).max(40).default([]),
  steps: z.array(item).min(1).max(60).describe('Ordered, actionable instructions'),
  tips: z.array(item).max(30).default([]),
  warnings: z.array(item).max(30).default([]),
  sources: z.array(item).max(30).default([]).describe('Real sources or a person, book, office, or firsthand basis; never invent references'),
  variations: z.array(item).max(30).default([]),
  changeNote: z.string().trim().max(600).default(''),
}).strict()

export default defineEventHandler(async event => {
  const env = environment(event)
  const auth = authFor(event)
  const resource = mcpResourceUrl(env)
  const guarded = requireMcpAuth(auth, async (request, claims) => {
    const userId = claims.sub
    if (!userId) return new Response('User identity is missing', { status: 403 })
    const user = await env.DB.prepare('SELECT id,banned,emailVerified FROM user WHERE id=?').bind(userId).first<{ id: string; banned: number | null; emailVerified: number }>()
    if (!user || user.banned || (env.EMAIL_VERIFICATION_REQUIRED === '1' && !user.emailVerified)) return new Response('This account cannot submit guides', { status: 403 })
    const permission = await auth.api.userHasPermission({ body: { userId, permissions: { guide: ['submit'] } } })
    if (!permission.success) return new Response('This account cannot submit guides', { status: 403 })

    const handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'wikihownaija', version: '1.0.0' })
      server.registerTool('submission_criteria', {
        description: 'Read the acceptance criteria before drafting a WikiHowNaija guide.',
        inputSchema: z.object({}),
      }, async () => ({ content: [{ type: 'text', text: JSON.stringify({
        topic: 'One practical Nigerian procedure that the contributor knows or can substantiate.',
        format: 'Use a concise action title, clear summary, one supported category, and ordered actionable steps. Include requirements, location, community, date, tips, warnings, and variations when relevant.',
        evidence: 'Use real, attributable sources or accurately describe firsthand knowledge. Do not invent sources, experiences, dates, or facts. Ask the user when essential facts are missing.',
        review: 'Every submission is attributed to the authorized user and goes to the moderator queue. It is not published automatically.',
      }) }] }))
      server.registerTool('submit_guide', {
        description: 'Submit a complete guide as the authorized WikiHowNaija user for moderator review. Follow submission_criteria. Only submit facts and firsthand experience the user has confirmed; do not invent sources or personal experience. This tool never publishes.',
        inputSchema,
      }, async input => {
        try {
          const result = await submitGuide(env, userId, { content: { ...input, mediaIds: [] } }, task => event.waitUntil(task))
          return { content: [{ type: 'text', text: JSON.stringify({ ...result, message: 'Submitted for moderator review', submissionsUrl: new URL('/my-guides', env.BETTER_AUTH_URL).toString() }) }] }
        } catch (error) {
          return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Could not submit this guide' }] }
        }
      })
      return server
    }, { legacy: 'reject' })
    return handler.fetch(request)
  }, { resource, requiredScopes: ['guide:submit'] })
  return sendWebResponse(event, await guarded(toWebRequest(event)))
})
