---
name: write-newsletter-issue
description: Use when writing, scheduling or sending a newsletter issue (apps/web/content/newsletter), or testing how an issue renders as email.
---

# Write a newsletter issue

Background: `apps/web/src/features/newsletter/AGENTS.md`; schema in `apps/web/src/features/newsletter/schema.ts`.
Start from the template `apps/web/content/newsletter/_TEMPLATE.md` (a deep dive). Reference issue:
`apps/web/content/newsletter/2026/harness-engineering.mdx`; a digest: `apps/web/content/newsletter/2026/system-design-digest-0.mdx`.

1. **File:** copy the template to `apps/web/content/newsletter/<yyyy>/<slug>.mdx`, kebab-case slug; the year folder
   is the issue year. A new tag or series goes into `apps/web/content/newsletter/catalog.yaml` first; a series gets
   its page at `/newsletter/series/<key>` as soon as it has an issue.

2. **Frontmatter:** `title`, `issue` (the next number; no gaps), `date` (quoted `"YYYY-MM-DD"`), `summary`
   (≤ 200 chars; it is what RSS, search and the email preview show), `format` (`deep-dive` or `digest`), `tags` and
   `series` (keys from `apps/web/content/newsletter/catalog.yaml`), `level`, `cover` (`{ motif, palette, seed }`),
   `takeaways` (3–5 one-liners for a deep dive), `related` (site paths for "Go deeper"), optional `share.hook`,
   `status` (`draft` → `scheduled` → `sent`), `access` (`free` default), `audience` (`all` or `pro`). `scheduled`
   needs `sendAt` with a time zone, e.g. `2026-11-14T09:00:00Z`, plus `issue` and `cover`.

3. **Cover:** open `/newsletter/covers` on the dev server, pick the motif that suits the topic (harness-ring,
   feedback-loop, lattice, layers, constellation, waves, prism, streams, grid-bloom, orbit-pair), step the seed until
   a cover fits, and paste its `cover:` line. Check the link preview at `/newsletter/<slug>/opengraph-image` and the LinkedIn image at
   `/newsletter/<slug>/share/portrait.png`.

4. **Plain Markdown only.** No JSX components: the same file renders to the web page and the email. Links are site
   paths (made absolute for email).
   - Figures: add the asset with `npm run asset:new -w web -- diagrams/svg/newsletter/<slug>/<figure>` (sidecar
     needs `alt` and `caption`), then `![What it shows](asset:diagrams/svg/newsletter/<slug>/<figure>)`. A build-up
     figure (its layers carry `data-step`) goes in once as `#steps`: a step-through figure on the web, the complete
     figure in email. `#step=<n>` shows a single step.
   - Callouts: `> [!NOTE]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!TIP]` on the first line of a quote.
   - Good: `![The agent loop](asset:diagrams/svg/newsletter/harness-engineering/agent-loop#steps)`
   - Bad: `<Figure id="…" />`, an SVG URL, or a `> [!DANGER]` callout

5. **Summaries, never bodies, in feeds.** Don't change RSS or search to include the body, even for free issues.

6. **Premium issues** (`access: premium`) sent to `audience: all` carry only the summary and a link; full text goes
   by email only to `audience: pro`.

7. **Sending is the owner's step.** `.github/workflows/newsletter-send.yml` runs
   `src/features/newsletter/send/send-issue.ts`: `--dry-run` writes an .eml under `apps/web/.build/mail` (safe for
   agents), `--mode test` sends to the founder, `--mode broadcast` needs `status: scheduled` and the owner's
   Resend keys. After a broadcast, a follow-up PR sets `status: sent`.
   - Bad: an agent running a broadcast, or setting `status: sent` before it went out

8. **Verify:** `npm run content-check -w web` (errors block; format warnings show what a deep dive still lacks); `npm run dev` → `/newsletter/<slug>` (drafts show a `noindex` review
   page outside production); a `--dry-run` render to check the email.

9. **LinkedIn kit:** `npm run assets -w web`, then `npm run newsletter:kit -w web -- <slug>` writes
   `apps/web/.build/newsletter-kit/<slug>/`: `carousel.pdf` (cover, "In 30 seconds", one slide per figure, close),
   a PNG of every slide, `portrait.png`, `square.png`, `og.png` and `post.txt`. Give every figure a `slide:` line in its
   sidecar (the kit warns when one falls back to the caption) and keep the deck at 8–12 slides. Posting is the
   owner's step.
