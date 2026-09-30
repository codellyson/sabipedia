# wikihownaija

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

## Local setup

Requires Node 22+ and npm.

1. `npm install`
2. Create `.dev.vars` with `BETTER_AUTH_SECRET=<a random secret of at least 32 characters>` and `EMAIL_FROM=<a sender on a domain enabled in Cloudflare Email Sending>`. Local Email Sending is simulated by Wrangler unless the binding is explicitly configured for remote use. For the one-click local moderator login, also set `DEV_LOGIN_ENABLED=1` and `DEV_LOGIN_PASSWORD=<a separate random secret of at least 32 characters>`. Keep the file private. The example file lists the settings.
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

The production D1 database and R2 media bucket are bound in `wrangler.jsonc`. Set `BETTER_AUTH_URL` to the public HTTPS origin, set `EMAIL_FROM` to a sender on a domain enabled in Cloudflare Email Sending, and add `BETTER_AUTH_SECRET` with Wrangler's secret command. Apply migrations with `wrangler d1 migrations apply DB --remote` before the first deployment.

## Current limits

The first slice does not include a self-service moderator onboarding UI, photo captions, source URLs as distinct fields, or the 30–50 launch guides. The guide structure, revision rules and moderation path are in place to add these next.
