# assets/: the asset library

Every reusable image, diagram, logo and download, stored once and used by **ID** (plan §5.6). The ID is the path
under this folder without the extension, e.g. `<Img id="logos/companies/openai" />` or
`<AnimatedDiagram spec="animated/messenger/aws" />`. Built by `apps/web/scripts/build-assets.ts` before every build.

````
LICENSES.yaml                         third-party sources: licence, attribution, trademark notice
remote.yaml                           files too big for git (> 5 MB), kept in R2 (not used yet)
brand/                                logo, favicon source, social avatar (always public)
images/<topic>/<slug>.{png,jpg,webp,avif,gif}   ≤ 1 MB → AVIF + WebP at 480/960/1600 + blur placeholder
diagrams/mermaid/<topic>/<slug>.mmd   → light + dark SVG (same pipeline as ```mermaid fences) + PNG
diagrams/excalidraw/<topic>/<slug>.excalidraw   → light + dark SVG + PNG
diagrams/animated/<topic>/<slug>.ts   AnimatedDiagram specs (export default a DiagramSpec)
diagrams/svg/<topic>/<slug>.svg       static SVG, ≤ 200 KB → optimised, inlined + PNG
logos/companies/<slug>.svg            → src/lib/company-logos.ts (generated)
logos/tech/<vendor>/<slug>.svg        → <TechIcon id="vendor/slug" />
icons/<slug>.svg                      custom icons beyond lucide
og/                                   Open Graph templates and backgrounds (always public)
downloads/<slug>.{pdf,zip,csv}        → <Download id="…" />
````

Names are kebab-case. Metadata goes in an optional sidecar next to the file, `<slug>.meta.yaml` (schema in
`apps/web/src/lib/asset-schema.ts`):

```yaml
title: Consistent hashing ring
alt: Ring of hash slots with three servers and keys mapped clockwise to the next server # required for images and diagrams
caption: Keys move only between neighbours when a node joins
tags: [hashing, partitioning, system-design] # `shared` = always public (emails, pricing, landing)
access: free # free | premium: premium files never go to public/
source: original # or a key from LICENSES.yaml (required for logos)
author: dhanraj
created: 2026-11-07
```

## Use

| MDX                                                    | Shows                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `<Img id="images/cloud/aws-console-vpc" />`            | raster (srcset, width/height, lazy) or inline SVG          |
| `<Figure id="diagrams/svg/system-design/cap" />`       | any image or diagram with its caption                      |
| `<Diagram id="excalidraw/system-design/ring" />`       | any diagram under `diagrams/`; light/dark follow the theme |
| `<Mermaid ref="system-design/write-ahead-log" />`      | the .mmd file of that ID under `diagrams/mermaid/`         |
| `<AnimatedDiagram spec="animated/messenger/aws" />`    | animated spec (the older `name` prop still works)          |
| `<TechIcon id="aws/lambda" />`                         | `logos/tech/<vendor>/<slug>.svg`, inline with text         |
| `<Download id="downloads/system-design-cheatsheet" />` | free: static file; premium: "Pro" placeholder for now      |

## Commands (from the repo root)

- `npm run asset:new -w web -- diagrams/mermaid/system-design/write-ahead-log` scaffolds the file and its sidecar
  (`--from <file>` copies an existing image, SVG or download in).
- `npm run asset:find -w web -- hashing` searches IDs, titles, tags and alt text, and prints the MDX to use.
- `npm run assets -w web` builds everything (also runs in `prebuild`): writes the asset manifest
  (src/generated/asset-manifest.json), renders into `.build-cache/assets/`, copies public files to `public/_a/<hash>/`
  and premium files to `.build/private-assets/`, and regenerates `apps/web/src/lib/company-logos.ts` and
  `apps/web/src/components/diagrams/animated-specs.ts`.
- `npm run content-check -w web` validates the library: IDs exist, alt text, licences, size limits, duplicate files,
  no premium asset on a free page, generated files up to date; unused assets are warnings.

## Rules and gotchas

- **Never paste media into `apps/web/public/`** and never hand-edit the generated files above; content-check fails
  when they are stale.
- Only free assets used by a page that is visible in the build's environment (`APP_ENV`, section registry), plus
  `brand/`, `og/` and assets tagged `shared`, are copied to `public/_a/`. The build fails if anything else lands
  there. Assets of hidden or off sections never ship publicly.
- **Premium assets** (`access: premium`) never reach `public/`; for now they render a Pro placeholder linking to
  `/pricing`. A gated `/api/assets/*` route comes with the paywall.
- Every image and diagram needs `alt`. Third-party files need a `source:` key that exists in `LICENSES.yaml`
  (with attribution and trademark text when required); the attributions page is generated from it.
- Size limits: images ≤ 1 MB, SVG ≤ 200 KB; bigger files belong in `remote.yaml` (R2, not set up yet).
- SVG ids are made unique per diagram on build so inlined SVGs don't collide (gradient ids in logos did).
- **Mermaid number rounding:** rendered SVG geometry is rounded to 2 decimals by `roundNumbers()` in
  `apps/web/scripts/render-mermaid.svg.mjs`. Numbers in path data can touch ("1.004.5" means 1.004 then .5), so the
  rounder inserts a space where two rounded numbers would merge ("1 .5", not "1.5"). Keep that test
  (`apps/web/scripts/render-mermaid.svg.test.mjs`) when touching it; merged numbers silently distort diagrams.
- Chromium is launched only when a Mermaid or Excalidraw asset needs rendering; results are cached by content hash
  in `.build-cache/assets/`.
- Asset files are read with `fs` during render (build time). Nothing may re-render them at request time on Workers.

## Tests

`apps/web/tests/unit/assets/`, `apps/web/scripts/build-assets.render.test.mjs`,
`apps/web/scripts/render-mermaid.svg.test.mjs` (`npm run test:scripts -w web`); the leak suite
(`apps/web/tests/e2e/leak.spec.ts`) checks no premium asset is public.
