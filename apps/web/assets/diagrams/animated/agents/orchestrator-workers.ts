import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { RESEARCH } from "@/components/diagrams/presets/agents-multi";

// Orchestrator-workers on multi-agent-systems (Architecture; replaces the lead / workers / reviewer flowchart).
// Brightpost's support manager asks "Why are kettle refunds up this month?". A lead agent splits the question into
// three sub-questions, starts one worker per sub-question (refund records, the help centre through search_help, and
// customer reviews), and each worker returns a short summary, not its transcript. The lead drafts; a reviewer finds
// a claim with no source and sends it back; once the gap is closed the reviewer passes the report.
//
// Five steps: 1 the question reaches the lead · 2 the lead starts three workers · 3 the workers return summaries ·
// 4 the reviewer finds a gap · 5 the reviewer passes the report. Nodes never move between steps.
//
// Layout: four columns. x 95: the manager (row 210) and the report (row 380). x 300: the lead (row 210); the reviewer
// sits a little right of it at x 330 (row 380) so "passes" fits between it and the report. x 590: the workers (rows 80,
// 210, 340). x 790: the findings (row 210). The summaries go back to the lead along the top (y 22), clear of worker 1.
// The lead ⇄ reviewer pair is bent apart through x 262 (draft) and x 392 (gap) so both labels show.
//
// Colour (agents legend, four tones plus neutral): the lead is the green accent; the workers are plain green cards
// with the robot glyph; the manager orange; the findings blue (results); the reviewer lime (a check).

const COL = { left: 95, lead: 300, workers: 590, findings: 790 } as const;
const ROW = { top: 80, mid: 210, low: 340, bottom: 380 } as const;
const WORKER_ROWS = [ROW.top, ROW.mid, ROW.low] as const;

const spec: DiagramSpec = {
  title: "Orchestrator-workers: a lead agent splits the work and merges the summaries",
  width: 880,
  height: 450,
  steps: [
    { title: "The question reaches the lead agent" },
    { title: "The lead splits it across three workers" },
    { title: "The workers return short summaries" },
    { title: "A reviewer checks the draft and finds a gap" },
    { title: "The gap is closed and the report goes out" },
  ],
  zones: [],
  nodes: [
    {
      id: "manager",
      label: RESEARCH.asker,
      sub: "asks a question",
      icon: "users",
      tone: AGENT_TONE.task,
      variant: "glyph",
      x: COL.left,
      y: ROW.mid,
    },
    {
      id: "lead",
      label: "Lead agent",
      sub: "plans and writes",
      icon: "robot",
      tone: AGENT_TONE.model,
      accent: true,
      x: COL.lead,
      y: ROW.mid,
      w: 170,
    },
    ...RESEARCH.workers.map((wk, i) => ({
      id: wk.id,
      label: wk.label,
      sub: wk.sub,
      icon: "robot",
      tone: AGENT_TONE.model,
      step: 2,
      x: COL.workers,
      y: WORKER_ROWS[i],
      w: 196,
    })),
    {
      id: "findings",
      label: "Findings",
      sub: "claims + sources",
      icon: "file",
      tone: AGENT_TONE.result,
      fill: "pastel",
      step: 3,
      x: COL.findings,
      y: ROW.mid,
      w: 150,
    },
    {
      id: "reviewer",
      label: "Reviewer",
      sub: "every claim sourced?",
      icon: "policy",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 4,
      x: 330,
      y: ROW.bottom,
      w: 186,
    },
    {
      id: "report",
      label: "Report",
      sub: "to the manager",
      icon: "file",
      tone: AGENT_TONE.model,
      step: 5,
      x: COL.left,
      y: ROW.bottom,
      w: 150,
    },
  ],
  edges: [
    // Step 1: the question.
    { from: "manager", to: "lead", label: "question", packet: true },

    // Step 2: one sub-question per worker, each with its own instructions and tools.
    { from: "lead", to: "w1", packet: true, step: 2 },
    { from: "lead", to: "w2", label: "sub-question", packet: true, step: 2 },
    { from: "lead", to: "w3", packet: true, step: 2 },

    // Step 3: the workers run at once and return short summaries; the lead reads only those.
    { from: "w1", to: "findings", packet: true, step: 3 },
    { from: "w2", to: "findings", packet: true, step: 3 },
    { from: "w3", to: "findings", packet: true, step: 3 },
    {
      from: "findings",
      to: "lead",
      label: "3 short summaries",
      packet: true,
      via: [
        [COL.findings, 22],
        [COL.lead, 22],
      ],
      labelAt: 0.5,
      step: 3,
    },

    // Step 4: the lead drafts; the reviewer sends back a gap.
    { from: "lead", to: "reviewer", label: "draft", packet: true, via: [[262, 300]], step: 4 },
    {
      from: "reviewer",
      to: "lead",
      label: RESEARCH.gap,
      dashed: true,
      packet: true,
      via: [[392, 300]],
      labelAt: 0.3,
      step: 4,
    },

    // Step 5: the lead re-asks one worker for the source, redrafts, and the reviewer passes it.
    { from: "reviewer", to: "report", label: "passes", packet: true, step: 5 },
  ],
};

export default spec;
