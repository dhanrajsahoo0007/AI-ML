import { describe, expect, it } from "vitest";
import { lintSpec } from "@/components/diagrams/spec-lint";
import type { DiagramSpec, LayoutSpec, SequenceSpec } from "@/components/diagrams/types";
import { layout, paperLayout, seq } from "./fixtures";

const base: DiagramSpec = {
  title: "Two nodes",
  width: 600,
  height: 200,
  zones: [],
  nodes: [
    { id: "a", label: "Client", x: 100, y: 100 },
    { id: "b", label: "Server", x: 400, y: 100, step: 2 },
  ],
  edges: [{ from: "a", to: "b" }],
  steps: [{ title: "One" }, { title: "Two" }],
};

const with_ = (patch: Partial<DiagramSpec>): DiagramSpec => ({ ...base, ...patch });

describe("lintSpec: architecture", () => {
  it("passes a clean spec", () => {
    expect(lintSpec(base)).toEqual([]);
  });

  it("flags edges to unknown nodes", () => {
    expect(lintSpec(with_({ edges: [{ from: "a", to: "zz" }] }))).toContain('edge a>zz: unknown node "zz"');
  });

  it("flags nodes outside the canvas and overlapping nodes", () => {
    const problems = lintSpec(
      with_({
        nodes: [
          { id: "a", label: "Client", x: 30, y: 100 },
          { id: "b", label: "Server", x: 80, y: 110, step: 2 },
        ],
      })
    );
    expect(problems).toContain('node "a" leaves the 600×200 canvas');
    expect(problems).toContain('nodes "a" and "b" overlap');
  });

  it("flags a step past the list, a gap in the steps and until before step", () => {
    const problems = lintSpec(
      with_({
        nodes: [
          { id: "a", label: "Client", x: 100, y: 100 },
          { id: "b", label: "Server", x: 400, y: 100, step: 3 },
        ],
        edges: [{ from: "a", to: "b", step: 3, until: 2 }],
        steps: [{ title: "One" }, { title: "Two" }, { title: "Three" }, { title: "Four" }],
      })
    );
    expect(problems).toContain("edge a>b: until 2 is before its step 3");
    expect(problems).toContain('step 4 ("Four") introduces nothing');
    expect(lintSpec(with_({ steps: undefined }))).toContain('node "b": step 2 but the spec has 0 steps');
  });

  it("flags labels too long for the node", () => {
    const problems = lintSpec(
      with_({
        nodes: [{ id: "a", label: "A very long service name", icon: "server", x: 100, y: 100 }],
        edges: [],
        steps: [],
      })
    );
    // 165.8 units of text after the icon, which starts it at x + 52: 116 - 52 - 2 leaves 62.
    expect(problems).toContain('node "a": label "A very long service name" is 104px wider than its 116px box');
  });

  it("measures labels with the text-width model: narrow letters fit where capitals and symbols do not", () => {
    // Same 16 characters, very different widths: "illicit" letters are narrow, capitals and "%" wide.
    const node = (id: string, label: string, x: number) => ({ id, label, icon: "server", x, y: 100, w: 160 });
    const problems = lintSpec(
      with_({
        nodes: [node("a", "fill illicit list", 100), node("b", "WARM MEMORY 100%", 300)],
        edges: [],
        steps: [],
      })
    );
    expect(problems).toEqual(['node "b": label "WARM MEMORY 100%" is 46px wider than its 160px box']);
  });

  it("starts text after the icon only when the icon draws, and checks the sub line", () => {
    const problems = lintSpec(
      with_({
        nodes: [
          // "no-such-icon" resolves to nothing, so the text is centred and has the full width.
          { id: "a", label: "Payment service", icon: "no-such-icon", x: 100, y: 100, w: 120 },
          { id: "b", label: "Payment service", icon: "server", x: 300, y: 100, w: 120 },
          { id: "c", label: "Store", sub: "receipts, refunds and disputes", x: 480, y: 100, w: 110 },
        ],
        edges: [],
        steps: [],
      })
    );
    expect(problems).toEqual([
      'node "b": label "Payment service" is 44px wider than its 120px box',
      'node "c": sub "receipts, refunds and disputes" is 60px wider than its 110px box',
    ]);
  });

  it("flags a zone title that runs past the zone", () => {
    const zone = (id: string, title: string, w: number) => ({
      id,
      title,
      tone: "blue" as const,
      x: 20,
      y: 40,
      w,
      h: 120,
    });
    const problems = lintSpec(
      with_({ zones: [zone("fits", "Machines and people", 176), zone("short", "Machines and people", 170)] })
    );
    // The tab starts 16 in and pads its text by 14: 30 + 144.5 = 174.5.
    expect(problems).toEqual(['zone "short": title "Machines and people" runs 5px past its 170px width']);
  });

  it("flags duplicate ids", () => {
    const problems = lintSpec(with_({ nodes: [...base.nodes, { id: "a", label: "Again", x: 250, y: 100 }] }));
    expect(problems).toContain('duplicate node id "a"');
  });

  it("accepts card fills and diagram-only tones, and flags a fill on a glyph or accent node", () => {
    const clean = with_({
      zones: [{ id: "z", title: "Embed", tone: "pink", x: 20, y: 40, w: 200, h: 120 }],
      nodes: [
        { id: "a", label: "Embed", tone: "pink", fill: "pastel", x: 100, y: 100 },
        { id: "b", label: "Rerank", tone: "lime", fill: "soft", x: 400, y: 100, step: 2 },
      ],
      edges: [{ from: "a", to: "b", tone: "pink" }],
    });
    expect(lintSpec(clean)).toEqual([]);
    const problems = lintSpec(
      with_({
        nodes: [
          { id: "a", label: "Index", variant: "glyph", icon: "database", fill: "pastel", x: 100, y: 100 },
          { id: "b", label: "Server", accent: true, fill: "soft", x: 400, y: 100, step: 2 },
        ],
      })
    );
    expect(problems).toContain('node "a": fill only applies to card nodes, not glyph nodes');
    expect(problems).toContain('node "b": fill does nothing on an accent node');
  });
});

