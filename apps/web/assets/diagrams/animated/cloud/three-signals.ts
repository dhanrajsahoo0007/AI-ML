import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// One slow Pay request from Brightpost's July incident (cloud/operations/observability-on-the-cloud) and the three
// signals it leaves behind. Left: the request, with its trace id. Then one row per signal: what the signal looks like,
// the store it lands in, and the question it answers. Step 1 adds the metric row, step 2 the log line, step 3 the span,
// and step 4 a note that the trace id is what joins the log line and the span.
//
// Geometry: header texts at y 8-28. Rows start at y 46 and are 92 apart (boxes 64 tall), so the third row ends at 290.
// Request box: x 20-160, the full height of the rows. Signal boxes: x 196-446. Store boxes: x 476-596.
// Question boxes: x 626-790 (wide enough for "What exactly happened?" in the rendered font). The note sits at y 304-324. Canvas 800 x 334.
// Label room: 6.2 px per character within width - 8, so a signal label fits about 40 characters and a question
// label about 22.

const ROWS = [
  {
    id: "metric",
    signal: "Metric: Pay time, 9.3 s",
    signalSub: "one more value in this minute's summary",
    tone: "blue",
    store: "Metrics store",
    question: "Is something wrong?",
    questionSub: "how much, since when",
  },
  {
    id: "log",
    signal: 'Log line: "A1 print file built"',
    signalSub: "time, level, service, trace id, order id",
    tone: "orange",
    store: "Log store",
    question: "What exactly happened?",
    questionSub: "to this one order",
  },
  {
    id: "span",
    signal: "Span: print service, 9.0 s",
    signalSub: "start, duration, parent span, trace id",
    tone: "green",
    store: "Trace store",
    question: "Where did the time go?",
    questionSub: "which service, which call",
  },
] as const;

const ROW_Y = (i: number) => 46 + i * 92;

const shapes: LayoutShape[] = [
  { id: "head-req", type: "text", x: 20, y: 8, w: 140, h: 20, label: "One request", tone: "neutral" },
  { id: "head-signal", type: "text", x: 196, y: 8, w: 250, h: 20, label: "The signal it leaves", tone: "neutral" },
  { id: "head-store", type: "text", x: 476, y: 8, w: 120, h: 20, label: "Lands in", tone: "neutral" },
  { id: "head-q", type: "text", x: 626, y: 8, w: 164, h: 20, label: "Answers", tone: "neutral" },
  {
    id: "req",
    type: "box",
    x: 20,
    y: 46,
    w: 140,
    h: 248,
    label: "One Pay request",
    sub: "trace id 4bf9",
    tone: "teal",
  },
  ...ROWS.flatMap((r, i): LayoutShape[] => [
    {
      id: `sig-${r.id}`,
      type: "box",
      x: 196,
      y: ROW_Y(i),
      w: 250,
      h: 64,
      label: r.signal,
      sub: r.signalSub,
      tone: r.tone,
      step: i + 1,
    },
    {
      id: `store-${r.id}`,
      type: "box",
      x: 476,
      y: ROW_Y(i),
      w: 120,
      h: 64,
      label: r.store,
      tone: "violet",
      step: i + 1,
    },
    {
      id: `q-${r.id}`,
      type: "box",
      x: 626,
      y: ROW_Y(i),
      w: 164,
      h: 64,
      label: r.question,
      sub: r.questionSub,
      tone: "neutral",
      step: i + 1,
    },
    {
      id: `to-sig-${r.id}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: "req",
      to: `sig-${r.id}`,
      tone: r.tone,
      packet: true,
      step: i + 1,
    },
    { id: `to-store-${r.id}`, type: "arrow", x: 0, y: 0, from: `sig-${r.id}`, to: `store-${r.id}`, step: i + 1 },
    {
      id: `to-q-${r.id}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `store-${r.id}`,
      to: `q-${r.id}`,
      dashed: true,
      step: i + 1,
    },
  ]),
  {
    id: "note",
    type: "text",
    x: 20,
    y: 304,
    w: 770,
    h: 20,
    label: "The trace id 4bf9 is written into the log line and onto the span, so one search finds both.",
    tone: "neutral",
    step: 4,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One request, three signals, three questions",
  width: 800,
  height: 334,
  steps: [
    { title: "The metric: is something wrong?" },
    { title: "The log line: what happened?" },
    { title: "The span: where did the time go?" },
    { title: "One id joins them" },
  ],
  shapes,
};

export default spec;
