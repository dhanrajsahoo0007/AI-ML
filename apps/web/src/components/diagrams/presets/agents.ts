// Shared building blocks for the agents figures in assets/diagrams/animated/agents/. Pure functions and constants:
// every agents figure keeps one colour legend (AGENT_TONE) and two running examples (the Brightpost support agent and
// the bug-fix coding agent), so a name or number that appears in two figures comes from the same constant below.
// Specs import from here and never hard-code a tone for a role or retype a running-example number.
//
// The Brightpost facts come from cloud/resilience/ai-security.mdx and its specs (animated/cloud/ai-guardrail-path,
// animated/cloud/ai-security-1): customer 1847, order 4471 refunded for £42, refunds over £30 wait for the support
// agent, who approves at 10:20, and the pasted note that asks for a refund on a stranger's order 5122. Where this file
// and that page disagree, the page wins.

import type { LayoutShape, LayoutTone } from "../types";

type Point = [number, number];

// ── Colour legend ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The fixed agents legend: a role keeps its tone in every agents figure. At most four tones plus neutral in one
 * figure; red only where something breaks. Green, orange, violet, lime and pink mean the same as in the RAG figures.
 */
export const AGENT_TONE = {
  /** The model: a model call, a thought, an agent, the final answer. */
  model: "green",
  /** The task: the user, the user's message, a human approver. */
  task: "orange",
  /** An action: a tool call, a tool, an MCP server. */
  action: "teal",
  /** What comes back: a tool result, an observation, retrieved text. */
  result: "blue",
  /** Memory, state, checkpoints, stores. */
  memory: "violet",
  /** A check: verification, a grader, a guardrail, an evaluation score. */
  check: "lime",
  /** Failure, attack, blocked or stale. */
  failure: "red",
  /** Harness, orchestrator, infrastructure, instructions. */
  infra: "neutral",
  /** Embeddings and vectors (long-term vector memory only). */
  embedding: "pink",
} as const satisfies Record<string, LayoutTone>;

// ── Running example A: the Brightpost support agent ──────────────────────────────────────────────────────────────

/** The customer's task and the facts every Brightpost figure shares. */
export const BRIGHTPOST = {
  shop: "Brightpost",
  /** The signed-in customer; the chat service adds this id to every tool call (ai-security.mdx). */
  customerId: "1847",
  message: "My kettle arrived cracked. It's order 4471. Can I get my money back?",
  orderId: "4471",
  item: "kettle",
  /** £42: the refund that waits for approval in animated/cloud/ai-security-1. */
  price: 42,
  /** Refunds over £30 wait for the support agent. 42 > 30, so the example always reaches the approval step. */
  approvalLimit: 30,
  approver: "Support agent",
  approvedAt: "10:20",
  delivered: "12 Nov",
  /** The refund the workflow creates once approved. */
  refundId: "R-2291",
  helpQuery: "damaged item refund",
  /** The help article search_help returns first. */
  helpArticle: "Damaged on arrival",
  helpRule: "Full refund within 30 days",
  /** The pasted note's target: a stranger's order (the injection case). */
  injectedOrder: "5122",
} as const;

/**
 * The four tools, by the exact names every figure and code block uses. `call` is the short form drawn in figures
 * (arguments as the model fills them in); the chat service adds the customer id itself.
 */
export const TOOLS = {
  getOrder: { name: "get_order", params: "order_id", call: `get_order(${BRIGHTPOST.orderId})` },
  searchHelp: { name: "search_help", params: "query", call: `search_help("${BRIGHTPOST.helpQuery}")` },
  createRefund: {
    name: "create_refund",
    params: "order_id, amount",
    call: `create_refund(${BRIGHTPOST.orderId}, ${BRIGHTPOST.price.toFixed(2)})`,
  },
  sendEmail: { name: "send_email", params: "to, subject, body", call: `send_email(customer, "Your refund")` },
} as const;

/** One model call of the happy path: what the model thinks, which tool it calls, and what comes back. */
export interface TraceTurn {
  thought: string;
  /** Tool call, or undefined for the final answer. */
  action?: string;
  observation?: string;
  /** The final answer, on the last turn only. */
  answer?: string;
}

/**
 * The happy path, one entry per model call: 5 model calls, 4 tool calls and 1 approval pause.
 * - Call 1 reads the message and the four tool definitions and asks for the order.
 * - Call 2 reads the order and looks up the refund rule.
 * - Call 3 asks for the refund; £42 is over £30, so the harness pauses until the support agent approves at 10:20.
 * - Call 4 emails the confirmation (the customer may have left the chat during the pause).
 * - Call 5 asks for no tool, so the loop ends with the reply.
 */
