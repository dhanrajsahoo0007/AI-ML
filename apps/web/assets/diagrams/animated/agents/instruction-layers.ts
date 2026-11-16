import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { DISCOVERY, LAYERS, LAYER_TOTALS, SKILLS } from "@/components/diagrams/presets/agents-disclosure";

// Instruction layers on progressive-disclosure-and-agent-instructions (Architecture, the hero): what the bug-fix coding
// agent (running example B) keeps in the repository and what reaches its context window, and when. A small root
// AGENTS.md points to a skills folder, two scoped AGENTS.md files and an architecture doc; 58 MCP tool definitions sit
// behind a search tool. At start the window holds the harness prompt, the root file, three skill descriptions and the
// agent's own tools (3,500 tokens). Reading src/parser.ts loads src/AGENTS.md; a task that matches run-tests loads
// that skill's body. web/AGENTS.md, the architecture doc, two skill bodies and the MCP definitions never load.
//
// Three steps: 1 always loaded · 2 a file read loads a scoped file · 3 a matching task loads a skill body (with the
// totals). Numbers from LAYERS and LAYER_TOTALS (illustrative; the MCP sizes are Anthropic's).
//
// Layout: three columns. Left, the repository (x 20, the root file 290 wide, its children indented to x 52, joined by
// dashed tree lines). Middle (x 340, 200 wide), what triggers a load. Right (x 576, 244 wide), the context window,
// filled pastel. Seven rows, 56 apart from y 48. A totals line under the last row at step 3.
//
// Colour (agents legend, two tones plus neutral): instruction files neutral (outline on disk, pastel in the window),
// tools and the read_file call teal, the model's match green. The read_file call that loads the scoped file carries
// the one highlight. The skill arrow runs down the gap at x 325 so it does not cross the scoped files.

const H = 44;
const ROW = [48, 104, 160, 216, 272, 328, 384] as const;
const DISK = { x: 20, w: 290, childX: 52, childW: 258 } as const;
const MID = { x: 340, w: 200 } as const;
const WIN = { x: 576, w: 244 } as const;
const fmt = (n: number) => n.toLocaleString("en-GB");
const tok = (n: number) => `${fmt(n)} tokens`;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  fill: "paper" | "pastel",
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h: H, label, sub, tone, fill, step, ...extra });

const disk = (id: string, row: number, label: string, sub: string, tone: LayoutTone = AGENT_TONE.infra) =>
  box(id, row === 1 ? DISK.x : DISK.childX, ROW[row], row === 1 ? DISK.w : DISK.childW, label, sub, tone, "paper", 1);

const win = (id: string, row: number, label: string, sub: string, step: number, extra: Partial<LayoutShape> = {}) =>
  box(id, WIN.x, ROW[row], WIN.w, label, sub, extra.tone ?? AGENT_TONE.infra, "pastel", step, extra);

const arrow = (id: string, from: string, to: string, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
});

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step = 1): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: AGENT_TONE.infra,
  step,
});

// The root file's pointers, drawn as a file tree: one dashed elbow from under the root box to each child's left edge.
const TREE_X = 34;
const pointer = (id: string, row: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [TREE_X, ROW[1] + H],
    [TREE_X, ROW[row] + H / 2],
    [DISK.childX, ROW[row] + H / 2],
  ],
  dashed: true,
  step: 1,
});

