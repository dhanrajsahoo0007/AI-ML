import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The storage-class ladder (cloud/data/object-storage; reusable on the three provider storage pages): four rungs
// of object storage, from hot to archive, over the same five rows. Each cell gives the shape of that rung, never a
// price: what it costs to keep a gigabyte, the fee to read one back, how soon the first byte arrives, the minimum
// stay you are billed for, and how often the data should be read for the rung to pay off.
//
// Steps 1 to 4 add one rung each, so the reader watches keeping get cheaper while reading gets dearer and slower.
// The arrow under the rungs arrives with step 2, once there are two rungs to compare. Step 5 adds a row with the
// Brightpost data that lives on each rung (thumbnails, originals, order exports, audit logs), highlighted.
//
// Geometry: row labels are text in x 12-172. Rungs start at x 180, 332, 484, 636 and are 146 wide with a gap of 6,
// so the last one ends at 782 (canvas 790). Headers are boxes at y 28-74. Rows start at y 84 and are 48 apart
// (cells 44 tall), so the five rows end at 320. The Brightpost row is y 334-390; the arrow sits at y 418.
// Cell labels fit 146 - 8 = 138 px at 6.2 px per character: "Hours, on most clouds" (21 characters) is the longest.

const RUNGS = [
  { id: "hot", x: 180, label: "Hot", sub: "standard class", tone: "orange" },
  { id: "cool", x: 332, label: "Cool", sub: "infrequent access", tone: "teal" },
  { id: "cold", x: 484, label: "Cold", sub: "rare access", tone: "blue" },
  { id: "archive", x: 636, label: "Archive", sub: "kept for years", tone: "violet" },
] as const;

const ROWS = [
  { id: "keep", label: "Cost to keep a GB", cells: ["Highest", "Lower", "Lower still", "Lowest"] },
  { id: "read", label: "Fee to read a GB back", cells: ["None", "Small", "Larger", "Largest"] },
  {
    id: "first",
    label: "First byte arrives in",
    cells: ["Milliseconds", "Milliseconds", "Milliseconds", "Hours, on most clouds"],
  },
  { id: "min", label: "Minimum stay billed", cells: ["None", "About 30 days", "About 90 days", "180 days or more"] },
  {
    id: "fits",
    label: "Pays off if read",
    cells: ["Every day", "About monthly", "About quarterly", "Under once a year"],
  },
] as const;

const BRIGHTPOST = [
  { label: "Thumbnails", sub: "read all day" },
  { label: "Originals", sub: "after 30 days" },
  { label: "Order exports", sub: "after 90 days" },
  { label: "Audit logs", sub: "after 1 year" },
] as const;

const ROW_Y = (i: number) => 84 + i * 48;

const shapes: LayoutShape[] = [
  { id: "rung-head", type: "text", x: 12, y: 40, w: 160, h: 22, label: "Rung", tone: "neutral" },
  ...ROWS.map((r, i): LayoutShape => ({
    id: `row-${r.id}`,
    type: "text",
    x: 12,
    y: ROW_Y(i),
    w: 160,
    h: 44,
    label: r.label,
    tone: "neutral",
  })),
  ...RUNGS.flatMap((g, gi): LayoutShape[] => {
    const step = gi + 1;
    return [
      { id: `head-${g.id}`, type: "box", x: g.x, y: 28, w: 146, h: 46, label: g.label, sub: g.sub, tone: g.tone, step },
      ...ROWS.map((r, ri): LayoutShape => ({
        id: `${g.id}-${r.id}`,
        type: "cell",
        x: g.x,
        y: ROW_Y(ri),
        w: 146,
        h: 44,
        label: r.cells[gi],
        tone: g.tone,
        step,
      })),
    ];
  }),

  // Step 2: the direction of the ladder, once there are two rungs to compare.
  {
    id: "colder",
    type: "arrow",
    x: 180,
    y: 418,
    w: 602,
    h: 0,
    label: "Colder: cheaper to keep, slower and dearer to read",
    tone: "blue",
    step: 2,
  },

  // Step 5: where Brightpost's data sits on the ladder.
  { id: "row-bp", type: "text", x: 12, y: 334, w: 160, h: 56, label: "Brightpost keeps here", tone: "teal", step: 5 },
  ...RUNGS.map((g, gi): LayoutShape => ({
    id: `bp-${g.id}`,
    type: "box",
    x: g.x,
    y: 334,
    w: 146,
    h: 56,
    label: BRIGHTPOST[gi].label,
    sub: BRIGHTPOST[gi].sub,
    tone: g.tone,
    step: 5,
    highlight: true,
  })),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The storage-class ladder: cheaper to keep, dearer to read",
  width: 790,
  height: 440,
  steps: [
    { title: "Hot: read any time, no fee to read" },
    { title: "Cool: cheaper to keep, a fee to read" },
    { title: "Cold: cheaper again, a longer minimum stay" },
    { title: "Archive: cheapest to keep, slow to read" },
    { title: "Where Brightpost keeps each kind of data" },
  ],
  shapes,
};

export default spec;
