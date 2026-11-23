import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { PARSER_TOKENS, READ_SHARE, READ_TOKENS, REPO, SEARCH } from "@/components/diagrams/presets/agents-coding";

// Repository context for the coding agent (coding-agents, Core concepts "Repository context"): the agent does not load
// the repository; it searches, opens one file and reads only that. Running example B: the issue "Order import drops the
// last line of a CSV file" in brightpost-orders. Sizes are illustrative (REPO, SEARCH); the file's 3,200 tokens and
// AGENTS.md's 800 come from the shared presets.
//
// Four steps: 1 the issue and the repo, with only AGENTS.md loaded · 2 search("last line"): two matches, side by side
// in the repo · 3 read_file opens src/parser.ts (ringed) · 4 the sum the model reads.
//
// Layout: three columns 230 wide at x 16, 316, 616 (repo files, search matches, the opened file), each headed by its
// tool call and closed by a token count; the issue spans the top, the sum spans the bottom. File rows 28 high every
// 34 from y 116; the two match cells span two rows each so their sub lines fit.
//
// Colour (agents legend, three tones plus neutral): the issue orange; the tool calls teal; what came back blue; the
// repo and the sum neutral. The opened file is ringed: it is all of the code the model reads.

const COL = [16, 316, 616] as const;
const COL_W = 230;
const ROW = (i: number) => 116 + i * 34;
const MATCH_Y = [ROW(4), ROW(6)] as const;
const MATCH_H = 62;
const TOTAL_Y = 420;
const fmt = (n: number) => n.toLocaleString("en-GB");

const files: LayoutShape[] = REPO.shown.map((path, i) => ({
  id: `f${i}`,
  type: "cell",
  x: COL[0],
  y: ROW(i),
  w: COL_W,
  h: 28,
  label: path,
  tone: AGENT_TONE.infra,
  fill: i === 0 ? "pastel" : "soft",
  quiet: i > 0 ? true : undefined,
}));

const matchFile = REPO.shown.indexOf(CODING_TASK.file);
const matches: LayoutShape[] = SEARCH.matches.flatMap((m, i) => [
  {
    id: `m${i}`,
    type: "box" as const,
    x: COL[1],
    y: MATCH_Y[i],
    w: COL_W,
    h: MATCH_H,
    label: `${m.file}:${m.line}`,
    sub: m.text,
    tone: AGENT_TONE.result,
    fill: "pastel" as const,
    step: 2,
  },
  { id: `m${i}-a`, type: "arrow" as const, x: 0, y: 0, from: `f${matchFile + i}`, to: `m${i}`, step: 2 },
]);

const totals = [
  { label: `~${fmt(REPO.tokens)} tokens`, sub: `only AGENTS.md (${fmt(REPO.agentsMd)}) loads`, tone: AGENT_TONE.infra },
  { label: `~${fmt(SEARCH.tokens)} tokens`, sub: "2 lines with their paths", tone: AGENT_TONE.result },
  { label: `${fmt(PARSER_TOKENS)} tokens`, sub: `1 file of ${REPO.files}`, tone: AGENT_TONE.result },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Search, open, read only what is needed",
  width: 862,
  height: 536,
  steps: [
    { title: "The issue and a repo too big to load" },
    { title: `Search for "${SEARCH.query}": 2 matches` },
    { title: `Open ${CODING_TASK.file} only` },
    { title: `The model reads ${fmt(READ_TOKENS)} tokens` },
  ],
  shapes: [
    {
      id: "issue",
      type: "box",
      x: COL[0],
      y: 14,
      w: COL[2] + COL_W - COL[0],
      h: 36,
      label: `Issue: ${CODING_TASK.issue}`,
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    {
      id: "h0",
      type: "text",
      x: COL[0],
      y: 66,
      w: COL_W,
      h: 36,
      label: `${CODING_TASK.repo}: ${REPO.files} files`,
    },
    ...files,
    {
      id: "more",
      type: "text",
      x: COL[0],
      y: ROW(REPO.shown.length) - 2,
      w: COL_W,
      h: 20,
      label: `+ ${REPO.files - REPO.shown.length} more files`,
    },
    {
      id: "search",
      type: "box",
      x: COL[1],
      y: 66,
      w: COL_W,
      h: 36,
      label: `search("${SEARCH.query}")`,
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 2,
    },
    ...matches,
    { id: "search-a", type: "arrow", x: 0, y: 0, from: "search", to: "m0", step: 2 },
    {
      id: "read",
      type: "box",
      x: COL[2],
      y: 66,
      w: COL_W,
      h: 36,
      label: `read_file("${CODING_TASK.file}")`,
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 3,
    },
    {
      id: "file",
      type: "box",
      x: COL[2],
      y: MATCH_Y[0],
      w: COL_W,
      h: MATCH_H,
      label: CODING_TASK.file,
      sub: "read in full",
      tone: AGENT_TONE.result,
      fill: "pastel",
      highlight: true,
      step: 3,
    },
    { id: "read-a", type: "arrow", x: 0, y: 0, from: "read", to: "file", step: 3 },
    { id: "file-a", type: "arrow", x: 0, y: 0, from: "m0", to: "file", step: 3 },
    ...totals.map((t, i): LayoutShape => ({
      id: `t${i}`,
      type: "cell",
      x: COL[i],
      y: TOTAL_Y,
      w: COL_W,
      h: 44,
      label: t.label,
      sub: t.sub,
      tone: t.tone,
      step: i + 1,
    })),
    {
      id: "sum",
      type: "box",
      x: COL[0],
      y: 480,
      w: COL[2] + COL_W - COL[0],
      h: 40,
      label: `The model reads ${fmt(REPO.agentsMd)} + ${fmt(SEARCH.tokens)} + ${fmt(PARSER_TOKENS)} = ${fmt(READ_TOKENS)} tokens, about ${READ_SHARE} % of the repo`,
      tone: AGENT_TONE.infra,
      fill: "pastel",
      step: 4,
    },
  ],
};

export default spec;