describe("lintSpec: sequence", () => {
  it("passes the fixture", () => {
    expect(lintSpec(seq)).toEqual([]);
  });

  it("flags messages and notes on unknown lanes, and lanes too close together", () => {
    const bad: SequenceSpec = {
      ...seq,
      width: 300,
      messages: [{ from: "app", to: "nope" }],
      notes: [{ lane: "ghost", text: "?" }],
      steps: undefined,
    };
    const problems = lintSpec(bad);
    expect(problems).toContain('message 0 (app>nope): unknown lane "nope"');
    expect(problems).toContain('note 0 ("?"): unknown lane "ghost"');
    expect(problems.some((p) => p.startsWith("lanes are 87px apart"))).toBe(true);
  });

  it("flags a lane label wider than the largest header", () => {
    // Headers grow to 156 units; after an icon the text starts at +46, leaving 108 with 2 clear of the border.
    const lanes = [
      { id: "gw", label: "Socket gateway", icon: "server" },
      { id: "auth", label: "Authorization service", icon: "server" },
    ];
    expect(
      lintSpec({ ...seq, width: 700, lanes, messages: [{ from: "gw", to: "auth" }], notes: [], steps: undefined })
    ).toEqual(['lane "auth": label "Authorization service" is 33px wider than its header']);
  });
});

describe("lintSpec: layout", () => {
  it("passes the fixture", () => {
    expect(lintSpec(layout)).toEqual([]);
  });

  it("flags overlapping cells, shapes off the canvas and arrows to unknown shapes", () => {
    const bad: LayoutSpec = {
      ...layout,
      shapes: [
        { id: "c1", type: "cell", x: 0, y: 0 },
        { id: "c2", type: "cell", x: 20, y: 20 },
        { id: "far", type: "box", x: 500, y: 10 },
        { id: "arr", type: "arrow", x: 0, y: 0, from: "c1", to: "missing" },
        // Text and circles may overlap other shapes.
        { id: "lbl", type: "text", x: 0, y: 0, label: "on top" },
      ],
      steps: undefined,
    };
    const problems = lintSpec(bad);
    expect(problems).toContain('shapes "c1" and "c2" overlap');
    expect(problems).toContain('shape "far" leaves the 520×200 canvas');
    expect(problems).toContain('arrow "arr": unknown shape "missing"');
    expect(problems).toHaveLength(3);
  });
});