export const HAPPY_PATH: readonly TraceTurn[] = [
  {
    thought: "I need the order first",
    action: TOOLS.getOrder.call,
    observation: `Kettle, £${BRIGHTPOST.price}, delivered ${BRIGHTPOST.delivered}`,
  },
  {
    thought: "What is the rule for damage?",
    action: TOOLS.searchHelp.call,
    observation: `${BRIGHTPOST.helpArticle}: full refund`,
  },
  {
    thought: `Damaged, in time: refund £${BRIGHTPOST.price}`,
    action: TOOLS.createRefund.call,
    observation: `Approved ${BRIGHTPOST.approvedAt}, refund ${BRIGHTPOST.refundId}`,
  },
  {
    thought: "Confirm it in writing",
    action: TOOLS.sendEmail.call,
    observation: "Email sent",
  },
  {
    thought: "Done: tell the customer",
    answer: `Your £${BRIGHTPOST.price} refund for order ${BRIGHTPOST.orderId} is on its way.`,
  },
];

/** Counts for the happy path, derived from HAPPY_PATH. */
export const HAPPY_PATH_COUNTS = {
  modelCalls: HAPPY_PATH.length,
  toolCalls: HAPPY_PATH.filter((t) => t.action).length,
  approvals: 1,
} as const;

/**
 * Seconds per step, illustrative (not measured): every figure that shows them says so. Working for the happy path:
 * 5 model calls × 1.5 s + 4 tool calls × 0.3 s = 7.5 + 1.2 = 8.7 s of compute, plus the wait for a person.
 */
export const LATENCY_S = {
  modelCall: 1.5,
  toolCall: 0.3,
  happyPath: Math.round((5 * 1.5 + 4 * 0.3) * 10) / 10,
} as const;

/**
 * The autonomy ladder: five rungs from a single call to a multi-agent system, each with the model calls one
 * Brightpost request takes on it. Illustrative counts; latency is calls × LATENCY_S.modelCall.
 * - Single call: 1. Prompt chain: 3 (find the order number, draft, polish). Agent with tools: 5 (HAPPY_PATH).
 * - Agent that plans and reflects: about 8 (a plan, the 5 calls, a critique, a revision).
 * - Multi-agent: about 15 (triage, an orders agent and a refunds agent, each with its own loop).
 */
export const AUTONOMY_LADDER: readonly { rung: string; decides: string; calls: number; risk: string }[] = [
  { rung: "Single call", decides: "Your code", calls: 1, risk: "Low" },
  { rung: "Workflow", decides: "Your code", calls: 3, risk: "Low" },
  { rung: "Agent with tools", decides: "The model", calls: HAPPY_PATH.length, risk: "Medium" },
  { rung: "Plans and reflects", decides: "The model", calls: 8, risk: "Medium" },
  { rung: "Multi-agent", decides: "Several models", calls: 15, risk: "High" },
];

// ── Running example B: the bug-fix coding agent ────────────────────────────────────────────────────────────────────

/**
 * The bug-fix task, fixed once for every engineering page (harness-engineering.mdx "Example: a coding agent harness"
 * and the newsletter figure harness-engineering/coding-agent-trace: a one-line fix in parser.ts, then empty input
 * crashes the parser, then a second fix). Brightpost's order-import code, so both examples share one shop.
 */
export const CODING_TASK = {
  repo: "brightpost-orders",
  issue: "Order import drops the last line of a CSV file",
  file: "src/parser.ts",
  test: "parser.test.ts",
  failingTest: "keeps the last line",
  secondFailure: "parses an empty file",
  testsTotal: 18,
} as const;

/** The nine steps of the coding agent's run: search → read → edit → run tests → fail → read error → edit → pass → summarise. */
export const CODING_STEPS: readonly { kind: TraceKind; label: string }[] = [
  { kind: "action", label: 'search("last line")' },
  { kind: "action", label: `read_file("${CODING_TASK.file}")` },
  { kind: "action", label: "edit: loop bound < n - 1 → < n" },
  { kind: "action", label: "run_tests()" },
  { kind: "failure", label: `1 failed: ${CODING_TASK.secondFailure}` },
  { kind: "observation", label: "Error: empty input has no lines" },
  { kind: "action", label: "edit: return [] for empty input" },
  { kind: "check", label: `${CODING_TASK.testsTotal} passed, lint and types clean` },
  { kind: "answer", label: "Summary for review" },
];

/**
 * What fills the coding agent's context window at step 1 and step 9, in tokens. Illustrative: a 32,000-token budget
 * the harness sets for this task. Step 1 = 2,000 + 1,500 + 300 = 3,800. Step 9 = 3,800 + 6,400 (two files) + 4,000
 * (history) + 9,800 (tool results) = 24,000, three quarters of the budget.
 */
