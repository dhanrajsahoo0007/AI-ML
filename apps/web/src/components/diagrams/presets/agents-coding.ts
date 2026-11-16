// Constants for the coding-agents figures (assets/diagrams/animated/agents/repo-context, edit-formats, benchmark-flow)
// on genai-system-design/coding-agents. The task, the file and the tests come from ./agents (CODING_TASK, CODING_CONTEXT);
// the root AGENTS.md size comes from ./agents-disclosure (LAYERS), so the progressive-disclosure page and this one
// agree. Every other token count, file count and line number here is illustrative.

import { CODING_CONTEXT, CODING_TASK } from "./agents";
import { LAYERS } from "./agents-disclosure";

/** Tokens of src/parser.ts read in full: half of CODING_CONTEXT's two-file 6,400 (as on coding-agent-trace). */
export const PARSER_TOKENS = CODING_CONTEXT.step9.files / 2;

/**
 * The repository the agent searches (illustrative size): 240 files, about 410,000 tokens if read in full. Eight files
 * are drawn; the two search matches sit side by side, as on the ai-first-environment page ("parser.ts and
 * parser.test.ts side by side").
 */
export const REPO = {
  files: 240,
  tokens: 410_000,
  shown: [
    "AGENTS.md",
    "docs/architecture.md",
    "src/AGENTS.md",
    "src/import.ts",
    "src/orders.ts",
    CODING_TASK.file,
    `src/${CODING_TASK.test}`,
    "web/checkout.tsx",
  ],
  agentsMd: LAYERS.root.tokens,
} as const;

/** The query the agent searches with, and the two lines it matches (file, line number, matched text). */
export const SEARCH = {
  query: "last line",
  matches: [
    { file: CODING_TASK.file, line: 17, text: "// ignore the last line if empty" },
    { file: `src/${CODING_TASK.test}`, line: 12, text: `it("${CODING_TASK.failingTest}")` },
  ],
  /** Tokens of the search result: two lines with paths and line numbers (illustrative). */
  tokens: 100,
} as const;

/**
 * What the model reads for this bug: root AGENTS.md 800 + search result 100 + src/parser.ts 3,200 = 4,100 tokens,
 * 4,100 / 410,000 = 1.0 % of the repository.
 */
export const READ_TOKENS = REPO.agentsMd + SEARCH.tokens + PARSER_TOKENS;
export const READ_SHARE = Math.round((READ_TOKENS / REPO.tokens) * 1000) / 10;

/** The one-line fix (the first edit of CODING_STEPS), at line 18 of src/parser.ts, a 128-line file. */
export const FIX = {
  line: 18,
  fileLines: 128,
  before: "for (let i = 0; i < lines.length - 1; i++)",
  after: "for (let i = 0; i < lines.length; i++)",
} as const;

/**
 * Tokens the model writes for that fix in each edit format (illustrative): the whole file is PARSER_TOKENS; a unified
 * diff (two header lines, a hunk header, one removed and one added line) about 50; a search-and-replace (path, old
 * text, new text) about 40. 3,200 / 40 = 80 times more output for the whole file.
 */
export const EDIT_TOKENS = { whole: PARSER_TOKENS, diff: 50, replace: 40 } as const;

/**
 * The CSV fix as a SWE-bench-style task: the test the fix added ("keeps the last line") is held back as FAIL_TO_PASS;
 * the other 17 of the 18 tests, "parses an empty file" among them, are PASS_TO_PASS. SWE-bench Verified has 500
 * tasks (OpenAI, August 2024; the same number as on harness-engineering and agentic-ai-evaluation).
 */
export const BENCH = {
  failToPass: [CODING_TASK.failingTest],
  passToPass: CODING_TASK.testsTotal - 1,
  verifiedTasks: 500,
} as const;
