---
name: write-newsletter-issue
description: Use when writing, scheduling or sending a newsletter issue (apps/web/content/newsletter), or testing how an issue renders as email.
---

# Write a newsletter issue

Background: `apps/web/src/features/newsletter/AGENTS.md`; schema in `apps/web/src/features/newsletter/schema.ts`.
Model: `apps/web/content/newsletter/2026/system-design-digest-0.mdx`.

1. **File:** `apps/web/content/newsletter/<yyyy>/<slug>.mdx`, kebab-case slug; the year folder is the issue year.

2. **Frontmatter:** `title`, `issue` (the next number; no gaps), `date` (quoted `"YYYY-MM-DD"`), `summary`
   (≤ 200 chars; it is what RSS, search and the email preview show), `format` (`deep-dive` or `digest`), `tags` and
   `series` (keys from `apps/web/content/newsletter/catalog.yaml`), `level`, `cover` (`{ motif, palette, seed }`),
   `takeaways` (3–5 one-liners for a deep dive), `related` (site paths for "Go deeper"), optional `share.hook`,
   `status` (`draft` → `scheduled` → `sent`), `access` (`free` default), `audience` (`all` or `pro`). `scheduled`
   needs `sendAt` with a time zone, e.g. `2026-11-14T09:00:00Z`, plus `issue` and `cover`.

3. **Plain Markdown only.** No JSX components: the same file renders to the web page and the email. Links are site
   paths (made absolute for email).
   - Figures: add the asset with `npm run asset:new -w web -- diagrams/svg/newsletter/<slug>/<figure>` (sidecar
     needs `alt` and `caption`), then `![What it shows](asset:diagrams/svg/newsletter/<slug>/<figure>)`. A build-up
     figure marks its layers `<g data-step="1">` … and is shown one step at a time with `#step=<n>`.
   - Callouts: `> [!NOTE]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!TIP]` on the first line of a quote.
   - Good: `![The agent loop](asset:diagrams/svg/newsletter/harness-engineering/agent-loop#step=2)`
   - Bad: `<Figure id="…" />`, an SVG URL, or a `> [!DANGER]` callout

4. **Summaries, never bodies, in feeds.** Don't change RSS or search to include the body, even for free issues.

5. **Premium issues** (`access: premium`) sent to `audience: all` carry only the summary and a link; full text goes
   by email only to `audience: pro`.

6. **Sending is the owner's step.** `.github/workflows/newsletter-send.yml` runs
   `src/features/newsletter/send/send-issue.ts`: `--dry-run` writes an .eml under `apps/web/.build/mail` (safe for
   agents), `--mode test` sends to the founder, `--mode broadcast` needs `status: scheduled` and the owner's
   Resend keys. After a broadcast, a follow-up PR sets `status: sent`.
   - Bad: an agent running a broadcast, or setting `status: sent` before it went out

7. **Verify:** `npm run content-check -w web` (errors block; format warnings show what a deep dive still lacks); `npm run dev` → `/newsletter/<slug>` (drafts show a `noindex` review
   page outside production); a `--dry-run` render to check the email.
