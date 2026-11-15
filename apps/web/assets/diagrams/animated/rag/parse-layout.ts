import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ARTICLES, RAG_TONE } from "@/components/diagrams/presets/rag";

// Document processing: one help article as HTML becomes typed elements with metadata. Left, the page as a browser
// draws it: a menu, the title, a heading, a paragraph, a numbered list, a table and a footer. Step 2 drops the menu
// and footer (boilerplate that would otherwise be embedded into every chunk). Step 3 maps what is left to typed
// elements (title, heading, paragraph, list, table) and attaches metadata (teal) that later filters and citations
// use. Lists and tables are kept whole so a chunker cannot cut a step or a row in half.
//
// Rows share their y with the matching page block, so every arrow is horizontal. Tones (three): content blue,
// metadata teal, boilerplate neutral.

const PAGE_X = 36;
const PAGE_W = 296;
const EL_X = 440;
const EL_W = 214;
const META_X = 664;
const META_W = 176;

const ROWS: {
  id: string;
  y: number;
  h: number;
  page: string;
  type?: string;
  sub?: string;
  meta?: string;
  boiler?: boolean;
}[] = [
  { id: "nav", y: 50, h: 30, page: "Menu · Orders · Help · Sign in", boiler: true },
  {
    id: "title",
    y: 92,
    h: 34,
    page: ARTICLES.twoFactor,
    type: "Title",
    sub: ARTICLES.twoFactor,
    meta: "URL, updated date",
  },
  {
    id: "h2",
    y: 136,
    h: 32,
    page: "If you lost your phone",
    type: "Heading",
    sub: "starts section 2",
    meta: "section 2",
  },
  {
    id: "para",
    y: 178,
    h: 44,
    page: "Use a backup code to sign in,\nthen set up your new phone.",
    type: "Paragraph",
    sub: "two sentences",
    meta: "section 2",
  },
  {
    id: "list",
    y: 232,
    h: 50,
    page: "1. Open the sign-in page\n2. Choose 'Use a backup code'",
    type: "List",
    sub: "2 steps, kept whole",
    meta: "section 2",
  },
  {
    id: "table",
    y: 292,
    h: 36,
    page: "Table: option | how long",
    type: "Table",
    sub: "rows keep their header",
    meta: "section 3",
  },
  { id: "foot", y: 338, h: 30, page: "© Brightpost · Cookies · Jobs", boiler: true },
];

const shapes: LayoutShape[] = ROWS.flatMap((r): LayoutShape[] => {
  const page: LayoutShape = {
    id: `p-${r.id}`,
    type: "box",
    x: PAGE_X,
    y: r.y,
    w: PAGE_W,
    h: r.h,
    label: r.page,
    tone: r.boiler ? RAG_TONE.infra : RAG_TONE.text,
    fill: r.boiler ? "soft" : "paper",
  };
  if (r.boiler) {
    return [
      page,
      {
        id: `d-${r.id}`,
        type: "text",
        x: 346,
        y: r.y + r.h / 2 - 10,
        w: 76,
        h: 20,
        label: "dropped",
        tone: RAG_TONE.infra,
        step: 2,
      },
    ];
  }
  return [
    page,
    {
      id: `e-${r.id}`,
      type: "box",
      x: EL_X,
      y: r.y,
      w: EL_W,
      h: r.h,
      label: r.type,
      sub: r.sub,
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 3,
    },
    {
      id: `m-${r.id}`,
      type: "cell",
      x: META_X,
      y: r.y,
      w: META_W,
      h: r.h,
      label: r.meta,
      tone: RAG_TONE.keyword,
      step: 3,
    },
    { id: `a-${r.id}`, type: "arrow", x: 0, y: 0, from: `p-${r.id}`, to: `e-${r.id}`, step: 3 },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Parsing a help article into typed elements",
  width: 860,
  height: 390,
  steps: [
    { title: "The help article as HTML" },
    { title: "Menus and footers are dropped" },
    { title: "What is left becomes typed elements with metadata" },
  ],
  groups: [
    { id: "page", title: "HTML page", tone: RAG_TONE.infra, x: 20, y: 28, w: 328, h: 352 },
    { id: "parsed", title: "Elements + metadata", tone: RAG_TONE.infra, x: 428, y: 28, w: 424, h: 352 },
  ],
  shapes,
};

export default spec;
