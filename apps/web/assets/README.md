# Asset library

Every reusable image, diagram, logo and download, stored once and used by **ID** (plan §5.6). The ID is the path
under this folder without the extension: `logos/companies/openai`, `diagrams/animated/messenger/aws`.

```
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
```

Names are kebab-case. Metadata goes in an optional sidecar next to the file, `<slug>.meta.yaml`:

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

| MDX                                                    | Shows                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `<Img id="images/cloud/aws-console-vpc" />`            | raster (srcset, width/height, lazy) or inline SVG           |
| `<Figure id="diagrams/svg/system-design/cap" />`       | any image or diagram with its caption                       |
| `<Diagram id="excalidraw/system-design/ring" />`       | any diagram under `diagrams/`; light/dark follow the theme  |
| `<Mermaid ref="system-design/write-ahead-log" />`      | `diagrams/mermaid/system-design/write-ahead-log.mmd`        |
| `<AnimatedDiagram spec="animated/messenger/aws" />`    | animated spec (`name="messenger/aws"` still works)          |
| `<TechIcon id="aws/lambda" />`                         | `logos/tech/aws/lambda.svg`, inline with text               |
| `<Download id="downloads/system-design-cheatsheet" />` | free: static file; premium: "Pro" placeholder for now       |

## Commands (from `apps/web`, or `-w web` from the root)

- `npm run asset:new -- diagrams/mermaid/system-design/write-ahead-log` scaffolds the file and its sidecar
  (`--from <file>` copies an existing image, SVG or download in).
- `npm run asset:find -- hashing` searches IDs, titles, tags and alt text, and prints the MDX to use.
- `npm run assets` builds everything (also runs before `npm run build`): writes `src/generated/asset-manifest.json`,
  renders into `.build-cache/assets/`, copies public files to `public/_a/<hash>/` and premium files to
  `.build/private-assets/`, and regenerates `src/lib/company-logos.ts` and `src/components/diagrams/animated-specs.ts`.
- `npm run content-check` validates the library: IDs exist, alt text, licences, size limits, duplicate files, no
  premium asset on a free page, generated files up to date; unused assets are warnings.

Only free assets used by a page that is visible in the build's environment (`APP_ENV`, section registry), plus
`brand/`, `og/` and assets tagged `shared`, are copied to `public/`.
