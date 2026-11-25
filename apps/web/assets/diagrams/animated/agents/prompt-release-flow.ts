import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import {
  CACHE_TTL_S,
  CANARY,
  CANARY_RATES,
  NEW_CASES,
  OFFLINE,
  PROMPT_VERSIONS,
} from "@/components/diagrams/presets/agents-prompts";

// How one prompt change is released (prompt-management-versioning, Architecture and the worked example). Brightpost's
// system prompt goes from v12 to v13, which adds a refund-wording rule. v13 is saved as a new version, passes the
// offline gate on the fixed set, and goes to 5 % of chats. The canary gate compares live signals with v12, catches a
// rise in hand-offs to a person on return visits, and the rollback moves the canary label back to v12 without a deploy.
// The failing chats become new fixed cases, so the offline gate catches the same mistake next time.
//
// Seven steps: 1 save v13 · 2 offline gate on the fixed set · 3 canary at 5 % · 4 canary gate · 5 the regression ·
// 6 roll back by moving the label · 7 failures become fixed cases. Nodes never move.
//
// Layout: three columns (x 120, 400, 690; 190 wide, gaps of 90 for the edge labels) and three rows (y 80, 235, 390).
// Top: the draft, the registry, the rollback. Middle: the fixed set, the offline gate, the canary. Bottom: the
// regression and the canary gate. The "roll back" path runs down the right edge (x 835); the "new cases" path runs
// along the bottom-left into the fixed set.
//
// Colour (agents legend, three tones plus neutral): the registry and the fixed set violet (stores), both gates lime
// (the canary gate is the accent), the regression red, everything else neutral. Canary counts are illustrative.

const COL = [120, 400, 690] as const;
const ROW = [80, 235, 390] as const;
const W = 190;

const spec: DiagramSpec = {
  title: "A prompt release: version, evaluate, canary, monitor, roll back",
  width: 870,
  height: 450,
  steps: [
    { title: `${PROMPT_VERSIONS.candidate} is saved as a new version` },
    { title: "The offline gate runs it on the fixed set" },
    { title: `It passes: ${CANARY.share * 100} % of chats get ${PROMPT_VERSIONS.candidate}` },
    { title: `The canary gate compares it with ${PROMPT_VERSIONS.live}, live` },
    { title: "It catches a regression" },
    { title: "Roll back: move the label, not the code" },
    { title: "The failures become fixed cases" },
  ],
  zones: [],
  nodes: [
    {
      id: "draft",
      label: `${PROMPT_VERSIONS.candidate} drafted`,
      sub: "new refund wording",
      icon: "git-commit",
      tone: AGENT_TONE.infra,
      x: COL[0],
      y: ROW[0],
      w: W,
    },
    {
      id: "registry",
      label: "Prompt registry",
      sub: `prod label → ${PROMPT_VERSIONS.live}`,
      icon: "database",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: COL[1],
      y: ROW[0],
      w: W,
    },
    {
      id: "cases",
      label: "Fixed eval set",
      sub: `${OFFLINE.cases} single-turn chats`,
      icon: "file",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 2,
      x: COL[0],
      y: ROW[1],
      w: W,
    },
    {
      id: "offline",
      label: "Offline gate",
      sub: `${OFFLINE.candidate} vs ${OFFLINE.live} of ${OFFLINE.cases}`,
      icon: "test-tube",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 2,
      x: COL[1],
      y: ROW[1],
      w: W,
    },
    {
      id: "canary",
      label: `Canary: ${CANARY.share * 100} %`,
      sub: "split by chat id",
      icon: "route",
      tone: AGENT_TONE.infra,
      step: 3,
      x: COL[2],
      y: ROW[1],
      w: W,
    },
    {
      id: "gate",
      label: "Canary gate",
      sub: `${PROMPT_VERSIONS.candidate} vs ${PROMPT_VERSIONS.live}, live`,
      icon: "activity",
      tone: AGENT_TONE.check,
      accent: true,
      step: 4,
      x: COL[2],
      y: ROW[2],
      w: W,
    },
    {
      id: "regression",
      label: `Hand-offs ${CANARY_RATES.candidatePct} % vs ${CANARY_RATES.livePct} %`,
      sub: "on return visits",
      icon: "users",
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 5,
      x: COL[1],
      y: ROW[2],
      w: 215,
    },
    {
      id: "rollback",
      label: "Roll back",
      sub: `canary → ${PROMPT_VERSIONS.live} in ${CACHE_TTL_S} s`,
      icon: "history",
      tone: AGENT_TONE.infra,
      step: 6,
      x: COL[2],
      y: ROW[0],
      w: W,
    },
  ],
  edges: [
    // Step 1: a new immutable version; prod still points at v12.
    { from: "draft", to: "registry", label: "save", packet: true },

    // Step 2: the candidate runs on the fixed set.
    { from: "registry", to: "offline", label: PROMPT_VERSIONS.candidate, packet: true, step: 2 },
    { from: "cases", to: "offline", label: "cases", packet: true, step: 2 },

    // Step 3: it passes, so the canary label moves to v13.
    { from: "offline", to: "canary", label: "pass", packet: true, step: 3 },

    // Step 4: live signals from both arms.
    { from: "canary", to: "gate", label: "live signals", packet: true, step: 4 },

    // Step 5: the gate flags the hand-off rate.
    { from: "gate", to: "regression", label: "flags", packet: true, step: 5 },

    // Step 6: roll back along the right edge, then move the label in the registry.
    {
      from: "gate",
      to: "rollback",
      label: "fail",
      packet: true,
      via: [
        [835, ROW[2]],
        [835, ROW[0]],
      ],
      step: 6,
    },
    { from: "rollback", to: "registry", label: "move", packet: true, step: 6 },

    // Step 7: the failing chats join the fixed set.
    {
      from: "regression",
      to: "cases",
      label: `+${NEW_CASES.added} cases`,
      dashed: true,
      flow: true,
      via: [[COL[0], ROW[2]]],
      step: 7,
    },
  ],
};

export default spec;
