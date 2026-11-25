import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { CLAIM, TASK_STATES } from "@/components/diagrams/presets/agents-a2a";

// A task's life on agent-to-agent-protocols (Core concepts, "Tasks, messages and artefacts"; the worked example
// follows it): Brightpost's damage claim at the courier's agent, from submitted to completed, with the
// "input required" detour. States are the A2A v1.0 TaskState values (specification/a2a.proto, checked 2026-11-15):
// SUBMITTED and WORKING are active; INPUT_REQUIRED and AUTH_REQUIRED are "interrupted" (the task waits for the client);
// COMPLETED, FAILED, CANCELED and REJECTED are terminal, and a terminal task cannot restart.
//
// Five steps: 1 Brightpost sends the claim; the courier's agent creates the task (submitted) · 2 the agent starts
// work (working) and checks the parcel · 3 it needs a photo: input required (ringed) · 4 Brightpost answers on the
// same task with a photo: working again · 5 completed, with the claim as an artifact that goes back to Brightpost.
// Every state is on the canvas from step 1 so the whole map is visible; the steps add the path this task takes.
//
// Layout: client (x 20) and artifact (x 440) on the top row, y 40; the active states on y 160 (submitted x 20,
// working x 240); the interrupted states on y 300 with a caption line under them (a group's title tab would sit on
// the detour arrows); the four terminal states in a column at
// x 654 (w 152) inside a group (completed y 84 so the path from working bends once at x 530). The detour is two vertical
// arrows 70 apart (x 290 down, x 360 up) with their labels as text beside them, so the labels never meet.
//
// Colour (agents legend, four tones plus neutral): agents and working green; the interrupted states orange (they wait
// on the task-giver); completed and the artifact blue (what comes back); failed and rejected red; submitted and
// canceled neutral. One highlight: input required.

const W = 176;
const H = 52;
const TERM_X = 654;
const TERM_W = 152;

const state = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w: W, h: H, label, sub, tone, quiet: true, ...extra });

const terminal = (id: string, y: number, label: string, sub: string, tone: LayoutShape["tone"]): LayoutShape => ({
  ...state(id, TERM_X, y, label, sub, tone),
  w: TERM_W,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A task's life: submitted to completed, with a detour for input",
  width: 830,
  height: 390,
  steps: [
    { title: "Brightpost sends the claim: submitted" },
    { title: "The courier's agent starts: working" },
    { title: "It needs a photo: input required" },
    { title: "A photo arrives on the same task: working again" },
    { title: "Done: completed, with the claim as an artifact" },
  ],
  groups: [{ id: "terminal", title: "Terminal", tone: AGENT_TONE.infra, x: 640, y: 60, w: 180, h: 306 }],
  shapes: [
    {
      id: "client",
      type: "box",
      x: 20,
      y: 40,
      w: 160,
      h: H,
      label: "Brightpost agent",
      sub: "the A2A client",
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    { id: "send", type: "arrow", x: 100, y: 92, w: 0, h: 68, label: "SendMessage", packet: true },

    // Every state from step 1: the map. Short labels, the exact enum name underneath.
    state("submitted", 20, 160, "Submitted", TASK_STATES.submitted, AGENT_TONE.infra, { w: 160, quiet: undefined }),
    state("working", 240, 160, "Working", TASK_STATES.working, AGENT_TONE.model, { fill: "pastel" }),
    state("input", 240, 300, "Input required", TASK_STATES.inputRequired, AGENT_TONE.task, {
      fill: "pastel",
      highlight: true,
    }),
    state("auth", 440, 300, "Auth required", TASK_STATES.authRequired, AGENT_TONE.task),
    {
      id: "interrupted",
      type: "text",
      x: 240,
      y: 358,
      w: 370,
      h: 22,
      label: "Interrupted: the task waits for the client",
      tone: AGENT_TONE.task,
      quiet: true,
    },
    terminal("completed", 84, "Completed", TASK_STATES.completed, AGENT_TONE.result),
    terminal("failed", 154, "Failed", TASK_STATES.failed, AGENT_TONE.failure),
    terminal("canceled", 224, "Canceled", TASK_STATES.canceled, AGENT_TONE.infra),
    terminal("rejected", 294, "Rejected", TASK_STATES.rejected, AGENT_TONE.failure),

    // Step 2: work starts.
    { id: "start", type: "arrow", x: 0, y: 0, from: "submitted", to: "working", step: 2, packet: true },
    {
      id: "checks",
      type: "text",
      x: 240,
      y: 108,
      w: W,
      h: 40,
      label: `checks parcel ${CLAIM.tracking}\nwith its own tools`,
      tone: AGENT_TONE.infra,
      step: 2,
    },

    // Step 3: the detour down.
    { id: "ask", type: "arrow", x: 290, y: 212, w: 0, h: 88, step: 3, packet: true },
    {
      id: "ask-text",
      type: "text",
      x: 110,
      y: 236,
      w: 170,
      h: 40,
      label: `"${CLAIM.ask.split(" and")[0]}"`,
      tone: AGENT_TONE.infra,
      step: 3,
    },

    // Step 4: back up, on the same taskId.
    { id: "answer", type: "arrow", x: 360, y: 300, w: 0, h: -88, step: 4, packet: true },
    {
      id: "answer-text",
      type: "text",
      x: 372,
      y: 210,
      w: 190,
      h: 40,
      label: "photo as a file part,\nsame taskId",
      tone: AGENT_TONE.infra,
      step: 4,
    },

    // Step 5: done; the result travels as an artifact.
    {
      id: "finish",
      type: "arrow",
      x: 0,
      y: 0,
      from: "working",
      to: "completed",
      via: [
        [530, 186],
        [530, 110],
      ],
      step: 5,
      packet: true,
    },
    {
      id: "artifact",
      type: "box",
      x: 440,
      y: 40,
      w: W,
      h: H,
      label: "Artifact",
      sub: `claim ${CLAIM.claimId}, £${CLAIM.amount}`,
      tone: AGENT_TONE.result,
      fill: "pastel",
      step: 5,
    },
    { id: "release", type: "arrow", x: 0, y: 0, from: "completed", to: "artifact", step: 5 },
    { id: "back", type: "arrow", x: 0, y: 0, from: "artifact", to: "client", step: 5, packet: true },
  ],
};

export default spec;