export const CODING_CONTEXT = {
  budget: 32_000,
  step1: { instructions: 2_000, tools: 1_500, task: 300 },
  step9: { instructions: 2_000, tools: 1_500, task: 300, files: 6_400, history: 4_000, results: 9_800 },
} as const;

// ── Arithmetic used in more than one figure ──────────────────────────────────────────────────────────────────────

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Chance that n steps in a row all succeed when each succeeds with probability p. */
const allSucceed = (p: number, n: number) => p ** n;

/** Compounding steps: 0.95^10 = 0.599, 0.95^20 = 0.358, 0.99^20 = 0.818. */
export const COMPOUNDING = {
  p95n10: r3(allSucceed(0.95, 10)),
  p95n20: r3(allSucceed(0.95, 20)),
  p99n20: r3(allSucceed(0.99, 20)),
} as const;

/** pass@k: at least one of k independent runs succeeds. */
export const passAtK = (p: number, k: number) => 1 - (1 - p) ** k;
/** pass^k (tau-bench): all k independent runs succeed. */
export const passHatK = (p: number, k: number) => p ** k;

/** Repeated runs at a 70 % success rate, k = 4: pass@4 = 1 − 0.3^4 = 0.992, pass^4 = 0.7^4 = 0.240. */
export const PASS_K = {
  p: 0.7,
  k: 4,
  passAt: r3(passAtK(0.7, 4)),
  passHat: r3(passHatK(0.7, 4)),
} as const;

// ── Builders ──────────────────────────────────────────────────────────────────────────────────────────────────────

