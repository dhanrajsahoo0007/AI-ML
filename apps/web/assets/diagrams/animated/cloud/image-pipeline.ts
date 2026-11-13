import type { DiagramSpec } from "@/components/diagrams/types";

// Running a fleet over time, told as Brightpost's missed patch (cloud/operations/config-patching-and-fleet-management).
// Step 1: an engineer patches hand-built servers over SSH, one address at a time, from a list kept by hand; 2 servers
// were never on it. Step 2 (the failure step): a vulnerability scan, switched on for running servers on day 21, finds
// the flaw still on those 2. Step 3: an agent on every server reports to a fleet manager, which now sees 9 of 9 and
// feeds the scanner; commands travel through the same agent, so SSH is closed. Step 4: a patch baseline and a weekly
// window tell the fleet manager what to install and when. Step 5: an image pipeline bakes the newest base image with
// patches and the agent, tests it and stores v14. Step 6: the shop's scaling group replaces its servers from v14,
// one at a time. Step 7: config rules check every hour that servers still match.
//
// Nodes never move between steps. The hand-kept list is not a node, because later steps remove it: it is the label
// of the step-1 SSH edge (`until: 2`). The red "flaw found" edge also ends at step 2.
//
// Layout: three columns.
//   Left (x 120), "the people and tools that operate": engineers, flaw scanner, fleet manager, patch baseline.
//   Middle (x 385), "the fleet": listed servers, unlisted servers, shop servers (scaling group); config rules below.
//   Right (x 690), "the image pipeline": base image, image build, image test, image store.
// Rows (centres): 95 | 255 | 390 | 525. The pipeline uses its own rows 95 | 190 | 290 | 390 so the store lines up
// with the shop servers and its rollout edge is horizontal.
// The agent edges from the three server nodes share one bus at x 248, in the gutter between the left zones
// (ending at 228) and the fleet zone (starting at 268), then run into the fleet manager at y 390.
//
// Why this order: on a phone the figure opens on the left ~480 units. Steps 1 to 4 happen in the left and middle
// columns, so the free preview and the failure show without scrolling; only steps 5 and 6 need the right column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Left nodes are 182
// wide for "Defender for Cloud" and "Maintenance config"; the shop node is 214 wide for "Managed instance group".
const vm = {
  aws: { id: "aws-ec2", label: "EC2 instances" },
  gcp: { id: "gcp-compute-engine", label: "VM instances" },
  azure: { id: "azure-vm", label: "Azure VMs" },
} as const;

