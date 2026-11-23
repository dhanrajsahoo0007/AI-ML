// Constants for the progressive-disclosure figures (assets/diagrams/animated/agents/instruction-layers, skill-loading,
// tool-discovery, prefix-cache) on genai-system-design/progressive-disclosure-and-agent-instructions. The coding
// agent's task and its window come from ./agents (CODING_TASK, CODING_CONTEXT); the five MCP servers and their sizes
// come from ./agents-mcp (OVERLOAD, Anthropic's November 2025 measurements), so this page and the MCP page's
// tool-overload figure use the same numbers. Every other token count here is illustrative.
//
// Mechanisms follow, as of November 2026 (checked 2026-11-15): Claude Code's memory docs (root instruction files load
// at start, a subdirectory's file loads when the agent reads a file there), the Agent Skills docs (about 100 tokens of
// name and description per skill at start, the SKILL.md body under 5,000 tokens when triggered, bundled files only
// when read), the tool search tool docs (deferred definitions stay out of the window; a search returns up to 5
// references by default) and the prompt caching docs (prefix order tools → system → messages).

import { CODING_CONTEXT, CODING_TASK } from "./agents";
import { OVERLOAD, OVERLOAD_TOTALS } from "./agents-mcp";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * The three skills installed in the brightpost-orders repository (illustrative). Each costs about 100 tokens of name
 * and description at start (the Agent Skills docs' figure); bodies stay under the docs' 5,000-token guide.
 */
export const SKILLS = [
  {
    name: "run-tests",
    description: "Run the test suite and read failures. Use when running, adding or debugging tests.",
    body: 1_500,
  },
  { name: "release-notes", description: "Draft release notes from merged pull requests.", body: 1_800 },
  { name: "db-migration", description: "Write and check a database migration.", body: 2_200 },
] as const;

export const SKILL_DESCRIPTION_TOKENS = 100;

/**
 * The instruction layers of the coding agent (illustrative token counts). What is always loaded adds up to
 * CODING_CONTEXT.step1.instructions: harness prompt 900 + root AGENTS.md 800 + 3 skill descriptions 300 = 2,000.
 * Scoped files and skill bodies arrive later as tool results, so CODING_CONTEXT's instruction slice stays 2,000.
 */
const rootTokens = 800;
const descriptions = SKILLS.length * SKILL_DESCRIPTION_TOKENS;

export const LAYERS = {
  harnessPrompt: CODING_CONTEXT.step1.instructions - rootTokens - descriptions,
  root: { path: "AGENTS.md", lines: 60, tokens: rootTokens },
  descriptions,
  tools: CODING_CONTEXT.step1.tools,
  /** Loads when the agent reads a file under src/ (the bug is in src/parser.ts). */
  src: {
    path: "src/AGENTS.md",
    tokens: 400,
    rule: "Parsers return [] for empty input; never throw.",
    trigger: `read_file("${CODING_TASK.file}")`,
  },
  /** Never needed for this bug. */
  web: { path: "web/AGENTS.md", tokens: 1_200 },
  docs: { path: "docs/architecture.md", tokens: 3_000 },
} as const;

const skill = SKILLS[0];
const otherBodies = sum(SKILLS.slice(1).map((s) => s.body));

/**
 * Totals for the instruction-layers figure, at the end of the run.
 * - Loaded: 900 + 800 + 300 + 1,500 (tools) + 400 (src/AGENTS.md) + 1,500 (run-tests body) = 5,400.
 * - Never loaded: web 1,200 + docs 3,000 + two skill bodies 4,000 + 58 MCP definitions 55,000 = 63,200.
 */
export const LAYER_TOTALS = {
  start: CODING_CONTEXT.step1.instructions + CODING_CONTEXT.step1.tools,
  loaded: CODING_CONTEXT.step1.instructions + CODING_CONTEXT.step1.tools + LAYERS.src.tokens + skill.body,
  notLoaded: LAYERS.web.tokens + LAYERS.docs.tokens + otherBodies + OVERLOAD_TOTALS.tokens,
  allBodies: sum(SKILLS.map((s) => s.body)),
} as const;

/**
 * The run-tests skill's folder (skill-loading figure, illustrative). Level 3 files: a reference page the task does not
 * need, and a script whose code never enters the window; only its output does (CODING_STEPS' first failure).
 */
export const RUN_TESTS_SKILL = {
  folder: ".claude/skills/run-tests",
  reference: { path: "reference/flaky-tests.md", tokens: 2_000 },
  script: {
    path: "scripts/failing.sh",
    codeTokens: 600,
    outputTokens: 40,
    output: `1 failed: ${CODING_TASK.secondFailure}`,
  },
} as const;

/**
 * Skill-loading totals:
 * - in the window: 3 × 100 + 1,500 + 40 = 1,840;
 * - left on disk: 2,000 (reference) + 600 (script code) + 1,800 + 2,200 (other bodies) = 6,600;
 * - everything up front: 300 + 1,500 + 2,000 + 600 + 4,000 = 8,400 (the script's output would not exist yet).
 */
export const SKILL_TOTALS = {
  loaded: descriptions + skill.body + RUN_TESTS_SKILL.script.outputTokens,
  onDisk: RUN_TESTS_SKILL.reference.tokens + RUN_TESTS_SKILL.script.codeTokens + otherBodies,
  upFront:
    descriptions + skill.body + RUN_TESTS_SKILL.reference.tokens + RUN_TESTS_SKILL.script.codeTokens + otherBodies,
} as const;

/**
 * Tool discovery for the coding agent connected to the five servers of OVERLOAD (Anthropic, Nov 2025: 58 tools,
 * 55,000 tokens). Behind tool search, one regex search returns three GitHub tools (names illustrative, prefixed by
 * server as the tool search docs advise). Their size uses GitHub's average: 26,000 / 35 = 743 tokens a tool, so
 * 3 × 743 = 2,229 tokens (illustrative). The agent's own tools plus the search tool stay at CODING_CONTEXT's 1,500.
 */
const github = OVERLOAD.servers[0];
const perGithubTool = Math.round(github.tokens / github.tools);

export const DISCOVERY = {
  own: CODING_CONTEXT.step1.tools,
  servers: OVERLOAD.servers,
  allTools: OVERLOAD_TOTALS.tools,
  allTokens: OVERLOAD_TOTALS.tokens,
  pattern: "github.*(issue|pull)",
  found: ["github_get_issue", "github_add_issue_comment", "github_create_pull_request"],
  perTool: perGithubTool,
  foundTokens: 3 * perGithubTool,
} as const;

/**
 * Two consecutive model calls of the coding agent (calls 6 and 7 of the worked example) and what the prompt cache does with them (illustrative counts;
 * prefix order tools → system → messages, as in the Claude prompt caching docs). Call 6 sends tools 1,500 + system
 * 2,000 + task 300 + history 4,200 = 8,000 tokens; call 7 adds a 1,000-token tool call and result: 9,000.
 * Relative cost, in base-price input tokens, at Claude Opus 5.5's multipliers (cache read 0.05×, 5-minute write
 * 1.25×, as of November 2026):
 * - stable prefix: read 8,000 × 0.05 = 400, write 1,000 × 1.25 = 1,250 → 1,650 against 9,000 uncached;
 * - a timestamp edited into the system prompt: read only the tools, 1,500 × 0.05 = 75, write the rest again,
 *   7,500 × 1.25 = 9,375 → 9,450, more than sending it uncached.
 */
export const PREFIX = {
  tools: CODING_CONTEXT.step1.tools,
  system: CODING_CONTEXT.step1.instructions,
  task: CODING_CONTEXT.step1.task,
  history: 4_200,
  added: 1_000,
  readX: 0.05,
  writeX: 1.25,
  stamp: "10:42",
} as const;

const prefix = PREFIX.tools + PREFIX.system + PREFIX.task + PREFIX.history;
const rewritten = prefix - PREFIX.tools + PREFIX.added;

export const PREFIX_TOTALS = {
  before: prefix,
  after: prefix + PREFIX.added,
  hitCost: Math.round(prefix * PREFIX.readX + PREFIX.added * PREFIX.writeX),
  missRead: PREFIX.tools,
  missWrite: rewritten,
  missCost: Math.round(PREFIX.tools * PREFIX.readX + rewritten * PREFIX.writeX),
} as const;
