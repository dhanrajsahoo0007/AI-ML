---
name: add-asset
description: Use when adding or reusing an image, diagram, logo, icon or download, or when an article needs media of any kind.
---

# Add or reuse an asset

Background: `apps/web/assets/AGENTS.md`.

1. **Search before adding.** `npm run asset:find -w web -- <words>` searches IDs, titles, tags and alt text and
   prints the MDX to paste. Reuse beats a near-duplicate (content-check flags identical files).

2. **Scaffold, don't hand-create.** `npm run asset:new -w web -- <id>` creates the file and its sidecar;
   `--from <file>` copies an existing file in. The ID is the path under `apps/web/assets/` without the extension.
   - Good: `npm run asset:new -w web -- diagrams/mermaid/system-design/write-ahead-log`
   - Bad: dropping `wal.png` into `apps/web/public/` or next to the MDX

3. **Fill the sidecar** `<slug>.meta.yaml`: `alt` is required for anything shown as an image; describe what it
   shows, not "diagram". Add `title`, `caption`, `tags`.
   - Good: `alt: Writes append to a log before the B-tree page is updated; replay rebuilds pages after a crash`
   - Bad: `alt: image`

4. **Record the licence.** Original work: `source: original`. Anything third-party: `source:` must be a key in
   `apps/web/assets/LICENSES.yaml`, with attribution and trademark text where the licence needs it. Unsure about a
   licence → don't add the file; ask the owner.

5. **Respect the limits:** kebab-case names; images ≤ 1 MB, SVG ≤ 200 KB; anything over 5 MB goes to `apps/web/assets/remote.yaml`
   (R2, needs the owner's account).

6. **Premium assets** get `access: premium`; they never reach `public/` and render a Pro placeholder for now. Never
   reference a premium asset from a free page (content-check error).

7. **Reference by ID in MDX:** `<Img id="…" />`, `<Figure id="…" />`, `<Diagram id="…" />`, `<Mermaid ref="…" />`,
   `<TechIcon id="vendor/slug" />`, `<Download id="…" />`.

8. **Verify:** `npm run assets -w web` (regenerates the manifest and generated files) and
   `npm run content-check -w web`. Commit any change to `apps/web/src/lib/company-logos.ts` or
   `apps/web/src/components/diagrams/animated-specs.ts`; never edit them by hand.