describe("lintSpec: layout paper-figure options", () => {
  const withShapes = (shapes: LayoutSpec["shapes"], groups = paperLayout.groups): LayoutSpec => ({
    ...paperLayout,
    shapes,
    groups,
    steps: undefined,
  });

  it("passes the fixture that uses every option", () => {
    expect(lintSpec(paperLayout)).toEqual([]);
  });

  it("measures the longest line of a multi-line label and checks the lines fit the height", () => {
    const problems = lintSpec(
      withShapes([
        { id: "ok", type: "box", x: 10, y: 10, w: 100, h: 44, label: "Multi-Head\nAttention" },
        { id: "wide", type: "box", x: 10, y: 60, w: 60, h: 44, label: "Feed\nAttention" },
        { id: "short", type: "box", x: 120, y: 10, w: 100, h: 30, label: "Feed\nForward" },
        { id: "many", type: "text", x: 120, y: 60, w: 100, h: 80, label: "a\nb\nc\nd" },
      ])
    );
    expect(problems).toEqual([
      'shape "wide": label "Attention" is 3px wider than its box',
      'shape "short": 2 label lines need a box at least 36px tall',
      'shape "many": label has 4 lines (at most 3)',
    ]);
  });

  it("checks a box's sub line and a group's title", () => {
    const problems = lintSpec(
      withShapes(
        [
          {
            id: "ok",
            type: "box",
            x: 10,
            y: 10,
            w: 180,
            h: 52,
            label: "Input required",
            sub: "TASK_STATE_INPUT_REQUIRED",
          },
          {
            id: "tight",
            type: "box",
            x: 10,
            y: 80,
            w: 170,
            h: 52,
            label: "Input required",
            sub: "TASK_STATE_INPUT_REQUIRED",
          },
        ],
        [{ id: "g", title: "Datadog, official and reported", tone: "violet", x: 200, y: 20, w: 230, h: 100 }]
      )
    );
    expect(problems).toEqual([
      'shape "tight": sub "TASK_STATE_INPUT_REQUIRED" is 3px wider than its box',
      'group "g": title "Datadog, official and reported" runs 2px past its 230px width',
    ]);
  });

  it("flags weights outside 0..1, symbols off circles, fills on text and paths without two points", () => {
    const problems = lintSpec(
      withShapes([
        { id: "c", type: "cell", x: 10, y: 10, weight: 1.5 },
        { id: "b", type: "box", x: 60, y: 10, symbol: "plus" },
        { id: "t", type: "text", x: 10, y: 80, fill: "pastel", label: "x" },
        { id: "p", type: "path", x: 0, y: 0, points: [[10, 10]] },
      ])
    );
    expect(problems).toEqual([
      'shape "c": weight 1.5 is not between 0 and 1',
      'shape "b": symbol only applies to circles',
      'shape "t": fill only applies to boxes, cells and circles',
      'path "p" needs at least two points',
    ]);
  });

  it("keeps paths inside the canvas and lets them cross boxes", () => {
    const problems = lintSpec(
      withShapes([
        { id: "b", type: "box", x: 10, y: 10 },
        {
          id: "inside",
          type: "path",
          x: 0,
          y: 0,
          points: [
            [0, 0],
            [100, 100],
          ],
        },
        {
          id: "out",
          type: "path",
          x: 0,
          y: 0,
          points: [
            [10, 10],
            [500, 10],
          ],
        },
      ])
    );
    expect(problems).toEqual(['shape "out" leaves the 400×300 canvas']);
  });
});
