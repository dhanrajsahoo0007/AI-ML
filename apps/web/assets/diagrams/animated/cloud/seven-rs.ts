import type { LayoutShape, LayoutSpec, Tone } from "@/components/diagrams/types";

// The seven Rs (cloud/operations/migration-and-modernization): one estate, the framing shop Brightpost bought, fans out
// into the seven things you can do with each application. Rows run from least work (top) to most work (bottom), so the
// picture reads as a ladder of effort and payoff. Each row has the strategy on the left and the framing shop's example
// on the right.
//
// Steps follow four questions. Step 1: keep or drop it (retire, retain). Step 2: move it as it is (rehost, relocate).
// Step 3: change the platform or the product (replatform, repurchase). Step 4: rebuild it (refactor), plus the note
// that says which way effort grows. Relocate is the one strategy Brightpost did not use, so its example is neutral.
//
// Geometry: the source box sits at x 16-166, level with the second group. Groups start at x 210 and end at 780.
// Strategy boxes are x 226-356 (130 wide); example boxes are x 368-768 (400 wide). Boxes are 48 tall and 60 apart
// inside a group; each group's first box sits 28 below the group's top, so the title tab and the step's NEW ring clear
// it, and groups are 16 apart. Box labels fit width - 8 at 6.2 px per character: example labels stay under 63
// characters and strategy labels under 20.

type Row = { id: string; r: string; rsub: string; ex: string; exsub: string; tone: Tone; exTone?: Tone };
type Group = { id: string; title: string; step: number; y: number; rows: Row[] };

const GROUPS: Group[] = [
  {
    id: "keep",
    title: "Keep or drop",
    step: 1,
    y: 20,
    rows: [
      {
        id: "retire",
        r: "Retire",
        rsub: "switch it off",
        ex: "Stock tracker: switched off",
        exsub: "nobody had signed in for 14 months",
        tone: "neutral",
      },
      {
        id: "retain",
        r: "Retain",
        rsub: "keep it where it is",
        ex: "Ticket PC: stays beside the workshop printer",
        exsub: "it now reads its orders from the cloud over the VPN",
        tone: "neutral",
      },
    ],
  },
  {
    id: "asis",
    title: "Move it as it is",
    step: 2,
    y: 184,
    rows: [
      {
        id: "rehost",
        r: "Rehost",
        rsub: "copy the server as is",
        ex: "Order app server: copied block by block",
        exsub: "same operating system, same code, a new address",
        tone: "teal",
      },
      {
        id: "relocate",
        r: "Relocate",
        rsub: "move VMware hosts as is",
        ex: "Both VMware hosts onto the provider's VMware service",
        exsub: "not chosen: built for dozens of VMs, not 6",
        tone: "teal",
        exTone: "neutral",
      },
    ],
  },
  {
    id: "change",
    title: "Change the platform or the product",
    step: 3,
    y: 348,
    rows: [
      {
        id: "replatform",
        r: "Replatform",
        rsub: "same app, managed parts",
        ex: "Order database: into a managed SQL Server engine",
        exsub: "same engine and data; backups and patches run for you",
        tone: "blue",
      },
      {
        id: "repurchase",
        r: "Repurchase",
        rsub: "buy a SaaS product",
        ex: "Accounting package: replaced by a rented SaaS tool",
        exsub: "the books exported once, the old server retired",
        tone: "blue",
      },
    ],
  },
  {
    id: "rebuild",
    title: "Rebuild it",
    step: 4,
    y: 512,
    rows: [
      {
        id: "refactor",
        r: "Refactor",
        rsub: "rewrite for the cloud",
        ex: "Price calculator: rebuilt as a small service",
        exsub: "in month 9, after the move, not during it",
        tone: "violet",
      },
    ],
  },
];

const shapes: LayoutShape[] = [
  {
    id: "src",
    type: "box",
    x: 16,
    y: 274,
    w: 150,
    h: 72,
    label: "Framing shop",
    sub: "6 servers, 1 old PC",
    tone: "orange",
  },
];

for (const g of GROUPS) {
  g.rows.forEach((row, i) => {
    const y = g.y + 28 + i * 60;
    shapes.push(
      { id: row.id, type: "box", x: 226, y, w: 130, h: 48, label: row.r, sub: row.rsub, tone: row.tone, step: g.step },
      {
        id: `${row.id}-ex`,
        type: "box",
        x: 368,
        y,
        w: 400,
        h: 48,
        label: row.ex,
        sub: row.exsub,
        tone: row.exTone ?? row.tone,
        step: g.step,
      },
      { id: `${row.id}-arrow`, type: "arrow", x: 0, y: 0, from: "src", to: row.id, tone: row.tone, step: g.step },
    );
  });
}

shapes.push({
  id: "effort",
  type: "text",
  x: 210,
  y: 612,
  w: 570,
  h: 20,
  label: "Top to bottom: more work now, more payoff later",
  tone: "neutral",
  step: 4,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The seven Rs, with the framing shop's example for each",
  width: 790,
  height: 640,
  groups: GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    tone: g.rows[0].tone,
    x: 210,
    y: g.y,
    w: 570,
    h: g.rows.length * 60 + 28,
  })),
  shapes,
  steps: [
    { title: "Keep or drop: retire, retain" },
    { title: "Move it as it is: rehost, relocate" },
    { title: "Change the platform or the product" },
    { title: "Rebuild it: refactor" },
  ],
};

export default spec;