interface ShapeOpts {
  step?: number;
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Rough rendered width of a 13 px semibold label, per character (lint uses 6.2; real text is wider). */
const CHAR_W = 7.2;

// 1. The loop ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The stations of the agent loop, with their legend tones. */
const LOOP_STATIONS = {
  context: { label: "Assemble\ncontext", short: "Context", tone: AGENT_TONE.infra },
  model: { label: "Call the\nmodel", short: "Model", tone: AGENT_TONE.model },
  tool: { label: "Run the\ntool", short: "Tool", tone: AGENT_TONE.action },
  result: { label: "Read the\nresult", short: "Result", tone: AGENT_TONE.result },
  check: { label: "Check the\nwork", short: "Check", tone: AGENT_TONE.check },
  state: { label: "Save\nstate", short: "State", tone: AGENT_TONE.memory },
} as const;
export type LoopStation = keyof typeof LOOP_STATIONS;

/**
 * The agent loop drawn full size: station boxes on an ellipse centred on (cx, cy), the first at the left and the rest
 * clockwise, joined by arrows that bend round the ring, and an exit from the model station to a "Done" box on its
 * right. Default stations: context → model → tool → result (three tones plus neutral). Ids `<id>-<station>`,
 * `<id>-a<i>` (arrow from station i), `<id>-done`, `<id>-exit`. Returns the shapes and each station's centre.
 */
export function loopRing(
  id: string,
  cx: number,
  cy: number,
  opts: ShapeOpts & {
    stations?: LoopStation[];
    rx?: number;
    ry?: number;
    w?: number;
    h?: number;
    exit?: boolean;
    exitLabel?: string;
    doneLabel?: string;
    highlight?: LoopStation;
  } = {}
): { shapes: LayoutShape[]; centres: Partial<Record<LoopStation, Point>> } {
  const stations = opts.stations ?? ["context", "model", "tool", "result"];
  const rx = opts.rx ?? 170;
  const ry = opts.ry ?? 100;
  const w = opts.w ?? 120;
  const h = opts.h ?? 44;
  const n = stations.length;
  const at = (deg: number, k = 1): Point => {
    const a = (deg * Math.PI) / 180;
    return [round(cx + k * rx * Math.cos(a)), round(cy + k * ry * Math.sin(a))];
  };
  const angle = (i: number) => 180 + (i * 360) / n;
  const centres: Partial<Record<LoopStation, Point>> = {};
  const boxes: LayoutShape[] = stations.map((s, i) => {
    const [x, y] = at(angle(i));
    centres[s] = [x, y];
    return {
      id: `${id}-${s}`,
      type: "box",
      x: round(x - w / 2),
      y: round(y - h / 2),
      w,
      h,
      label: LOOP_STATIONS[s].label,
      tone: LOOP_STATIONS[s].tone,
      fill: "pastel",
      highlight: opts.highlight === s ? true : undefined,
      step: opts.step,
    };
  });
  const arrows: LayoutShape[] = stations.map((s, i) => ({
    id: `${id}-a${i}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `${id}-${s}`,
    to: `${id}-${stations[(i + 1) % n]}`,
    via: [at(angle(i + 0.5), 1.12)],
    step: opts.step,
  }));
  const out = [...boxes, ...arrows];
  const model = centres.model;
  if ((opts.exit ?? true) && model) {
    out.push(
      {
        id: `${id}-done`,
        type: "box",
        x: round(model[0] + w / 2 + 90),
        y: round(model[1] - h / 2),
        w: 96,
        h,
        label: opts.doneLabel ?? "Done",
        tone: AGENT_TONE.model,
        step: opts.step,
      },
      {
        id: `${id}-exit`,
        type: "arrow",
        x: 0,
        y: 0,
        from: `${id}-model`,
        to: `${id}-done`,
        label: opts.exitLabel ?? "no tool call",
        step: opts.step,
      }
    );
  }
  return { shapes: out, centres };
}

/**
 * A small "you are here" locator: the loop as a row of small station boxes from (x, y) with a return arrow
 * underneath. Every station is soft neutral except `highlight`, which is pastel in its legend tone with a ring.
 * Default stations: context, model, tool, check, state. Ids `<id>-<station>`, `<id>-a<i>`, `<id>-back`.
 */
export function miniLoop(
  id: string,
  x: number,
  y: number,
  opts: ShapeOpts & { highlight?: LoopStation; stations?: LoopStation[]; w?: number; h?: number; gap?: number } = {}
): LayoutShape[] {
  const stations = opts.stations ?? ["context", "model", "tool", "check", "state"];
  const w = opts.w ?? 64;
  const h = opts.h ?? 26;
  const gap = opts.gap ?? 18;
  const boxes: LayoutShape[] = stations.map((s, i) => {
    const on = opts.highlight === s;
    return {
      id: `${id}-${s}`,
      type: "box",
      x: x + i * (w + gap),
      y,
      w,
      h,
      label: LOOP_STATIONS[s].short,
      tone: on ? LOOP_STATIONS[s].tone : AGENT_TONE.infra,
      fill: on ? "pastel" : "soft",
      highlight: on ? true : undefined,
      step: opts.step,
    };
  });
  const arrows: LayoutShape[] = boxes.slice(1).map((b, i) => ({
    id: `${id}-a${i + 1}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: boxes[i].id,
    to: b.id,
    step: opts.step,
  }));
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  const below = y + h + 12;
  arrows.push({
    id: `${id}-back`,
    type: "arrow",
    x: 0,
    y: 0,
    from: last.id,
    to: first.id,
    via: [
      [last.x + w / 2, below],
      [first.x + w / 2, below],
    ],
    dashed: true,
    step: opts.step,
  });
  return [...boxes, ...arrows];
}

/** Width and height of a miniLoop drawn with the same options (the return arrow dips 12 below the boxes). */
export const miniLoopSize = (opts: { stations?: number; w?: number; h?: number; gap?: number } = {}) => {
  const n = opts.stations ?? 5;
  return { width: n * (opts.w ?? 64) + (n - 1) * (opts.gap ?? 18), height: (opts.h ?? 26) + 14 };
};

// 2. The trace ────────────────────────────────────────────────────────────────────────────────────────────────────

/** What one chip in a trace row is. */
export type TraceKind =
  "thought" | "action" | "observation" | "check" | "failure" | "answer" | "user" | "approval" | "memory";

/** Legend tone and default sub line of each trace chip kind. */
export const TRACE_KIND: Record<TraceKind, { tone: LayoutTone; sub: string }> = {
  thought: { tone: AGENT_TONE.model, sub: "thought" },
  action: { tone: AGENT_TONE.action, sub: "tool call" },
  observation: { tone: AGENT_TONE.result, sub: "result" },
  check: { tone: AGENT_TONE.check, sub: "check" },
  failure: { tone: AGENT_TONE.failure, sub: "failure" },
  answer: { tone: AGENT_TONE.model, sub: "answer" },
  user: { tone: AGENT_TONE.task, sub: "user" },
  approval: { tone: AGENT_TONE.task, sub: "approval" },
  memory: { tone: AGENT_TONE.memory, sub: "memory" },
};

export interface TraceChip {
  kind: TraceKind;
  label: string;
  /** Second line; defaults to the kind's word ("thought", "tool call"…). An empty string drops it. */
  sub?: string;
  /** Columns this chip spans (default 1). */
  span?: number;
  highlight?: boolean;
  fill?: LayoutShape["fill"];
}

export interface TraceRow {
  chips: TraceChip[];
  /** Text of the row's number cell (default the 1-based row index). */
  n?: string;
  step?: number;
}

interface TraceOpts extends ShapeOpts {
  /** Column widths; one number gives every column that width. */
  colW?: number | number[];
  rowH?: number;
  /** Horizontal gap between chips (an arrow runs across it). */
  gap?: number;
  rowGap?: number;
  /** Draw the number cell at the left of each row (default true). */
  numbers?: boolean;
  /** Draw arrows between consecutive chips in a row (default true). */
  arrows?: boolean;
}

const NUM_W = 28;

/** Width a chip needs for its label (13 px semibold) and sub line (11 px), with 16 units of padding. */
export const chipWidth = (chip: Pick<TraceChip, "label" | "sub">) =>
  Math.ceil(Math.max(chip.label.length * CHAR_W, (chip.sub ?? "").length * 6) + 16);

/**
 * Column widths: `colW` when given, else for each column the widest single-span chip in it (at least 80), so every
 * label fits.
 */
const colWidths = (opts: TraceOpts, cols: number, rows: TraceRow[] = []) =>
  Array.from({ length: cols }, (_, i) => {
    if (Array.isArray(opts.colW)) return opts.colW[i] ?? opts.colW[opts.colW.length - 1];
    if (opts.colW) return opts.colW;
    let need = 80;
    for (const row of rows) {
      let col = 0;
      for (const chip of row.chips) {
        if (col === i && (chip.span ?? 1) === 1) {
          need = Math.max(need, chipWidth({ label: chip.label, sub: chip.sub ?? TRACE_KIND[chip.kind].sub }));
        }
        col += chip.span ?? 1;
      }
    }
    return need;
  });

/**
 * A trace: one row per step from (x, y), each row a number cell and chips in legend colours (thought green, tool call
 * teal, result blue, check lime, failure red), joined by short arrows. Chips sit in columns of `colW`; a chip with
 * `span` covers several columns. Ids `<id>-n<i>`, `<id>-<i>-<j>` (row i, chip j, both 0-based), `<id>-<i>-a<j>`.
 */
export function traceRows(id: string, x: number, y: number, rows: TraceRow[], opts: TraceOpts = {}): LayoutShape[] {
  const rowH = opts.rowH ?? 44;
  const gap = opts.gap ?? 24;
  const rowGap = opts.rowGap ?? 10;
  const numbers = opts.numbers ?? true;
  const cols = Math.max(...rows.map((r) => r.chips.reduce((s, c) => s + (c.span ?? 1), 0)));
  const widths = colWidths(opts, cols, rows);
  const left = x + (numbers ? NUM_W + 8 : 0);
  const colX = widths.map((_, i) => left + widths.slice(0, i).reduce((s, w) => s + w + gap, 0));
  const out: LayoutShape[] = [];
  rows.forEach((row, i) => {
    const ry = y + i * (rowH + rowGap);
    const step = row.step ?? opts.step;
    if (numbers) {
      out.push({
        id: `${id}-n${i}`,
        type: "cell",
        x,
        y: ry,
        w: NUM_W,
        h: rowH,
        label: row.n ?? String(i + 1),
        tone: AGENT_TONE.infra,
        step,
        quiet: true,
      });
    }
    let col = 0;
    row.chips.forEach((chip, j) => {
      const span = chip.span ?? 1;
      const w = widths.slice(col, col + span).reduce((s, cw) => s + cw, 0) + (span - 1) * gap;
      const kind = TRACE_KIND[chip.kind];
      out.push({
        id: `${id}-${i}-${j}`,
        type: "box",
        x: colX[col],
        y: ry,
        w,
        h: rowH,
        label: chip.label,
        sub: chip.sub === "" ? undefined : (chip.sub ?? kind.sub),
        tone: kind.tone,
        fill: chip.fill ?? "pastel",
        highlight: chip.highlight,
        step,
      });
      if (j > 0 && (opts.arrows ?? true)) {
        out.push({
          id: `${id}-${i}-a${j}`,
          type: "arrow",
          x: 0,
          y: 0,
          from: `${id}-${i}-${j - 1}`,
          to: `${id}-${i}-${j}`,
          step,
        });
      }
      col += span;
    });
  });
  return out;
}

/** Width and height of a traceRows block with the same rows and options. */
export function traceRowsSize(rows: TraceRow[], opts: TraceOpts = {}) {
  const cols = Math.max(...rows.map((r) => r.chips.reduce((s, c) => s + (c.span ?? 1), 0)));
  const widths = colWidths(opts, cols, rows);
  const gap = opts.gap ?? 24;
  const width = ((opts.numbers ?? true) ? NUM_W + 8 : 0) + widths.reduce((s, w) => s + w, 0) + (cols - 1) * gap;
  const height = rows.length * (opts.rowH ?? 44) + (rows.length - 1) * (opts.rowGap ?? 10);
  return { width, height };
}

// 3. The context window ───────────────────────────────────────────────────────────────────────────────────────────

/** What a slice of the context window holds. */
export type ContextKind = "instructions" | "tools" | "task" | "history" | "memory" | "files" | "results" | "free";

/** Legend tone and default label of each context slice. Free space is drawn on paper. */
const CONTEXT_KIND: Record<ContextKind, { tone: LayoutTone; label: string }> = {
  instructions: { tone: AGENT_TONE.infra, label: "Instructions" },
  tools: { tone: AGENT_TONE.action, label: "Tool definitions" },
  task: { tone: AGENT_TONE.task, label: "Task" },
  history: { tone: AGENT_TONE.task, label: "History" },
  memory: { tone: AGENT_TONE.memory, label: "Memory" },
  files: { tone: AGENT_TONE.result, label: "Files" },
  results: { tone: AGENT_TONE.result, label: "Tool results" },
  free: { tone: AGENT_TONE.infra, label: "Free" },
};

export interface ContextSegment {
  kind: ContextKind;
  tokens: number;
  label?: string;
  highlight?: boolean;
  step?: number;
}

/**
 * The context window as one stacked bar from (x, y), `w` wide for `total` tokens: one cell per segment, its width
 * proportional to its tokens (whole-unit edges, so neighbours never overlap). Space left over becomes a "Free" segment
 * on paper. A segment wide enough shows its label and token count inside; a narrower one gets a text label under the
 * bar, alternating between two lanes. Throws if the segments hold more than `total`. Ids `<id>-<i>` and `<id>-<i>-t`.
 */
export function contextBar(
  id: string,
  x: number,
  y: number,
  segments: ContextSegment[],
  opts: ShapeOpts & { total: number; w?: number; h?: number; free?: boolean }
): { shapes: LayoutShape[]; height: number } {
  const w = opts.w ?? 660;
  const h = opts.h ?? 44;
  const used = segments.reduce((s, seg) => s + seg.tokens, 0);
  if (used > opts.total) throw new Error(`contextBar ${id}: ${used} tokens do not fit in ${opts.total}`);
  const all: ContextSegment[] =
    used < opts.total && (opts.free ?? true) ? [...segments, { kind: "free", tokens: opts.total - used }] : segments;
  const out: LayoutShape[] = [];
  let acc = 0;
  // Labels of segments too narrow to hold them go in one row under the bar, packed left to right: each starts under
  // its segment's centre if it can, and never before the end of the previous one.
  let nextX = x;
  let below = false;
  all.forEach((seg, i) => {
    const x1 = Math.round(x + (acc / opts.total) * w);
    acc += seg.tokens;
    const x2 = Math.round(x + (acc / opts.total) * w);
    const kind = CONTEXT_KIND[seg.kind];
    const label = seg.label ?? kind.label;
    const sub = fmt(seg.tokens);
    const fits = x2 - x1 - 8 >= Math.max(label.length * CHAR_W, sub.length * 5.6);
    out.push({
      id: `${id}-${i}`,
      type: "cell",
      x: x1,
      y,
      w: x2 - x1,
      h,
      label: fits ? label : undefined,
      sub: fits ? sub : undefined,
      tone: kind.tone,
      fill: seg.kind === "free" ? "paper" : "pastel",
      highlight: seg.highlight,
      step: seg.step ?? opts.step,
    });
    if (!fits) {
      const text = `${label} ${sub}`;
      const tw = Math.ceil(text.length * 6.8) + 6;
      const tx = Math.max(nextX, round((x1 + x2) / 2 - tw / 2));
      out.push({
        id: `${id}-${i}-t`,
        type: "text",
        x: tx,
        y: y + h + 4,
        w: tw,
        h: 18,
        label: text,
        tone: kind.tone,
        step: seg.step ?? opts.step,
      });
      nextX = tx + tw + 10;
      below = true;
    }
  });
  return { shapes: out, height: h + (below ? 22 : 0) };
}

// 4. The conversation: sequence specs (no builder; lanes follow AGENT_TONE through SEQUENCE_TONE). ─────────────────

/**
 * Sequence lanes take the seven section tones only, so lime and pink are not available there. Lanes for the
 * conversation figures: user and approver orange, app or harness neutral, model green, tool teal.
 */
export const SEQUENCE_TONE = {
  user: "orange",
  harness: "neutral",
  model: "green",
  tool: "teal",
  approver: "orange",
} as const;

// 5. The pattern tile ─────────────────────────────────────────────────────────────────────────────────────────────

/** The workflow patterns of "Building effective agents" (Anthropic), each drawn with the Brightpost task. */
export type PatternKind = "chaining" | "routing" | "parallel" | "orchestrator" | "evaluator";

/** What a node in a pattern tile is: the input, a model call, a check, plain code, a person or the output. */
type NodeKind = "in" | "llm" | "check" | "code" | "human" | "out";

const NODE_STYLE: Record<NodeKind, { tone: LayoutTone; fill: LayoutShape["fill"] }> = {
  in: { tone: AGENT_TONE.task, fill: "pastel" },
  llm: { tone: AGENT_TONE.model, fill: "pastel" },
  check: { tone: AGENT_TONE.check, fill: "pastel" },
  code: { tone: AGENT_TONE.infra, fill: "soft" },
  human: { tone: AGENT_TONE.task, fill: "paper" },
  out: { tone: AGENT_TONE.model, fill: "paper" },
};

/** Size of every node in every pattern tile, so the tiles compare at a glance. */
export const TILE_NODE = { w: 112, h: 44 } as const;
const MARGIN = 20;

interface TileNode {
  key: string;
  kind: NodeKind;
  label: string;
  col: number;
  /** Row offset from the middle row, in rows (−1 above, +1 below). */
  row?: number;
}

interface TileEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** Route under the row (for a loop back). */
  under?: boolean;
}

