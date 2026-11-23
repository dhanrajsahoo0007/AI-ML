import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { CODING_TASK } from "@/components/diagrams/presets/gcase-code";

// Agent safety: tiers, fences, packages (code-assistant, design sheet §15 deep dive 2, §14 network policy and threats,
// §9 walk-through step 4; CODING_TASK from presets/agents.ts via gcase-code.ts). Three tool calls from the agent on
// Brightpost's CSV fix, each decided in code, never in the prompt:
//   1 run("npm test"): the policy engine (deny → ask → allow, from managed settings) allows it in the sandbox without a
//     prompt; a snapshot of the worktree comes first; a test helper tries a telemetry host: the sandbox has no network
//     and no resolver, so the call is refused; CODING_TASK.testsTotal = 18 tests, 1 fails ("parses an empty file"); the
//     output goes back to the model marked as data.
//   2 install("left-padd"): an ask-tier tool; before anyone is asked, the read-only registry mirror checks that the
//     package exists, is older than 14 days and above a download floor: a typo of a real package fails, so it is
//     refused with a message and the developer never sees a prompt to approve on autopilot.
//   3 write .vscode/settings.json: a deny rule on IDE, harness, MCP, hook and permission files (the route of
//     CVE-2025-53773): refused, whatever the model was told.
// Steps: 1 a command in the sandbox · 2 a package through the mirror · 3 a config write.
// Lanes (SEQUENCE_LANE, section tones only, labels ≤ 15 characters): Agent model green, Orchestrator neutral (harness),
// Policy engine teal (check), Sandbox blue (what comes back: results), Mirror violet (a store of packages).
// The package name and the telemetry host are illustrative.

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: a command in the sandbox.
  m("model", "orch", 'run("npm test")', 1),
  m("orch", "policy", "check: run npm test", 1),
  m("policy", "orch", "allow, in the sandbox", 1, "return"),
  m("orch", "sandbox", "snapshot, then npm test", 1),
  m("sandbox", "orch", `${CODING_TASK.testsTotal} tests: 1 failed`, 1, "return"),
  m("orch", "model", "test output, marked as data", 1, "return"),

  // Step 2: a package through the mirror.
  m("model", "orch", 'install("left-padd")', 2),
  m("orch", "policy", "check: install", 2),
  m("policy", "orch", "ask tier: mirror checks first", 2, "return"),
  m("orch", "mirror", "left-padd: exists? 14 days old?", 2),
  m("mirror", "orch", "no such package: refused", 2, "return"),
  m("orch", "model", "refused: not in the mirror", 2, "return"),

  // Step 3: a config write.
  m("model", "orch", "write .vscode/settings.json", 3),
  m("orch", "policy", "check: write", 3),
  m("policy", "orch", "deny: IDE config", 3, "return"),
  m("orch", "model", "denied by a managed rule", 3, "return"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "policy", text: "deny → ask → allow, from managed settings only", step: 1, at: firstOf(1) + 1.5 },
  {
    lane: "sandbox",
    text: "a test helper calls a telemetry host: no network, no resolver, refused",
    step: 1,
    at: firstOf(1) + 3.5,
  },
  { lane: "mirror", text: "read-only; install scripts off", step: 2, at: firstOf(2) + 3.5 },
  { lane: "orch", text: "a failed check never reaches the developer", step: 2, at: firstOf(2) + 4.5 },
  { lane: "policy", text: "IDE, harness, MCP, hook and permission files", step: 3, at: firstOf(3) + 2.5 },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Three tool calls, three outcomes decided in code: allowed in the sandbox, refused by the mirror, denied",
  width: 1000,
  lanes: [
    { id: "model", label: "Agent model", icon: "model", tone: SEQUENCE_LANE.model },
    { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "policy", label: "Policy engine", icon: "policy", tone: SEQUENCE_LANE.check },
    { id: "sandbox", label: "Sandbox", icon: "sandbox", tone: SEQUENCE_LANE.data },
    { id: "mirror", label: "Mirror", icon: "registry", tone: SEQUENCE_LANE.store },
  ],
  steps: [
    { title: "npm test runs in the sandbox; a call out is refused; the failure goes back as data" },
    { title: "A typo-squatted package fails the mirror's checks before anyone is asked" },
    { title: "A write to the IDE's settings is denied by a managed rule" },
  ],
  messages,
  notes,
};

export default spec;
