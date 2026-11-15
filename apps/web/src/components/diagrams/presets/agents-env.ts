// Constants for the ai-first-environment-and-tool-scaffolding figures (assets/diagrams/animated/agents/
// deterministic-feedback, error-to-action, sandbox-boundaries) on genai-system-design/ai-first-environment-and-tool-
// scaffolding. The coding agent's task and its nine steps come from ./agents (CODING_TASK, CODING_STEPS); this file
// adds only what the environment around those steps does: the checks that run after the first edit (step 3), the
// failing test's raw output and its rewrite, and the sandbox's three fences. Run times and token counts are
// illustrative.

import { CODING_STEPS, CODING_TASK } from "./agents";

/** Step 3 of CODING_STEPS: the first edit, which the checks below judge. */
export const FIRST_EDIT = CODING_STEPS[2];

/** Line of src/parser.ts where the empty-input error is thrown, inside the loop the first edit changed. */
export const ERROR_LINE = 14;

/**
 * The deterministic checks the harness runs after the first edit, cheapest first. The linter and the type check pass;
 * the tests catch what types cannot: 17 of 18 pass, and "parses an empty file" fails. Run times are illustrative:
 * 1 + 4 + 6 = 11 seconds for all three.
 */
export const FEEDBACK_CHECKS = [
  { name: "Linter", result: "0 problems", seconds: 1 },
  { name: "Type check", result: "0 errors", seconds: 4 },
  { name: "Tests", result: `${CODING_TASK.testsTotal - 1} passed, 1 failed`, seconds: 6 },
] as const;

export const FEEDBACK_SECONDS = FEEDBACK_CHECKS.reduce((s, c) => s + c.seconds, 0);

/**
 * The failing test's output, raw and rewritten (illustrative token counts). The raw output of the whole run is 46
 * lines, about 2,100 tokens; three lines carry what the model needs (the test, the error and the frame in
 * src/parser.ts). The rewrite keeps those facts and adds what to try next: 3 lines, about 90 tokens, 2,100 / 90 ≈ 23
 * times smaller. "What to try" names only what the harness can know (where to look, how to rerun one test), not the fix.
 */
export const ERROR_REWRITE = {
  rawLines: 46,
  rawTokens: 2_100,
  rewrittenTokens: 90,
  /** The raw lines drawn in the figure, in order; `keep` marks the three the rewrite uses. */
  raw: [
    { text: `FAIL ${CODING_TASK.test} > ${CODING_TASK.secondFailure}`, keep: true },
    { text: "Error: empty input has no lines", keep: true },
    { text: `at parseLines (${CODING_TASK.file}:${ERROR_LINE}:11)`, keep: true },
    { text: `at parseCsv (${CODING_TASK.file}:31:10)`, keep: false },
    { text: `at ${CODING_TASK.test}:42:5`, keep: false },
    { text: "at runTest (node_modules/…/runner.js:812:9)", keep: false },
    { text: "at processTicks (node:internal/…:105:5)", keep: false },
    { text: "… 39 more lines", keep: false },
  ],
  failed: `What failed: ${CODING_TASK.secondFailure}`,
  failedSub: "Error: empty input has no lines",
  where: `Where: ${CODING_TASK.file}:${ERROR_LINE}`,
  whereSub: "parseLines(), inside the loop you edited",
  tryNext: "What to try: read lines 10–18",
  tryNextSub: "fix, then call run_tests() again",
} as const;

/**
 * The sandbox the coding agent's commands run in, fence by fence (the shape of Claude Code's sandbox and of
 * Anthropic's cloud sessions, checked 2026-11-15). File system: writes only to the repository copy and a temp folder;
 * reads of credential files are denied. Network: every connection goes through a proxy whose allow-list starts empty;
 * the package registry is added, anything else is blocked. Credentials: none inside; a git proxy outside checks each
 * push and adds the real token.
 */
export const SANDBOX = {
  writable: `${CODING_TASK.repo} copy`,
  deniedRead: "~/.ssh, ~/.aws",
  allowedHost: "registry.npmjs.org",
  blockedHost: "paste.example",
  branch: "fix/csv-last-line",
} as const;
