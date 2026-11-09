# Excalidraw libraries (drafting only)

Shape libraries used to sketch case-study and pattern diagrams in [Excalidraw](https://excalidraw.com) before they are
turned into animated diagram specs in `apps/web/assets/diagrams/animated/<group>/<name>.ts` (with a `<name>.meta.yaml`
sidecar; the engine that renders them lives in `apps/web/src/components/diagrams/`). Open Excalidraw, then
**Library → Open** and pick a file from this folder.

These files are not loaded by the website. The site draws its own icons (`apps/web/src/components/diagrams/glyphs.tsx`)
in the same spirit: a cylinder for a database, stacked layers for a cache, a segmented tube for a log or queue. A sketch
made here is a reference for layout only; the published diagram is always redrawn in the engine, never exported from
Excalidraw.

## Sources and licence

All five come from the public [excalidraw-libraries](https://github.com/excalidraw/excalidraw-libraries) repository,
which is published under the **MIT License** (Copyright (c) 2020 Excalidraw). Keep this README with the files so the
attribution travels with them.

| File                                            | Library                         | Author              |
| ----------------------------------------------- | ------------------------------- | ------------------- |
| `software-architecture.excalidrawlib`           | Software Architecture           | Youri Tjang         |
| `drwnio.excalidrawlib`                          | Software Logos                  | drwnio.polyrand.net |
| `architecture-diagram-components.excalidrawlib` | Architecture diagram components | Anna Pastushko      |
| `db-eng.excalidrawlib`                          | Database                        | Stefan Oehrli       |
| `technology-logos.excalidrawlib`                | Technology Logos                | Matthias Haeussler  |

## Product logos

`technology-logos`, `drwnio` and `architecture-diagram-components` contain drawings of product logos (Kafka, Docker,
Kubernetes, Slack, GitHub, and so on). The MIT licence covers the drawings, not the trademarks. Use them only to name the
technology in a diagram, never as our own branding, and do not change them in a way that misrepresents the product.