const [runTests] = SKILLS;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Instruction layers: a small root file and everything it points to",
  width: 840,
  height: 492,
  steps: [
    { title: `At start: the always-loaded layer, ${tok(LAYER_TOTALS.start)}` },
    { title: `Reading ${CODING_TASK.file} loads ${LAYERS.src.path}` },
    { title: `The task matches ${runTests.name}: its body loads` },
  ],
  shapes: [
    text("h-disk", DISK.x, 14, DISK.w, 22, "In the repository"),
    text("h-mid", MID.x, 14, MID.w, 22, "What loads it"),
    text("h-win", WIN.x, 14, WIN.w, 22, "In the context window"),

    // Row 0: the harness's own prompt has no file in the repository.
    text("d-harness", DISK.x, ROW[0], DISK.w, H, "(written by the harness)"),
    win("w-harness", 0, "Harness prompt", tok(LAYERS.harnessPrompt), 1),

    // Rows 1-2: the root file and the skill descriptions load at start.
    disk("d-root", 1, `${LAYERS.root.path} (root)`, `${LAYERS.root.lines} lines · ${tok(LAYERS.root.tokens)}`),
    win("w-root", 1, `Root ${LAYERS.root.path}`, tok(LAYERS.root.tokens), 1),
    arrow("a-root", "d-root", "w-root", 1, "always"),
    disk("d-skills", 2, ".claude/skills/", `${SKILLS.length} skills · bodies ${fmt(LAYER_TOTALS.allBodies)}`),
    win("w-desc", 2, `${SKILLS.length} skill descriptions`, tok(LAYERS.descriptions), 1),
    arrow("a-desc", "d-skills", "w-desc", 1, "names + descriptions"),

    // Rows 3-5: scoped files and a doc the root file points to.
    disk("d-src", 3, LAYERS.src.path, `scoped rules · ${tok(LAYERS.src.tokens)}`),
    disk("d-web", 4, LAYERS.web.path, `${tok(LAYERS.web.tokens)} · not needed`),
    disk("d-docs", 5, LAYERS.docs.path, `${tok(LAYERS.docs.tokens)} · not needed`),
    pointer("p-skills", 2),
    pointer("p-src", 3),
    pointer("p-web", 4),
    pointer("p-docs", 5),

    // Row 6: tools. The agent's own tools and the search tool load; the MCP definitions stay deferred.
    disk(
      "d-mcp",
      6,
      `${DISCOVERY.allTools} MCP tool definitions`,
      `${tok(DISCOVERY.allTokens)} · deferred`,
      AGENT_TONE.action
    ),
    win("w-tools", 6, "4 tools + tool search", tok(LAYERS.tools), 1, { tone: AGENT_TONE.action }),
    text("m-tools", MID.x, ROW[6], MID.w, H, "found by search\nwhen a task needs one"),

    // Step 2: reading a file under src/ loads the scoped file.
    box("m-read", MID.x, ROW[3], MID.w, LAYERS.src.trigger, "the agent reads a file", AGENT_TONE.action, "pastel", 2, {
      highlight: true,
    }),
    win("w-src", 3, LAYERS.src.path, tok(LAYERS.src.tokens), 2),
    arrow("a-src1", "d-src", "m-read", 2),
    arrow("a-src2", "m-read", "w-src", 2),

    // Step 3: the task matches the run-tests description, so its body loads.
    box(
      "m-match",
      MID.x,
      ROW[4],
      MID.w,
      `Matches ${runTests.name}`,
      "the model reads SKILL.md",
      AGENT_TONE.model,
      "pastel",
      3
    ),
    win("w-skill", 4, `${runTests.name} skill body`, tok(runTests.body), 3),
    {
      ...arrow("a-skill1", "d-skills", "m-match", 3),
      // Round the scoped files: along the gap between the repository and the middle column.
      via: [
        [325, ROW[2] + H / 2],
        [325, ROW[4] + H / 2],
      ],
    },
    arrow("a-skill2", "m-match", "w-skill", 3),
    text(
      "totals",
      DISK.x,
      ROW[6] + H + 16,
      800,
      40,
      `Loaded by the end: ${tok(LAYER_TOTALS.loaded)}. Never loaded: ${fmt(LAYERS.web.tokens)} + ` +
        `${fmt(LAYERS.docs.tokens)} + two skill bodies + ${DISCOVERY.allTools} MCP definitions = ${tok(LAYER_TOTALS.notLoaded)}.\n` +
        "Counts illustrative; MCP sizes from Anthropic (Nov 2025).",
      3
    ),
  ],
};

export default spec;
