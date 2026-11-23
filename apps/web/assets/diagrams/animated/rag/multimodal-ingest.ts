import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ARTICLES, RAG_TONE, vector } from "@/components/diagrams/presets/rag";

// Multimodal ingestion: one help-centre page that holds text, a table and a screenshot becomes typed pieces, and the
// screenshot can be indexed three ways. The page is "Recover two-factor access" (ARTICLES.twoFactor), the article the
// main question needs; its screenshot shows the sign-in screen with a "Use a backup code" link.
//
// Steps: 1 the page as published · 2 the parser splits it by type (a text chunk, one row per table row with its header,
// an image element that keeps its heading and alt text) · 3 way 1, a vision model writes a caption that is embedded
// as text · 4 way 2, OCR reads the words on the screen into the keyword index · 5 way 3, an image embedder turns the
// picture itself into one vector in a space shared with text (see shared-embedding-space).
//
// Layout: three columns. Page x 16-246 · parsed elements x 276-466 · methods x 530-658 and their outputs x 672-868.
// Page blocks and parsed elements share their y, so those arrows are horizontal. The three image arrows leave the
// image element along one trunk at x 498. The image vector is drawn as eight pink cells (a sketch of 1,536 numbers).
// Tones (four plus neutral): content blue, the vision model green, OCR words teal (keyword index), the image
// embedding pink; OCR itself is a neutral tool.

const PAGE = { x: 16, w: 230 } as const;
const EL = { x: 276, w: 190 } as const;
const TRUNK = 498;
const METHOD = { x: 530, w: 128 } as const;
const OUT = { x: 672, w: 196 } as const;
const ROW_Y = [72, 172, 272] as const;
const ROW_H = 56;

const page = (id: string, y: number, h: number, label: string, fill: LayoutShape["fill"] = "paper"): LayoutShape => ({
  id: `p-${id}`,
  type: "box",
  x: PAGE.x,
  y,
  w: PAGE.w,
  h,
  label,
  tone: RAG_TONE.text,
  fill,
});

const element = (id: string, y: number, h: number, label: string, sub?: string): LayoutShape => ({
  id: `e-${id}`,
  type: "box",
  x: EL.x,
  y,
  w: EL.w,
  h,
  label,
  sub,
  tone: RAG_TONE.text,
  fill: "pastel",
  step: 2,
});

const arrow = (id: string, from: string, to: string, step: number, via?: [number, number][]): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  via,
  step,
});

/** One way to index the image: a method box, its output and the arrows into and out of the method. */
function way(
  i: number,
  step: number,
  method: { label: string; sub: string; tone: LayoutShape["tone"]; fill: LayoutShape["fill"] },
  output: LayoutShape[]
): LayoutShape[] {
  const y = ROW_Y[i];
  return [
    {
      id: `m-${i}`,
      type: "box",
      x: METHOD.x,
      y,
      w: METHOD.w,
      h: ROW_H,
      label: method.label,
      sub: method.sub,
      tone: method.tone,
      fill: method.fill,
      step,
    },
    arrow(`a-img-${i}`, "e-image", `m-${i}`, step, [
      [TRUNK, IMAGE_Y],
      [TRUNK, y + ROW_H / 2],
    ]),
    ...output,
  ];
}

const IMAGE = { y: 262, h: 72 } as const;
const IMAGE_Y = IMAGE.y + IMAGE.h / 2;

const shapes: LayoutShape[] = [
  // Step 1: the page as published.
  page("title", 52, 30, ARTICLES.twoFactor),
  page("text", 92, 56, "If you lost your phone, use a\nbackup code to sign in."),
  page("table", 158, 94, "Option | How long\nBackup code | 2 minutes\nID check | 2 days"),
  page("shot", IMAGE.y, IMAGE.h, "Screenshot: sign-in screen\nEmail · Password\n[ Use a backup code ]", "soft"),

  // Step 2: the parser splits the page by type.
  element("text", 52, 96, "Text chunk", "title kept as context"),
  element("row1", 174, 36, "Backup code: 2 minutes"),
  element("row2", 216, 36, "ID check: 2 days"),
  element("image", IMAGE.y, IMAGE.h, "Image", "+ heading, alt text"),
  arrow("a-title", "p-title", "e-text", 2),
  arrow("a-text", "p-text", "e-text", 2),
  arrow("a-row1", "p-table", "e-row1", 2),
  arrow("a-row2", "p-table", "e-row2", 2),
  arrow("a-image", "p-shot", "e-image", 2),
  {
    id: "rows-note",
    type: "text",
    x: EL.x,
    y: 152,
    w: EL.w,
    h: 18,
    label: "each row keeps its header",
    tone: RAG_TONE.infra,
    step: 2,
  },

  // Step 3: a vision model writes a caption, embedded as text.
  ...way(0, 3, { label: "Vision model", sub: "writes a caption", tone: RAG_TONE.answer, fill: "pastel" }, [
    {
      id: "o-0",
      type: "box",
      x: OUT.x,
      y: ROW_Y[0],
      w: OUT.w,
      h: ROW_H,
      label: "\"Sign-in screen with a\n'Use a backup code' link\"",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 3,
    },
    arrow("a-o-0", "m-0", "o-0", 3),
  ]),

  // Step 4: OCR reads the words on the screen into the keyword index.
  ...way(1, 4, { label: "OCR", sub: "reads the words", tone: RAG_TONE.infra, fill: "soft" }, [
    {
      id: "o-1",
      type: "cell",
      x: OUT.x,
      y: ROW_Y[1],
      w: OUT.w,
      h: ROW_H,
      label: "Sign in · Email · Password\nUse a backup code",
      tone: RAG_TONE.keyword,
      step: 4,
    },
    arrow("a-o-1", "m-1", "o-1", 4),
  ]),

  // Step 5: an image embedder turns the picture into one vector.
  ...way(2, 5, { label: "Image embedder", sub: "picture → vector", tone: RAG_TONE.embedding, fill: "pastel" }, [
    ...vector("o-2", OUT.x + 42, ROW_Y[2] + 12, 8, RAG_TONE.embedding, { cell: 14, step: 5 }),
    {
      id: "o-2-note",
      type: "text",
      x: OUT.x,
      y: ROW_Y[2] + 30,
      w: OUT.w,
      h: 20,
      label: "one vector, shared space",
      tone: RAG_TONE.infra,
      step: 5,
    },
    { id: "a-o-2", type: "arrow", x: METHOD.x + METHOD.w, y: ROW_Y[2] + 19, w: 50, h: 0, step: 5 },
  ]),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Multimodal ingestion: one page becomes text, table rows and an image",
  width: 880,
  height: 360,
  steps: [
    { title: "One help-centre page: text, a table and a screenshot" },
    { title: "The parser splits the page by type" },
    { title: "Way 1: a vision model writes a caption" },
    { title: "Way 2: OCR reads the words on the screen" },
    { title: "Way 3: embed the picture itself" },
  ],
  groups: [
    { id: "g-page", title: "Help-centre page", tone: RAG_TONE.infra, x: 8, y: 24, w: 246, h: 322 },
    { id: "g-parsed", title: "Parsed elements", tone: RAG_TONE.infra, x: 268, y: 24, w: 206, h: 322 },
    { id: "g-image", title: "Three ways to index the image", tone: RAG_TONE.infra, x: 516, y: 24, w: 360, h: 322 },
  ],
  shapes,
};

export default spec;
