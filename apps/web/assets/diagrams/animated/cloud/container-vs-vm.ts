import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// Containers versus virtual machines on one physical server (cloud/compute/containers-and-registries). One idea:
// three VMs each carry their own operating system and kernel; three containers share the host's one kernel.
//
// Step 1 draws the two stacks side by side. On the left, a hypervisor splits the server into three VMs, and each VM
// stacks its own guest OS, libraries and app. On the right, one host OS and a container runtime hold three columns
// that are only libraries and app. The shared kernel is highlighted, because the paragraph is about it.
// Step 2 adds two rows under each stack: what a new copy costs (boot an OS against start a process), and where the
// wall between copies is (its own kernel against one shared kernel). Tones: green is what that side gives you,
// orange what it costs.
//
// Geometry: groups at x 10 and 405, each 375 wide, y 34 to 314. Copy columns are 108 wide with a gap of 10, starting
// at x 26 (VMs) and 421 (containers), so the third ends at 370 or 765. Rows: app 60, libraries 106, guest OS or
// runtime 152 (44 tall), hypervisor or host OS 206, server 256. Step-2 rows at y 334 and 392 (a 14-unit gap keeps the NEW badges clear), outside the groups.
// Box labels fit width - 8 at 6.2 px per character: "Wall: its own kernel per VM" (27) needs 175 of 336.

const COPY_X = [0, 118, 236];

const column = (side: "vm" | "ctr", x0: number): LayoutShape[] =>
  COPY_X.flatMap((dx, i): LayoutShape[] => {
    const n = i + 1;
    const shapes: LayoutShape[] = [
      { id: `${side}-app${n}`, type: "box", x: x0 + dx, y: 60, w: 108, h: 40, label: `App ${n}`, tone: "teal" },
      { id: `${side}-lib${n}`, type: "box", x: x0 + dx, y: 106, w: 108, h: 40, label: "Libraries", tone: "neutral" },
    ];
    if (side === "vm") {
      shapes.push({
        id: `vm-os${n}`,
        type: "box",
        x: x0 + dx,
        y: 152,
        w: 108,
        h: 44,
        label: "Guest OS",
        sub: "its own kernel",
        tone: "orange",
      });
    }
    return shapes;
  });

const shapes: LayoutShape[] = [
  // The VM side.
  ...column("vm", 26),
  {
    id: "vm-hyper",
    type: "box",
    x: 26,
    y: 206,
    w: 344,
    h: 40,
    label: "Hypervisor",
    sub: "splits the server into VMs",
    tone: "blue",
  },
  { id: "vm-hw", type: "box", x: 26, y: 256, w: 344, h: 40, label: "Physical server", tone: "neutral" },

  // The container side.
  ...column("ctr", 421),
  {
    id: "ctr-runtime",
    type: "box",
    x: 421,
    y: 152,
    w: 344,
    h: 44,
    label: "Container runtime",
    sub: "starts each app as a fenced process",
    tone: "blue",
  },
  {
    id: "ctr-host",
    type: "box",
    x: 421,
    y: 206,
    w: 344,
    h: 40,
    label: "Host OS",
    sub: "one kernel, shared by every container",
    tone: "violet",
    highlight: true,
  },
  { id: "ctr-hw", type: "box", x: 421, y: 256, w: 344, h: 40, label: "Physical server", tone: "neutral" },

  // Step 2: what a new copy costs, and where the wall is.
  {
    id: "vm-start",
    type: "box",
    x: 26,
    y: 334,
    w: 344,
    h: 44,
    label: "New copy: boot a whole OS",
    sub: "1 to 3 minutes, a disk of gigabytes",
    tone: "orange",
    step: 2,
  },
  {
    id: "ctr-start",
    type: "box",
    x: 421,
    y: 334,
    w: 344,
    h: 44,
    label: "New copy: start a process",
    sub: "seconds, if the image is already on the server",
    tone: "green",
    step: 2,
  },
  {
    id: "vm-wall",
    type: "box",
    x: 26,
    y: 392,
    w: 344,
    h: 44,
    label: "Wall: its own kernel per VM",
    sub: "a kernel flaw stays inside one VM",
    tone: "green",
    step: 2,
  },
  {
    id: "ctr-wall",
    type: "box",
    x: 421,
    y: 392,
    w: 344,
    h: 44,
    label: "Wall: one shared kernel",
    sub: "a kernel flaw can reach every container",
    tone: "orange",
    step: 2,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Virtual machines and containers on one server",
  width: 790,
  height: 452,
  groups: [
    { id: "vms", title: "Three virtual machines", tone: "orange", x: 10, y: 34, w: 375, h: 280 },
    { id: "ctrs", title: "Three containers", tone: "teal", x: 405, y: 34, w: 375, h: 280 },
  ],
  shapes,
  steps: [{ title: "Two stacks on the same server" }, { title: "What a new copy costs, and where the wall is" }],
};

export default spec;
