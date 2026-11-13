# Sabipedia

A structured, community-maintained library of Nigerian practical procedures. This is a separate project from Passalong. The product requirements are in the Passalong guide `h3h42u4a`.

## Implemented first slice

- Public browse, search, category, community and location filters, and structured guide pages.
- Better Auth email/password sign-in on D1 with contributor, moderator and admin permissions.
- Guided contribution flow with device-local draft recovery, numbered step cards, a reader preview, and Nuxt UI form controls and its Tiptap (ProseMirror) editor for step formatting. Rich text is stored as validated JSON and rendered as escaped Vue nodes; existing plain-text revisions remain supported.
- Structured guide submissions and corrections; moderator review publishes immutable revisions.
- Per-revision confirmations with a unique user constraint. A guide is community verified at three independent confirmations, one matching relevant community/location when specified, and no open major dispute. The guide author cannot confirm their own revision. “Other” confirmations are recorded but do not count toward verification without a basis for assessing relevant knowledge.
- Flag and resolve major disputes. Revision history preserves past confirmation totals and gives moderators access to full old revisions.
- Authenticated R2 image/audio uploads. Files are exposed publicly only when referenced by a published guide version; draft media is limited to its contributor and editors.
- Email/password account recovery through Cloudflare Email Sending, with one-hour reset links and session revocation after a password change.
- A remote MCP endpoint for signed-in contributors. OAuth consent grants only `guide:submit`; the tools explain the submission criteria and send validated guides to the normal moderator queue.

## Local setup

Requires Node 22+ and npm.

1. `npm install`
2. Create `.dev.vars` with `BETTER_AUTH_SECRET=<a random secret of at least 32 characters>` and `EMAIL_FROM=<an address on a domain enabled in Cloudflare Email Sending>`. `EMAIL_VERIFICATION_REQUIRED=1` can be enabled after existing accounts have verified their addresses. The `EMAIL` binding uses the remote service in local preview, so local password-reset and verification requests send real mail; keep the local `BETTER_AUTH_URL` and `MCP_RESOURCE_URL` ports aligned with the preview port. For the one-click local moderator login, also set `DEV_LOGIN_ENABLED=1` and `DEV_LOGIN_PASSWORD=<a separate random secret of at least 32 characters>`. Keep the file private. The example file lists the settings.
3. `npm run db:migrate` applies Better Auth and product tables to local D1.
4. `npm run db:seed` optionally adds 12 demo guides across all six categories, illustrative confirmations, revision history, one open dispute and two moderator review submissions. This command always targets local D1 and preserves existing data when rerun. Demo contributors have no login credentials; use the dev moderator login to explore review.
   Run `npm run db:clear-demo` to remove those demo guides, their attached submissions and feedback, and the demo accounts while preserving official-source submissions, community evidence, and real accounts.
5. `npm run scrape` fetches the allowlisted official pages in `tools/source-registry.json`, checks `robots.txt`, extracts useful headings and text, and records retrieval time and a content hash in the ignored `.cache/official-source-scrape.json`. Failed or protected sources are reported explicitly.
6. `npm run scrape:community` fetches only the public Nairaland threads allowlisted in `tools/community-source-registry.json`. It checks `robots.txt`, waits between threads, removes quoted replies, redacts phone numbers, email addresses, handles and outbound links, writes its evidence cache, then records successful threads in local D1 as research evidence. These unverified reports can inform future guides but do not appear in the publishing queue and are never treated as official evidence or published automatically. Use `npm run db:import-community` to re-import an existing fresh cache without fetching again.
7. `npm run db:preseed` adds source-backed government-process starters with successful official scrape evidence from the last 30 days to the local moderator queue. The starters are paraphrased from official NIMC, NIS, CAC, FRSC, NRS, INEC, JAMB and NPC pages, carry their source URLs and check date, and have no confirmations. Re-running preserves existing submissions and review decisions.
8. `npm run scrape:food` fetches the five allowlisted Nigerian recipe pages in `tools/food-source-registry.json`, respects `robots.txt`, records canonical URLs, retrieval times and content hashes, then puts five paraphrased recipe guides in the local moderator queue. Every candidate names and links its publisher under **Sources**. Use `npm run db:import-food` to re-import an existing fresh cache without fetching again.
   For a larger collection, `npm run scrape:food:batch` discovers up to 20 pages per approved publisher from public sitemaps. Only pages with reliable structured ingredients and instructions enter the local moderation queue; weak pages are logged as skipped. Use `npm run db:import-food-batch` to re-import the fresh batch cache without another crawl.
