import type { DiagramSpec } from "@/components/diagrams/types";

// Shared responsibility, told as Brightpost's unpatched database machine (cloud/fundamentals/shared-responsibility).
// Step 1: the orders database runs on a virtual machine. Brightpost secures five of its six layers; the provider
// secures only the host and the building. Step 2 (the failure step): a scanning bot comes in through the open
// database port and uses an operating-system flaw that was 38 days old, then locks the data. Step 3: the
// image-resize worker runs as a function, so the runtime and the operating system move to the provider's side.
// Step 4: the orders database moves to a managed database, so the engine moves across too. Step 5: a posture check
// reads the settings of every service and flags what is wrong on Brightpost's side.
//
// The picture is three stacks of the same six layers, one stack per way of running a workload. Each stack is two
// zones that touch: "Yours" on top and "The provider's" below. The shared border is the line, and the provider
// zone's tab sits on it, so the reader sees the line step up from one stack to the next.
//
// Rows are aligned across the stacks, so the same layer sits at the same height in every stack:
// data 87 | who may connect 175 | network or callers 263 | code or engine 351 | OS or runtime 439 | service 527.
// Columns (centres): intruder 59 | VM stack 270 | function stack 477 | managed database stack 684.
// The row pitch is 88 so that the line can fall between any two rows: the line sits 20 below the last node of the
// "Yours" zone, and the first node of "The provider's" sits 26 below the line, clear of the tab.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 happen in
// the intruder column and the VM stack, so the free preview and the failure are visible without scrolling.
// The stacks go from left to right in the order the line rises: 5 layers yours, then 4, then 3.
//
// Nodes never move. The attack is drawn only as edges that end at step 2 (`until: 2`); the intruder node stays.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Cloud Run functions",
// "Security Command Center"), not only for the generic label.
const spec: DiagramSpec = {
  title: "Where the provider's security work ends and yours begins",
  width: 790,
  height: 708,
  steps: [
    { title: "A database on a VM: the line is low" },
    { title: "A flaw nobody patched" },
    { title: "A function: the OS and runtime move across" },
    { title: "A managed database: the engine moves too" },
    { title: "A posture check reads your side" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", kind: "subnet", x: 6, y: 180, w: 106, h: 260 },
    { id: "vm-yours", title: "Yours: VM", tone: "orange", x: 172, y: 40, w: 196, h: 440 },
    { id: "vm-provider", title: "The provider's", tone: "neutral", x: 172, y: 480, w: 196, h: 82 },
    { id: "fn-yours", title: "Yours: function", tone: "orange", x: 374, y: 40, w: 206, h: 352 },
    { id: "fn-provider", title: "The provider's", tone: "neutral", x: 374, y: 392, w: 206, h: 170 },
    { id: "db-yours", title: "Yours: managed DB", tone: "orange", x: 586, y: 40, w: 196, h: 264 },
    { id: "db-provider", title: "The provider's", tone: "neutral", x: 586, y: 304, w: 196, h: 258 },
    { id: "checks", title: "Checks", tone: "orange", x: 172, y: 600, w: 610, h: 94 },
  ],
  nodes: [
    // Step 1: the orders database on a virtual machine. Everything above the host is Brightpost's job.
    {
      id: "vm-data",
      label: "Orders data",
      sub: "90,000 customers",
      icon: "ledger",
      tone: "violet",
      x: 270,
      y: 87,
      w: 180,
      h: 42,
    },
    {
      id: "vm-access",
      label: "Who may connect",
      sub: "database users",
      icon: "lock",
      tone: "red",
      x: 270,
      y: 175,
      w: 180,
      h: 42,
    },
    {
      id: "vm-network",
      label: "Network rules",
      sub: "port open to all",
      icon: "firewall",
      tone: "blue",
      x: 270,
      y: 263,
      w: 180,
      h: 42,
    },
    {
      id: "vm-engine",
      label: "Database engine",
      sub: "you install, patch",
      icon: "workers",
      tone: "teal",
      x: 270,
      y: 351,
      w: 180,
      h: 42,
    },
    {
      id: "vm-os",
      label: "Operating system",
      sub: "you patch it",
      icon: "cpu",
      tone: "teal",
      x: 270,
      y: 439,
      w: 180,
      h: 42,
    },
    {
      id: "vm",
      label: "Virtual machine",
      sub: "host and building",
      icon: "server",
      tone: "teal",
      x: 270,
      y: 527,
      w: 180,
      h: 42,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },

    // Step 2: the failure. A bot on the internet finds the open port and the unpatched flaw.
    {
      id: "intruder",
      label: "Intruder",
      sub: "scanning bot",
      icon: "robot",
      tone: "red",
      variant: "glyph",
      step: 2,
      x: 59,
      y: 290,
    },

    // Step 3: the image-resize worker as a function. The runtime and the OS are the provider's now.
    {
      id: "fn-data",
      label: "Product photos",
      sub: "uploads, thumbnails",
      icon: "media",
      tone: "violet",
      step: 3,
      x: 477,
      y: 87,
      w: 180,
      h: 42,
    },
    {
      id: "fn-access",
      label: "Permissions",
      sub: "two buckets only",
      icon: "policy",
      tone: "red",
      step: 3,
      x: 477,
      y: 175,
      w: 180,
      h: 42,
    },
    {
      id: "fn-callers",
      label: "Who can call it",
      sub: "new uploads only",
      icon: "link",
      tone: "blue",
      step: 3,
      x: 477,
      y: 263,
      w: 180,
      h: 42,
    },
    {
      id: "fn-code",
      label: "Code + libraries",
      sub: "you update them",
      icon: "file",
      tone: "teal",
      step: 3,
      x: 477,
      y: 351,
      w: 180,
      h: 42,
    },
    {
      id: "fn-runtime",
      label: "Runtime and OS",
      sub: "patched for you",
      icon: "cpu",
      tone: "teal",
      step: 3,
      x: 477,
      y: 439,
      w: 180,
      h: 42,
    },
    {
      id: "fn",
      label: "Function service",
      sub: "servers, scaling",
      icon: "function",
      tone: "teal",
      step: 3,
      x: 477,
      y: 527,
      w: 196,
      h: 42,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },

    // Step 4: the orders database on a managed service. The engine and the OS are the provider's now.
    {
      id: "db-data",
      label: "Orders data",
      sub: "90,000 customers",
      icon: "ledger",
      tone: "violet",
      step: 4,
      x: 684,
      y: 87,
      w: 180,
      h: 42,
    },
    {
      id: "db-access",
      label: "Who may connect",
      sub: "database users",
      icon: "lock",
      tone: "red",
      step: 4,
      x: 684,
      y: 175,
      w: 180,
      h: 42,
    },
    {
      id: "db-network",
      label: "Network rules",
      sub: "private only",
      icon: "firewall",
      tone: "blue",
      step: 4,
      x: 684,
      y: 263,
      w: 180,
      h: 42,
    },
    {
      id: "db-engine",
      label: "Database engine",
      sub: "patched for you",
      icon: "workers",
      tone: "teal",
      step: 4,
      x: 684,
      y: 351,
      w: 180,
      h: 42,
    },
    {
      id: "db-os",
      label: "Operating system",
      sub: "patched for you",
      icon: "cpu",
      tone: "teal",
      step: 4,
      x: 684,
      y: 439,
      w: 180,
      h: 42,
    },
    {
      id: "db",
      label: "Database service",
      sub: "servers, building",
      icon: "database",
      tone: "violet",
      step: 4,
      x: 684,
      y: 527,
      w: 180,
      h: 42,
      cloud: { aws: "aws-rds", gcp: "gcp-cloud-sql", azure: { id: "azure-postgresql", label: "Azure PostgreSQL" } },
    },

    // Step 5: a tool that reads every service's settings and flags what is wrong on Brightpost's side.
    {
      id: "posture",
      label: "Posture check",
      sub: "flags your settings",
      icon: "radar",
      tone: "orange",
      step: 5,
      x: 477,
      y: 655,
      w: 240,
      h: 42,
      cloud: { aws: "aws-security-hub", gcp: "gcp-scc", azure: "azure-defender" },
    },
  ],
  edges: [
    // Step 2: in through the open port, then the old flaw, then the data is locked. All three end with step 2.
    {
      from: "intruder",
      to: "vm-network",
      label: "open port",
      tone: "red",
      packet: true,
      labelAt: 0.6,
      step: 2,
      until: 2,
    },
    {
      from: "intruder",
      to: "vm-os",
      label: "old flaw",
      tone: "red",
      packet: true,
      delay: 1.2,
      labelAt: 0.6,
      step: 2,
      until: 2,
    },
    {
      from: "intruder",
      to: "vm-data",
      label: "locks data",
      tone: "red",
      packet: true,
      delay: 2.4,
      // Up the gap left of the VM stack, then straight into the data layer, clear of "Who may connect".
      via: [[150, 87]],
      labelAt: 0.55,
      step: 2,
      until: 2,
    },

    // Step 5: the posture check reads the settings of each service from below, clear of the zone tabs.
    { from: "posture", to: "vm", dashed: true, flow: true, step: 5 },
    { from: "posture", to: "fn", label: "reads settings", dashed: true, flow: true, step: 5 },
    { from: "posture", to: "db", dashed: true, flow: true, step: 5 },
  ],
};

export default spec;
