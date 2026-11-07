---
name: add-article
description: Use when adding or outlining an article or hub in a docs section (GenAI & LLM Systems, Classic System Design, Cloud, ML System Design) under apps/web/content.
---

# Add an article to a docs section

Background: `apps/web/content/AGENTS.md` and `apps/web/src/features/docs/AGENTS.md`.

1. **Put the file in the right place.** Article: `apps/web/content/<section>/<hub>/<slug>.mdx`, kebab-case slug,
   inside an existing hub folder. The URL is `/<section>/<hub>/<slug>`.
   - Good: `apps/web/content/system-design/patterns/back-pressure.mdx`
   - Bad: "apps/web/content/system-design/BackPressure.mdx" (no hub, not kebab-case)

2. **Write valid frontmatter** (strict schema in `apps/web/src/features/sections/schema.ts`): `title`, and a
   `description` of one plain sentence ≤ 160 characters. Optional `icon` (a key in `apps/web/src/lib/icons.ts`),
   `status`, `access`, `order`.
   - Good: `description: "How a busy system pushes back on callers instead of falling over."`
   - Bad: `description: "In this article we will explore..."` (filler) or an unknown key such as `author:`

3. **Make three edits, not one.** The MDX file, a `<ModelCard>` in the hub MDX (`<section>/<hub>.mdx`), and the same
   card (`title`, `href`, `icon`, `description`, `status`) in `apps/web/content/<section>/_index.yaml`.
   content-check fails when the hub grid and the nav index disagree.

4. **Outlines are explicit.** A planned page gets `status: outline` in the frontmatter, `status="outline"` on its
   card, and the "Outline." callout as its body. Never publish a page with placeholder text and no status.

5. **Don't decide access.** Leave `access` unset unless the owner chose this article as free (`access: free`).
   Hubs and outlines are free automatically.

6. **Media by ID only.** Reuse or add assets (`.claude/skills/add-asset/SKILL.md`) and reference them with
   `<Img id>`, `<Figure id>`, `<Mermaid ref>`. Inline ```` ```mermaid ```` fences are fine for one-off diagrams.
   - Bad: a Markdown image pointing at /images/x.png, or any file in `apps/web/public/`

7. **Interview questions need mapping.** If the article has `<InterviewQuestion>` blocks and its section has
   `questions: true`, add `/<section>/<hub>/<slug>: <category>/<subsection>` to
   `apps/web/content/question-bank/articles.yaml` (slugs from `apps/web/content/question-bank/taxonomy.yaml`).

8. **Links resolve.** Internal links are site paths (`/system-design/databases/b-trees`), never full URLs to our own
   site.

9. **Verify:** `npm run content-check -w web` (no errors; fix new warnings), then `npm run dev` and open the page;
   for a final check `APP_ENV=production npm run build`.