interface TileLayout {
  nodes: TileNode[];
  edges: TileEdge[];
  /** Gap after each column (the last entry repeats). */
  gaps: number[];
  note?: { text: string; col: number };
}

/** The Brightpost version of each pattern. */
const TILES: Record<PatternKind, TileLayout> = {
  chaining: {
    nodes: [
      { key: "in", kind: "in", label: "Customer\nmessage", col: 0 },
      { key: "c1", kind: "llm", label: "Find the\norder number", col: 1 },
      { key: "gate", kind: "check", label: "Number\nfound?", col: 2 },
      { key: "c2", kind: "llm", label: "Draft the\nreply", col: 3 },
      { key: "c3", kind: "llm", label: "Polish the\nwording", col: 4 },
      { key: "out", kind: "out", label: "Reply", col: 5 },
      { key: "ask", kind: "code", label: "Ask for the\nnumber", col: 2, row: 1.25 },
    ],
    edges: [
      { from: "in", to: "c1" },
      { from: "c1", to: "gate" },
      { from: "gate", to: "c2" },
      { from: "c2", to: "c3" },
      { from: "c3", to: "out" },
      { from: "gate", to: "ask", label: "no" },
    ],
    gaps: [28],
  },
  routing: {
    nodes: [
      { key: "in", kind: "in", label: "Customer\nmessage", col: 0 },
      { key: "router", kind: "llm", label: "Sort the\nrequest", col: 1 },
      { key: "orders", kind: "llm", label: "Answer from\norder data", col: 2, row: -1 },
      { key: "refunds", kind: "code", label: "Refund\nworkflow", col: 2 },
      { key: "person", kind: "human", label: "Hand to a\nperson", col: 2, row: 1 },
      { key: "out", kind: "out", label: "Reply", col: 3 },
    ],
    edges: [
      { from: "in", to: "router" },
      { from: "router", to: "orders", label: "order question" },
      { from: "router", to: "refunds", label: "refund request" },
      { from: "router", to: "person", label: "complaint" },
      { from: "orders", to: "out" },
      { from: "refunds", to: "out" },
      { from: "person", to: "out" },
    ],
    gaps: [36, 150, 56],
  },
  parallel: {
    nodes: [
      { key: "in", kind: "in", label: "Customer\nmessage", col: 0 },
      { key: "draft", kind: "llm", label: "Draft the\nreply", col: 1, row: -1 },
      { key: "inject", kind: "check", label: "Screen for\ninjection", col: 1 },
      { key: "rules", kind: "check", label: "Check the\nrefund rules", col: 1, row: 1 },
      { key: "combine", kind: "code", label: "Combine", col: 2 },
      { key: "out", kind: "out", label: "Reply", col: 3 },
    ],
    edges: [
      { from: "in", to: "draft" },
      { from: "in", to: "inject" },
      { from: "in", to: "rules" },
      { from: "draft", to: "combine" },
      { from: "inject", to: "combine" },
      { from: "rules", to: "combine" },
      { from: "combine", to: "out" },
    ],
    gaps: [56, 56, 36],
  },
  orchestrator: {
    nodes: [
      { key: "in", kind: "in", label: "Kettle cracked,\nmugs late", col: 0 },
      { key: "lead", kind: "llm", label: "Plan the\nwork", col: 1 },
      { key: "w1", kind: "llm", label: "Order 4471\nworker", col: 2, row: -1 },
      { key: "w2", kind: "llm", label: "Order 4502\nworker", col: 2 },
      { key: "w3", kind: "llm", label: "Help search\nworker", col: 2, row: 1 },
      { key: "merge", kind: "llm", label: "Write one\nreply", col: 3 },
      { key: "out", kind: "out", label: "Reply", col: 4 },
    ],
    edges: [
      { from: "in", to: "lead" },
      { from: "lead", to: "w1" },
      { from: "lead", to: "w2" },
      { from: "lead", to: "w3" },
      { from: "w1", to: "merge" },
      { from: "w2", to: "merge" },
      { from: "w3", to: "merge" },
      { from: "merge", to: "out" },
    ],
    gaps: [36, 56, 56, 36],
    note: { text: "chosen at run time", col: 2 },
  },
  evaluator: {
    nodes: [
      { key: "in", kind: "in", label: "Customer\nmessage", col: 0 },
      { key: "gen", kind: "llm", label: "Draft the\nreply", col: 1 },
      { key: "eval", kind: "check", label: "Check against\nthe policy", col: 2 },
      { key: "out", kind: "out", label: "Reply", col: 3 },
    ],
    edges: [
      { from: "in", to: "gen" },
      { from: "gen", to: "eval" },
      { from: "eval", to: "out", label: "pass" },
      { from: "eval", to: "gen", label: "fail: feedback", dashed: true, under: true },
    ],
    gaps: [36, 80, 64],
  },
};