const spec: DiagramSpec = {
  title: "From patching a hand-kept list to an image pipeline and a managed fleet",
  width: 795,
  height: 600,
  steps: [
    { title: "Patch over SSH from a hand-kept list" },
    { title: "Two servers nobody listed" },
    { title: "An agent on every server" },
    { title: "A patch baseline and a window" },
    { title: "Bake and test a new image" },
    { title: "Replace servers from the image" },
    { title: "Rules catch drift" },
  ],
  zones: [
    { id: "people", title: "People", tone: "neutral", x: 10, y: 40, w: 218, h: 135 },
    { id: "security", title: "Security", tone: "red", x: 10, y: 200, w: 218, h: 97 },
    { id: "ops", title: "Operations", tone: "orange", x: 10, y: 325, w: 218, h: 260 },
    { id: "fleet", title: "Fleet: 9 servers", tone: "teal", x: 268, y: 40, w: 234, h: 405 },
    { id: "drift", title: "Drift checks", tone: "orange", x: 268, y: 470, w: 234, h: 115 },
    { id: "pipeline", title: "Image pipeline", tone: "violet", x: 588, y: 40, w: 202, h: 405 },
  ],
  nodes: [
    // Step 1
    {
      id: "eng",
      label: "Engineers",
      sub: "patch by hand",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 120,
      y: 95,
    },
    {
      id: "listed",
      label: "Listed servers",
      sub: "4, patched over SSH",
      icon: "server",
      tone: "teal",
      x: 385,
      y: 95,
      w: 180,
      h: 50,
      cloud: vm,
    },
    {
      id: "unlisted",
      label: "Unlisted servers",
      sub: "2, built by hand",
      icon: "server",
      tone: "teal",
      x: 385,
      y: 255,
      w: 180,
      h: 50,
      cloud: vm,
    },
    {
      id: "shop",
      label: "Shop servers",
      sub: "3, in a scaling group",
      icon: "workers",
      tone: "teal",
      x: 385,
      y: 390,
      w: 214,
      h: 56,
      cloud: {
        aws: { label: "Auto Scaling group" },
        gcp: { label: "Managed instance group" },
        azure: { label: "VM Scale Set" },
      },
    },

    // Step 2: the failure
    {
      id: "scanner",
      label: "Flaw scanner",
      sub: "scans running servers",
      icon: "radar",
      tone: "red",
      step: 2,
      x: 120,
      y: 255,
      w: 182,
      h: 54,
      cloud: {
        aws: "aws-inspector",
        gcp: { label: "VM Manager" },
        azure: { id: "azure-defender", label: "Defender for Cloud" },
      },
    },

    // Step 3
    {
      id: "fleetmgr",
      label: "Fleet manager",
      sub: "agent on every server",
      icon: "controller",
      tone: "orange",
      step: 3,
      x: 120,
      y: 390,
      w: 182,
      h: 54,
      cloud: {
        aws: { id: "aws-systems-manager", label: "Systems Manager" },
        gcp: { label: "VM Manager" },
        azure: { label: "Update Manager" },
      },
    },

    // Step 4
    {
      id: "baseline",
      label: "Patch baseline",
      sub: "Tuesday 02:00 window",
      icon: "clock",
      tone: "orange",
      step: 4,
      x: 120,
      y: 525,
      w: 182,
      h: 54,
      cloud: {
        aws: { label: "Patch baseline" },
        gcp: { label: "Patch deployment" },
        azure: { label: "Maintenance config" },
      },
    },

    // Step 5
    {
      id: "base",
      label: "Base image",
      sub: "vendor's newest OS",
      icon: "disk",
      tone: "violet",
      step: 5,
      x: 690,
      y: 95,
      w: 182,
      h: 50,
    },
    {
      id: "bake",
      label: "Image build",
      sub: "patch, agent, harden",
      icon: "workers",
      tone: "teal",
      step: 5,
      x: 690,
      y: 190,
      w: 182,
      h: 50,
      cloud: {
        aws: { label: "EC2 Image Builder" },
        gcp: { id: "gcp-cloud-build", label: "Cloud Build" },
        azure: { label: "VM Image Builder" },
      },
    },
    {
      id: "test",
      label: "Image test",
      sub: "boot, scan, smoke test",
      icon: "search",
      tone: "teal",
      step: 5,
      x: 690,
      y: 290,
      w: 182,
      h: 50,
    },
    {
      id: "store",
      label: "Image store",
      sub: "v14 new, v13 kept",
      icon: "registry",
      tone: "violet",
      step: 5,
      x: 690,
      y: 390,
      w: 182,
      h: 54,
      cloud: {
        aws: { label: "AMIs" },
        gcp: { label: "Image family" },
        azure: { label: "Compute Gallery" },
      },
    },

    // Step 7
    {
      id: "rules",
      label: "Config rules",
      sub: "checked every hour",
      icon: "policy",
      tone: "orange",
      step: 7,
      x: 385,
      y: 525,
      w: 180,
      h: 54,
      cloud: {
        aws: { label: "AWS Config" },
        gcp: { label: "OS policies" },
        azure: "azure-policy",
      },
    },
  ],
  edges: [
    // Step 1: an engineer logs in to each address on a list kept by hand.
    { from: "eng", to: "listed", label: "SSH, from a list", packet: true, until: 2 },

    // Step 2: on day 21 the scanner finds the flaw on the 2 servers the list never had.
    { from: "scanner", to: "unlisted", label: "flaw found", tone: "red", packet: true, step: 2, until: 2 },

    // Step 3: each server's agent calls out to the fleet manager and takes commands back. The three edges share a
    // bus in the gutter at x 248. The fleet manager hands the package list to the scanner.
    {
      from: "listed",
      to: "fleetmgr",
      dashed: true,
      bidirectional: true,
      flow: true,
      via: [
        [248, 95],
        [248, 390],
      ],
      step: 3,
    },
    {
      from: "unlisted",
      to: "fleetmgr",
      label: "agent",
      dashed: true,
      bidirectional: true,
      flow: true,
      via: [
        [248, 255],
        [248, 390],
      ],
      step: 3,
    },
    { from: "shop", to: "fleetmgr", dashed: true, bidirectional: true, flow: true, step: 3 },
    { from: "fleetmgr", to: "scanner", label: "inventory: 9 of 9", packet: true, labelAt: 0.75, step: 3 },

    // Step 4: the baseline says which fixes, how soon, and in which window.
    { from: "baseline", to: "fleetmgr", label: "critical: 7 days", packet: true, step: 4 },

    // Step 5: the pipeline bakes, tests and stores a new image.
    { from: "base", to: "bake", label: "newest base", packet: true, step: 5 },
    { from: "bake", to: "test", label: "v14", packet: true, delay: 0.8, step: 5 },
    { from: "test", to: "store", label: "passed", packet: true, delay: 1.6, step: 5 },

    // Step 6: the scaling group replaces its servers from v14, one at a time.
    { from: "store", to: "shop", label: "v14 rollout", packet: true, step: 6 },

    // Step 7: rules compare every server with what it should be.
    { from: "rules", to: "shop", label: "checks hourly", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
