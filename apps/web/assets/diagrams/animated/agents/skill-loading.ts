import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import {
  RUN_TESTS_SKILL,
  SKILLS,
  SKILL_DESCRIPTION_TOKENS,
  SKILL_TOTALS,
} from "@/components/diagrams/presets/agents-disclosure";

// Skill loading on progressive-disclosure-and-agent-instructions (Core concepts, "Skills and on-demand capability
// loading"): the three levels of an Agent Skill, on the coding agent's run-tests skill (running example B). Level 1,
// each skill's name and description (about 100 tokens), is in the window from the start. Level 2, the SKILL.md body,
// loads when the model decides the task matches the description and reads the file. Level 3, bundled files, load
// only when read; a bundled script runs, and only its output enters the window. Levels as in the Agent Skills docs
// (platform.claude.com, checked 2026-11-15); token counts illustrative (SKILLS, RUN_TESTS_SKILL).
//
// Four steps: 1 names and descriptions at start · 2 the task matches, the body loads · 3 a bundled script runs, its
// output enters · 4 what stays on disk, with the totals.
//
// Layout: a level label column (x 20, 76 wide), the skill folder on disk (x 108, 240 wide, outlines), what loads it
// (x 376, 200 wide), the context window (x 604, 216 wide, pastel). Five rows, 56 apart from y 48: level 1, level 2,
// two level-3 files, the other two skills' bodies. A totals line under the last row at step 4.
//
// Colour (agents legend, three tones plus neutral): skill text neutral, the model's match green (the one highlight),
// the script run teal, the script's output blue.

const H = 44;
const ROW = [48, 104, 160, 216, 272] as const;
const LVL = { x: 20, w: 76 } as const;
const DISK = { x: 108, w: 240 } as const;
const MID = { x: 376, w: 200 } as const;
const WIN = { x: 604, w: 216 } as const;
const fmt = (n: number) => n.toLocaleString("en-GB");
const tok = (n: number) => `${fmt(n)} tokens`;

const box = (
  id: string,
  col: { x: number; w: number },
  row: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  fill: "paper" | "pastel",
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x: col.x, y: ROW[row], w: col.w, h: H, label, sub, tone, fill, step, ...extra });

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

const [runTests, ...others] = SKILLS;
const { reference, script } = RUN_TESTS_SKILL;
const otherBodies = others.reduce((s, x) => s + x.body, 0);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Skill loading: names first, the body when a task matches",
  width: 840,
  height: 384,
  steps: [
    { title: `At start: ${SKILLS.length} names and descriptions, ${tok(SKILLS.length * SKILL_DESCRIPTION_TOKENS)}` },
    { title: `The task matches ${runTests.name}: its body loads` },
    { title: "A bundled script runs; only its output enters" },
    { title: `Everything else stays on disk: ${tok(SKILL_TOTALS.onDisk)}` },
  ],
  shapes: [
    text("h-disk", DISK.x, 14, DISK.w, 22, "On disk: .claude/skills/"),
    text("h-mid", MID.x, 14, MID.w, 22, "What loads it"),
    text("h-win", WIN.x, 14, WIN.w, 22, "In the context window"),
    text("l1", LVL.x, ROW[0], LVL.w, H, "Level 1"),
    text("l2", LVL.x, ROW[1], LVL.w, H, "Level 2"),
    text("l3", LVL.x, ROW[2], LVL.w, ROW[3] + H - ROW[2], "Level 3"),
    text("l4", LVL.x, ROW[4], LVL.w, H, "Other\nskills"),

    // The skill folder, all on disk from the start.
    box(
      "d-meta",
      DISK,
      0,
      `${SKILLS.length} × SKILL.md frontmatter`,
      `name + description · ~${SKILL_DESCRIPTION_TOKENS} each`,
      AGENT_TONE.infra,
      "paper",
      1
    ),
    box("d-body", DISK, 1, `${runTests.name}: SKILL.md body`, tok(runTests.body), AGENT_TONE.infra, "paper", 1),
    box("d-ref", DISK, 2, reference.path, tok(reference.tokens), AGENT_TONE.infra, "paper", 1),
    box("d-script", DISK, 3, script.path, `${tok(script.codeTokens)} of code`, AGENT_TONE.infra, "paper", 1),
    box(
      "d-others",
      DISK,
      4,
      `${others.map((s) => s.name).join(", ")}`,
      `bodies · ${tok(otherBodies)}`,
      AGENT_TONE.infra,
      "paper",
      1
    ),

    // Step 1: level 1 is in the system prompt from the start.
    box(
      "w-meta",
      WIN,
      0,
      "Names + descriptions",
      tok(SKILLS.length * SKILL_DESCRIPTION_TOKENS),
      AGENT_TONE.infra,
      "pastel",
      1
    ),
    arrow("a-meta", "d-meta", "w-meta", 1, "at start"),

    // Step 2: the model matches the task to the description and reads SKILL.md.
    box("m-match", MID, 1, "Task matches", `"${runTests.name}" description`, AGENT_TONE.model, "pastel", 2, {
      highlight: true,
    }),
    box("w-body", WIN, 1, `${runTests.name} body`, tok(runTests.body), AGENT_TONE.infra, "pastel", 2),
    arrow("a-body1", "d-body", "m-match", 2),
    arrow("a-body2", "m-match", "w-body", 2),

    // Step 3: the body says to run the script; its code never enters, its output does.
    box("m-run", MID, 3, `bash ${script.path}`, "the code runs, unread", AGENT_TONE.action, "pastel", 3),
    box("w-out", WIN, 3, script.output, `output only · ${tok(script.outputTokens)}`, AGENT_TONE.result, "pastel", 3),
    arrow("a-run1", "d-script", "m-run", 3),
    arrow("a-run2", "m-run", "w-out", 3),

    // Step 4: what was never read.
    text("m-ref", MID.x, ROW[2], MID.w, H, "not needed for this bug:\nnever read", 4),
    text("m-others", MID.x, ROW[4], MID.w, H, "descriptions did not match:\nbodies never read", 4),
    text(
      "totals",
      LVL.x,
      ROW[4] + H + 16,
      800,
      40,
      `In the window: ${fmt(SKILLS.length * SKILL_DESCRIPTION_TOKENS)} + ${fmt(runTests.body)} + ${script.outputTokens} = ` +
        `${tok(SKILL_TOTALS.loaded)}. Left on disk: ${tok(SKILL_TOTALS.onDisk)}.\nLevels from the Agent Skills docs; counts illustrative.`,
      4
    ),
  ],
};

export default spec;