9. `npm run build`
10. `npm run preview` starts the local Worker at `http://localhost:8788` with local D1 and R2 bindings.

Nuxt's ordinary `dev` command does not provide the same binding-backed integration as the Worker preview; use `preview` for authentication, D1 and R2 flows.

New accounts get the contributor role. The local sign-in page has a one-click **Continue as dev moderator** button when those dev-only settings are present. It works only on the configured localhost origin. To bootstrap a moderator manually instead, create an account through the UI and then run `npx wrangler d1 execute DB --local --command "UPDATE user SET role='moderator' WHERE email='you@example.com'"`. This is a local-only administrative bootstrap step.

## Production setup

The production D1 database and R2 media bucket are bound in `wrangler.jsonc`. Set `BETTER_AUTH_URL` to the canonical public HTTPS origin, and use `AUTH_ALLOWED_ORIGINS` for any additional HTTPS origins that may submit API requests. Set `EMAIL_FROM` to a bare address on a domain enabled in Cloudflare Email Sending, and add `BETTER_AUTH_SECRET` with Wrangler's secret command. Set `EMAIL_VERIFICATION_REQUIRED=1` only after existing accounts have verified their addresses. For bot protection, set `TURNSTILE_SITE_KEY`, store `TURNSTILE_SECRET` with Wrangler, and set `TURNSTILE_HOSTNAMES` to the comma-separated production hostnames. Add those hostnames to the Turnstile widget's Hostname Management as well. Never include localhost in the production allow-lists. For the AI second opinion on new submissions, store `ANTHROPIC_API_KEY` with `wrangler secret put ANTHROPIC_API_KEY`; without it, submissions still go through and the review page says the check is not configured. Apply migrations with `wrangler d1 migrations apply DB --remote` before the first deployment.

### Search indexing

The canonical public origin is defined in `shared/seo.ts`. Update it and the sitemap URL in `public/robots.txt` if the public domain changes. The dynamic `/sitemap.xml` lists the home page and currently published guide versions from D1. Published guides include article structured data and social previews. Editorial, contribution, and account pages have `noindex` metadata. After deployment, submit `https://wikihownaija.kreativekorna.com/sitemap.xml` in your search engine webmaster tools.

### Guide videos

After a guide is published, a moderator can open it and choose **Generate video draft**. The browser records a short, silent, captioned summary from the approved title, summary, selected steps, and step photos. Keep the tab open during generation. The draft is saved in R2 and is visible only to moderators. A moderator watches it, confirms it matches the guide, and approves or rejects it. An approved video appears above the guide steps. When a new guide revision is published, the old video is hidden from readers and the editor sees a prompt to generate a new draft. Run `npm run db:migrate` locally, or apply D1 migrations remotely before deploying the feature.

## MCP guide submissions

Connect an MCP client that supports the 2026-07-28 protocol and OAuth dynamic client registration to `https://wikihownaija.kreativekorna.com/api/mcp`. The client opens Sabipedia sign-in and consent. A user grants only `guide:submit`, and may deny the request. The consent page shows the client's declared name, ID, and callback URL. `MCP_RESOURCE_URL` must match the public MCP endpoint exactly; it can differ from the Better Auth issuer at `BETTER_AUTH_URL`.

The `submission_criteria` tool explains the editorial rules. `submit_guide` accepts one practical procedure with a clear title, summary, category, ordered steps, and relevant context or evidence. It uses the same `guideInput` validation and submission service as the website. The tool cannot upload files or publish guides. Each accepted call creates a submission attributed to the authorized user in `awaiting_review`; moderators check accuracy and sources before publishing. Clients should ask the user for missing facts and never invent sources or firsthand experience.

`npm run db:seed-production` previews the official-process, named-recipe and batch recipe candidates that have successful source checks from the last 30 days. It excludes promotional health claims, sparse procedures and duplicate titles. `npm run db:seed-production -- --apply` imports eligible candidates into the production moderator queue. The import is idempotent and preserves existing submissions and review decisions. Batch recipe drafts need accuracy and wording review before publication. The source-check caches are local and ignored by Git; regenerate them with `npm run scrape`, `npm run scrape:food` and `npm run scrape:food:batch` when stale.

## Current limits

The first slice does not include a self-service moderator onboarding UI, photo captions, source URLs as distinct fields, or the 30–50 launch guides. The guide structure, revision rules and moderation path are in place to add these next.
