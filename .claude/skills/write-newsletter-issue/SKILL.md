---
name: write-newsletter-issue
description: Use when writing, scheduling or sending a newsletter issue (apps/web/content/newsletter), or testing how an issue renders as email.
---

# Write a newsletter issue

Background: `apps/web/src/features/newsletter/AGENTS.md`; schema in `apps/web/src/features/newsletter/schema.ts`.
Model: `apps/web/content/newsletter/2026/system-design-digest-0.mdx`.

1. **File:** `apps/web/content/newsletter/<yyyy>/<slug>.mdx`, kebab-case slug; the year folder is the issue year.

2. **Frontmatter:** `title`, `date` (quoted `"YYYY-MM-DD"`), `summary` (≤ 200 chars; it is what RSS, search and
   the email preview show), `status` (`draft` → `scheduled` → `sent`), `access` (`free` default), `audience`
   (`all` or `pro`). `scheduled` needs `sendAt` with a time zone, e.g. `2026-11-14T09:00:00Z`.

3. **Plain Markdown only.** No JSX components: the same file renders to the web page and the email. Links are site
   paths (made absolute for email). Images must be PNG.
   - Good: `![Write path](https://media.example/…/write-path.png)` from the asset pipeline's PNG variant
   - Bad: `<Figure id="…" />` or an SVG image

4. **Summaries, never bodies, in feeds.** Don't change RSS or search to include the body, even for free issues.

5. **Premium issues** (`access: premium`) sent to `audience: all` carry only the summary and a link; full text goes
   by email only to `audience: pro`.

6. **Sending is the owner's step.** `.github/workflows/newsletter-send.yml` runs
   `src/features/newsletter/send/send-issue.ts`: `--dry-run` writes an .eml under `apps/web/.build/mail` (safe for
   agents), `--mode test` sends to the founder, `--mode broadcast` needs `status: scheduled` and the owner's
   Resend keys. After a broadcast, a follow-up PR sets `status: sent`.
   - Bad: an agent running a broadcast, or setting `status: sent` before it went out

7. **Verify:** `npm run content-check -w web`; `npm run dev` → `/newsletter/<slug>` (drafts show a `noindex` review
   page outside production); a `--dry-run` render to check the email.
