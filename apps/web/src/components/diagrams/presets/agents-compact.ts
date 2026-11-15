// Constants for the context-compaction-resets-and-state figures (assets/diagrams/animated/agents/compaction,
// reset-with-handoff, state-outside-the-window, compact-or-reset) on genai-system-design/context-compaction-resets-and-
// state. The coding agent's task, its nine steps and its window at steps 1 and 9 come from ./agents (CODING_TASK,
// CODING_CONTEXT); this file adds only what happens after step 9: the developer asks a follow-up in the same session,
// and the harness either compacts the window or resets it with a handoff note. Every token count here is illustrative,
// like CODING_CONTEXT's.

import { CODING_CONTEXT, CODING_TASK } from "./agents";

const s9 = CODING_CONTEXT.step9;
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

/**
 * Compaction of the coding agent's window (illustrative). The harness compacts at 75 % of the 32,000-token budget,
 * 24,000 tokens, which step 9 reaches. Instructions, tool definitions and the task stay word for word; files (6,400),
 * history (4,000) and tool results (9,800) are replaced by a 1,500-token summary plus the file being edited,
 * parser.ts (3,200, half of the two files). After: 2,000 + 1,500 + 300 + 1,500 + 3,200 = 8,500 tokens, 27 %; freed
 * 24,000 − 8,500 = 15,500. The follow-up then reads parser.test.ts again (files 6,400 in all), adds 1,500 tokens of
 * history and 2,600 of tool results: 8,500 + 3,200 + 1,500 + 2,600 = 15,800 tokens, 49 %.
 */
export const COMPACTION = {
  budget: CODING_CONTEXT.budget,
  trigger: (CODING_CONTEXT.budget * 3) / 4,
  before: sum(s9),
  kept: { instructions: s9.instructions, tools: s9.tools, task: s9.task, summary: 1_500, file: s9.files / 2 },
  followUp: { files: s9.files, history: 1_500, results: 2_600 },
} as const;

export const COMPACTION_TOTALS = {
  after: sum(COMPACTION.kept),
  freed: COMPACTION.before - sum(COMPACTION.kept),
  /** After the follow-up: the kept file is part of `followUp.files`, so it is not counted twice. */
  continued: sum(COMPACTION.kept) - COMPACTION.kept.file + sum(COMPACTION.followUp),
} as const;

/**
 * The same moment handled with a reset (illustrative). Session 1 writes a 600-token handoff note and commits; session 2
 * starts from instructions 2,000 + tools 1,500 + the note 600 + the follow-up task 300 = 4,400 tokens, 14 %.
 */
export const RESET = {
  note: "HANDOFF.md",
  noteTokens: 600,
  task: 300,
  sections: [
    { id: "done", label: "Done", sub: `last line fixed, ${CODING_TASK.testsTotal} pass` },
    { id: "decisions", label: "Decisions", sub: "bound < n; empty → []" },
    { id: "debt", label: "Open debt", sub: "CRLF not handled" },
    { id: "next", label: "Next", sub: "add a CRLF test first" },
  ],
} as const;

export const RESET_TOTALS = {
  start: s9.instructions + s9.tools + RESET.noteTokens + RESET.task,
} as const;
