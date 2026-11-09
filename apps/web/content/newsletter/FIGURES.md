# Newsletter figures: the style guide

Every issue explains its idea in pictures first. Readers should be able to follow an issue from its figures alone,
and every figure should still make sense as a screenshot or a LinkedIn slide. This guide comes from what the best
visual newsletters do: one big self-explaining picture per idea (ByteByteGo), pictures that build up step by step
(Maarten Grootendorst's visual guides) and numbered figures whose captions say what to notice (Sebastian Raschka).

Reference figures: Issue #1, `apps/web/design/newsletter-figures/harness-engineering.ts`.

## Rules

1. **One idea per figure.** Use at most 7 boxes. If you need more, split the figure or build it up in steps.
2. **Every figure stands alone.** Put the title (and an optional one-line subtitle) inside the figure, so a
   screenshot still explains itself.
3. **Readable on a phone.** The canvas is 1080 wide. Labels are 28–32 px, nothing is under 24 px (a test checks
   this), and a box label is at most two or three words.
4. **Square or portrait.** Use 1080×1080 to 1080×1350, so a figure fits a phone screen, a 600 px email and a 4:5
   LinkedIn slide without resizing. Never use wide 16:9.
5. **Build up hard ideas.** Put each new part on its own `step(n, …)` layer and show the figure in the issue with
   `#step=1` … `#step=n`. Earlier steps fade, later ones hide, and `stepOnly(n, …)` holds the caption that explains
   step n. Use 3–5 steps.
6. **Colour means something, and always the same thing:**

   | Role     | Means                                         |
   | -------- | --------------------------------------------- |
   | `accent` | the thing this figure is about (from the cover) |
   | `ink`    | structure: boxes, labels                       |
   | `muted`  | arrows, secondary text                         |
   | `ok`     | checked, verified, success                     |
   | `risk`   | failure, danger, a trap                        |

7. **One icon vocabulary.** Use the kit's `ICONS`: context, tools, sandbox, memory, verify, guardrails, observe,
   human, model, act and loop. Add a new icon to the kit instead of drawing it inline in one figure.
8. **Captions say what to notice, not what is drawn.** `alt` describes the picture for screen readers. `caption`
   is the one sentence to remember. `slide` is the line under the figure on the LinkedIn carousel.

## Making a figure

1. Add or edit the issue's module in `apps/web/design/newsletter-figures/<issue>.ts`. Compose figures from
   `apps/web/design/newsletter-figures/kit.ts`: `figure`, `box`, `core`, `arrow`, `badge`, `icon`, `text`, `step`
   and `stepOnly`. Give the issue an `Accent` taken from its cover palette. Register the module in
   `apps/web/design/newsletter-figures/build.ts`.
2. Run `npm run figures:newsletter -w web -- <issue>`. It writes
   `apps/web/assets/diagrams/svg/newsletter/<issue>/<figure>.svg` and its sidecar. Commit both, and never edit
   them by hand: `tests/unit/newsletter-figures.test.ts` fails when the files and the code disagree.
3. Use the figure in the issue: `![What it shows](asset:diagrams/svg/newsletter/<issue>/<figure>)`, or
   `…#step=2` for one step of a build-up figure.
4. Run `npm run assets -w web`. Then check the page in light and dark mode, and check the PNG (the email and
   carousel image) in `.build-cache/assets/<hash>/`.

## How the colours work

Each SVG carries its own `<style>` with role classes (`nlf-f-ink`, `nlf-s-accent`, …). The light colours are
`var()` fallbacks, so PNG renderers draw the light version. The same style block redefines the variables under
`.dark`, so figures inlined on the site follow the theme. On the page, `globals.css` swaps in the site font. Hand-made
SVG, Excalidraw and Mermaid figures also work in issues, but they don't follow this theming; prefer the kit.