/**
 * One workflow pattern as a small diagram with the Brightpost task, top-left at (x, y). Every tile uses the same node
 * size (TILE_NODE) and the same node styles (input orange, model call green, check lime, code neutral, person orange
 * outline, output green outline), so the five patterns compare at a glance. Ids `<id>-<node key>` and
 * `<id>-e<i>`; `highlight` rings one node by key. Returns the shapes and the tile's size including a 20-unit margin.
 */
export function patternTile(
  id: string,
  kind: PatternKind,
  x = 0,
  y = 0,
  opts: ShapeOpts & { highlight?: string } = {}
): { shapes: LayoutShape[]; width: number; height: number } {
  const t = TILES[kind];
  const { w, h } = TILE_NODE;
  const rowStep = h + 18;
  const cols = Math.max(...t.nodes.map((n) => n.col)) + 1;
  const gapAt = (c: number) => t.gaps[Math.min(c, t.gaps.length - 1)];
  const colX = Array.from({ length: cols }, (_, c) =>
    Array.from({ length: c }, (_, i) => w + gapAt(i)).reduce((s, v) => s + v, x + MARGIN)
  );
  const above = Math.max(0, ...t.nodes.map((n) => -(n.row ?? 0)));
  const midY = y + MARGIN + above * rowStep;
  const pos = (n: TileNode): Point => [colX[n.col], round(midY + (n.row ?? 0) * rowStep)];
  const shapes: LayoutShape[] = t.nodes.map((n) => {
    const [nx, ny] = pos(n);
    return {
      id: `${id}-${n.key}`,
      type: "box",
      x: nx,
      y: ny,
      w,
      h,
      label: n.label,
      tone: NODE_STYLE[n.kind].tone,
      fill: NODE_STYLE[n.kind].fill,
      highlight: opts.highlight === n.key ? true : undefined,
      step: opts.step,
    };
  });
  const byKey = new Map(t.nodes.map((n) => [n.key, n]));
  t.edges.forEach((e, i) => {
    const via: Point[] | undefined = e.under
      ? (() => {
          const [fx, fy] = pos(byKey.get(e.from)!);
          const [tx] = pos(byKey.get(e.to)!);
          const yy = fy + h + 22;
          return [
            [fx + w / 2, yy],
            [tx + w / 2, yy],
          ];
        })()
      : undefined;
    shapes.push({
      id: `${id}-e${i}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `${id}-${e.from}`,
      to: `${id}-${e.to}`,
      label: e.label,
      dashed: e.dashed,
      via,
      step: opts.step,
    });
  });
  const below = Math.max(0, ...t.nodes.map((n) => n.row ?? 0));
  let bottom = midY + below * rowStep + h;
  if (t.edges.some((e) => e.under)) bottom += 34;
  if (t.note) {
    const nw = Math.ceil(t.note.text.length * 6.8) + 8;
    shapes.push({
      id: `${id}-note`,
      type: "text",
      x: round(colX[t.note.col] + w / 2 - nw / 2),
      y: bottom + 6,
      w: nw,
      h: 18,
      label: t.note.text,
      tone: AGENT_TONE.infra,
      step: opts.step,
    });
    bottom += 26;
  }
  const width = colX[cols - 1] + w + MARGIN - x;
  return { shapes, width: Math.ceil(width), height: Math.ceil(bottom + MARGIN - y) };
}

// ── Small helpers ───────────────────────────────────────────────────────────────────────────────────────────────

/** 1200 → "1,200". */
function fmt(n: number) {
  return n.toLocaleString("en-GB");
}
