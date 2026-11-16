import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { SANDBOX } from "@/components/diagrams/presets/agents-env";
import { ISOLATION_LAYERS } from "@/components/diagrams/presets/agents-security";

// How strong a sandbox's wall is (agent-security-and-sandboxing, Core concepts "Sandboxes: containers, microVMs and
// network egress"). The sandbox-boundaries figure on ai-first-environment-and-tool-scaffolding shows the three fences
// (files, network, credentials); this one shows what stands between an agent's command and the host kernel in three
// isolation technologies, weakest to strongest: a container (namespaces, cgroups and seccomp are features of the host
// kernel itself, so one kernel or runtime bug reaches the host: runc CVE-2024-21626, January 2024), gVisor (the Sentry,
// a user-space kernel, handles every system call and passes none straight through) and a Firecracker microVM (its own
// guest kernel behind KVM, five emulated devices, a jailer behind that). The last step adds the network fence, which
// none of the three provides by itself. Facts in presets/agents-security.ts, checked 2026-11-16.
//
// Four steps: 1 container · 2 gVisor · 3 microVM · 4 an egress allow-list under all three.
//
// Layout: three columns at x 20, 310 and 600, each 260 wide: a title (y 34), the agent's command (y 66), two walls
// (y 124 and y 180), then one host-kernel bar across all three (y 258), with an arrow from each column's lower wall.
// Under the bar, per column, what an escape needs (y 326) and what the layer costs (y 386). The egress bar spans all
// three at y 430.
//
// Colour (agents legend, three tones plus neutral): the command teal, the walls and the egress allow-list lime (they
// are checks), the host kernel and the cost notes neutral, the container's escape red (a published escape broke it).
// The microVM's guest kernel carries the one highlight.

const COL_X = [20, 310, 600] as const;
const COL_W = 260;
const Y = { title: 34, cmd: 66, wall1: 124, wall2: 180, host: 258, escape: 326, cost: 386, egress: 430 } as const;
const BOX_H = 46;

const column = (layer: (typeof ISOLATION_LAYERS)[number], i: number): LayoutShape[] => {
  const x = COL_X[i];
  const step = i + 1;
  return [
    { id: `${layer.id}-title`, type: "text", x, y: Y.title, w: COL_W, h: 24, label: layer.title, step, quiet: true },
    {
      id: `${layer.id}-cmd`,
      type: "box",
      x,
      y: Y.cmd,
      w: COL_W,
      h: BOX_H,
      label: "Agent's command",
      sub: "run_tests, npm install",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step,
      quiet: true,
    },
    ...layer.walls.map((wall, j): LayoutShape => ({
      id: `${layer.id}-wall-${j}`,
      type: "box",
      x,
      y: j === 0 ? Y.wall1 : Y.wall2,
      w: COL_W,
      h: BOX_H,
      label: wall.label,
      sub: wall.sub,
      tone: AGENT_TONE.check,
      fill: "pastel",
      step,
      quiet: j === 1,
      highlight: layer.id === "microvm" && j === 0,
    })),
    { id: `${layer.id}-down`, type: "arrow", x: 0, y: 0, from: `${layer.id}-wall-1`, to: "host", step },
    {
      id: `${layer.id}-escape`,
      type: "box",
      x,
      y: Y.escape,
      w: COL_W,
      h: 52,
      label: `To reach the host:\n${layer.escape}`,
      sub: layer.escapeSub,
      tone: layer.id === "container" ? AGENT_TONE.failure : AGENT_TONE.infra,
      fill: layer.id === "container" ? "pastel" : "soft",
      step,
      quiet: true,
    },
    { id: `${layer.id}-cost`, type: "text", x, y: Y.cost, w: COL_W, h: 24, label: layer.cost, step, quiet: true },
  ];
};

const spec: LayoutSpec = {
  kind: "layout",
  title: "Sandbox strength: container, gVisor, microVM, and the network fence under all three",
  width: 880,
  height: 490,
  steps: [
    { title: "Container: walls made of the host kernel" },
    { title: "gVisor: a kernel in user space in between" },
    { title: "microVM: its own kernel behind hardware virtualisation" },
    { title: "Under all three: an egress allow-list" },
  ],
  shapes: [
    {
      id: "host",
      type: "box",
      x: 20,
      y: Y.host,
      w: 840,
      h: 44,
      label: "Host Linux kernel",
      sub: "shared by every sandbox on the machine",
      tone: AGENT_TONE.infra,
      fill: "soft",
    },
    ...ISOLATION_LAYERS.flatMap(column),
    {
      id: "egress",
      type: "box",
      x: 20,
      y: Y.egress,
      w: 840,
      h: 46,
      label: `Egress allow-list: ${SANDBOX.allowedHost} only`,
      sub: "the walls above stop escapes, not uploads: every layer needs this too",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 4,
    },
  ],
};

export default spec;
