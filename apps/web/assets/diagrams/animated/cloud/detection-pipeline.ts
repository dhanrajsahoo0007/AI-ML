import type { DiagramSpec } from "@/components/diagrams/types";

// Audit logs, threat detection and posture, told as Brightpost's weekend of crypto-mining
// (cloud/resilience/threat-detection).
// Step 1: every call an engineer makes is written to the audit trail, and a locked copy goes to the log archive.
// Step 2: the test machines' network flow logs and DNS logs join the audit trail as sources.
// Step 3: a threat detector reads all three streams and raises findings into one findings hub, which sends a weekly
// email. Step 4: a posture check (settings against a benchmark) and a vulnerability scan add their findings to the
// hub. Step 5 (the failure step): a stranger with a leaked test-account key starts 4 GPU machines at 01:50 on a
// Saturday; the detector raises a high finding at 02:10, and it waits in the weekly email until Monday. Step 6: an
// alert rule sends high findings to the on-call engineer's phone; low ones stay in the weekly email. Step 7: the
// same rule starts a response function that disables the key and isolates the machines, so the key is refused.
//
// Nodes never move between steps. Edges a later step replaces end with `until` (the weekly email, the red waiting
// edge, the stranger's working key).
//
// Layout: three columns.
//   Left (x 130): engineers, audit trail, log archive, posture check, vulnerability scan.
//   Middle (x 420): the stranger, test machines, flow logs (x 350) and DNS logs (x 490), detector, hub, weekly email.
//   Right (x 672): identity service, response function, alert rule, on-call engineer.
// Rows (centres): 95 | 245 | 375 | 545 | 665 | 785.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 5 (the free
// preview and the failure) happen in the left and middle columns; only the repair in steps 6 and 7 needs the right
// column. The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Zone title tabs sit on a zone's top-left corner, so titles are short and edges that enter a zone from above do so
// right of its tab: engineers to audit trail at x 130 (the "Audit" tab ends near 95), the stranger to the machines
// at x 420 (the "Test" tab ends near 372), the audit trail to the detector down the gutter at x 272 (the "Security"
// tab ends near 120). The "Outside" zone uses the subnet kind (inline label, no tab). The "Response" zone starts at
// x 556 so its tab ends left of the response-to-identity edge at x 672.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Security Health Analytics", "Security
// Command Center", "Event Threat Detection", "Workflow automation", "Cloud Run functions", "Virtual Machines").
const spec: DiagramSpec = {
  title: "From a record of every call to a finding that wakes someone up",
  width: 795,
  height: 845,
  steps: [
    { title: "Every call is written down" },
    { title: "Network and DNS logs join in" },
    { title: "A detector raises findings in one hub" },
    { title: "Posture and vulnerability checks add theirs" },
    { title: "Saturday 02:10: a finding nobody sees" },
    { title: "High findings page the on-call engineer" },
    { title: "An automatic first response" },
  ],
  zones: [
    { id: "people", title: "People", tone: "neutral", x: 10, y: 40, w: 240, h: 110 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 295, y: 40, w: 255, h: 110 },
    { id: "identity", title: "Identity", tone: "red", x: 560, y: 40, w: 225, h: 110 },
    { id: "audit", title: "Audit", tone: "blue", x: 10, y: 190, w: 240, h: 270 },
    { id: "test", title: "Test", tone: "teal", x: 295, y: 190, w: 255, h: 270 },
    { id: "security", title: "Security", tone: "red", x: 10, y: 490, w: 540, h: 340 },
    { id: "response", title: "Response", tone: "orange", x: 556, y: 190, w: 229, h: 640 },
  ],
  nodes: [
    // Step 1
    {
      id: "dev",
      label: "Engineers",
      sub: "and their tools",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 95,
      w: 170,
    },
    {
      id: "trail",
      label: "Audit trail",
      sub: "who, what, when",
      icon: "log",
      tone: "orange",
      x: 130,
      y: 245,
      w: 180,
      cloud: {
        aws: "aws-cloudtrail",
        gcp: { id: "gcp-cloud-logging", label: "Cloud Audit Logs" },
        azure: { id: "azure-monitor", label: "Activity Log" },
      },
    },
    {
      id: "archive",
      label: "Log archive",
      sub: "locked for 1 year",
      icon: "vault",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 375,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },

    // Step 2
    {
      id: "vms",
      label: "Test machines",
      sub: "quota: 4 servers",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 420,
      y: 245,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "flow",
      label: "Flow logs",
      sub: "who talked to whom",
      icon: "log",
      tone: "orange",
      variant: "glyph",
      step: 2,
      x: 350,
      y: 375,
      cloud: {
        aws: { id: "aws-vpc", label: "VPC Flow Logs" },
        gcp: { id: "gcp-vpc", label: "VPC Flow Logs" },
        azure: { label: "VNet flow logs" },
      },
    },
    {
      id: "dns",
      label: "DNS logs",
      sub: "names looked up",
      icon: "dns",
      tone: "orange",
      variant: "glyph",
      step: 2,
      x: 490,
      y: 375,
      cloud: {
        aws: { label: "DNS query logs" },
        gcp: { id: "gcp-cloud-dns", label: "Cloud DNS logs" },
        azure: { label: "DNS query logs" },
      },
    },

    // Step 3
    {
      id: "detector",
      label: "Threat detector",
      sub: "reads all three",
      icon: "radar",
      tone: "red",
      step: 3,
      x: 420,
      y: 545,
      w: 212,
      cloud: {
        aws: "aws-guardduty",
        gcp: { id: "gcp-scc", label: "Event Threat Detection" },
        azure: "azure-defender",
      },
    },
    {
      id: "hub",
      label: "Findings hub",
      sub: "one list, every account",
      icon: "registry",
      tone: "red",
      step: 3,
      x: 420,
      y: 665,
      w: 220,
      cloud: { aws: "aws-security-hub", gcp: "gcp-scc", azure: "azure-defender" },
    },
    {
      id: "digest",
      label: "Weekly email",
      sub: "read on Mondays",
      icon: "file",
      tone: "neutral",
      step: 3,
      x: 420,
      y: 785,
      w: 160,
    },

    // Step 4
    {
      id: "posture",
      label: "Posture check",
      sub: "settings vs a benchmark",
      icon: "policy",
      tone: "red",
      step: 4,
      x: 130,
      y: 545,
      w: 232,
      cloud: {
        aws: { label: "Config rules" },
        gcp: { id: "gcp-scc", label: "Security Health Analytics" },
        azure: "azure-defender",
      },
    },
    {
      id: "scanner",
      label: "Vulnerability scan",
      sub: "machines and images",
      icon: "search",
      tone: "red",
      step: 4,
      x: 130,
      y: 665,
      w: 190,
      cloud: {
        aws: "aws-inspector",
        gcp: { label: "Artifact Analysis" },
        azure: "azure-defender",
      },
    },

    // Step 5: the failure
    {
      id: "stranger",
      label: "Stranger",
      sub: "has a leaked test key",
      icon: "robot",
      tone: "red",
      step: 5,
      x: 420,
      y: 95,
      w: 170,
    },

    // Step 6
    {
      id: "rule",
      label: "Alert rule",
      sub: "routes by severity",
      icon: "bell",
      tone: "orange",
      step: 6,
      x: 672,
      y: 665,
      w: 196,
      cloud: {
        aws: "aws-eventbridge",
        gcp: "gcp-pubsub",
        azure: { id: "azure-defender", label: "Workflow automation" },
      },
    },
    {
      id: "oncall",
      label: "On-call engineer",
      sub: "phone, any hour",
      icon: "phone",
      tone: "neutral",
      step: 6,
      x: 672,
      y: 785,
      w: 180,
    },

    // Step 7
    {
      id: "responder",
      label: "Response function",
      sub: "runs the runbook",
      icon: "function",
      tone: "orange",
      step: 7,
      x: 672,
      y: 245,
      w: 196,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-logic-apps" },
    },
    {
      id: "iam",
      label: "Identity service",
      sub: "keys and roles",
      icon: "key",
      tone: "red",
      step: 7,
      x: 672,
      y: 95,
      w: 180,
      cloud: { aws: "aws-iam", gcp: "gcp-iam", azure: "azure-entra-id" },
    },
  ],
  edges: [
    // Step 1: each call is recorded, and a copy goes where the shop's teams cannot change it.
    { from: "dev", to: "trail", label: "each call", packet: true },
    { from: "trail", to: "archive", label: "locked copy", dashed: true, flow: true },

    // Step 2: the network keeps its own two records about the machines.
    { from: "vms", to: "flow", label: "traffic", dashed: true, flow: true },
    { from: "vms", to: "dns", label: "lookups", dashed: true, flow: true },

    // Step 3: the detector reads the three streams. The audit trail's edge runs down the gutter at x 272.
    {
      from: "trail",
      to: "detector",
      label: "API calls",
      dashed: true,
      flow: true,
      via: [
        [272, 245],
        [272, 545],
      ],
      step: 3,
    },
    { from: "flow", to: "detector", dashed: true, flow: true, step: 3 },
    { from: "dns", to: "detector", dashed: true, flow: true, step: 3 },
    { from: "detector", to: "hub", label: "finding", packet: true, step: 3 },
    { from: "hub", to: "digest", label: "weekly email", dashed: true, step: 3, until: 4 },

    // Step 4: two more sources of findings.
    { from: "posture", to: "hub", label: "bad setting", packet: true, step: 4 },
    { from: "scanner", to: "hub", label: "known flaw", packet: true, step: 4 },

    // Step 5: the leaked key starts machines; every call is logged; the high finding waits for Monday.
    {
      from: "stranger",
      to: "vms",
      label: "4 GPU machines",
      tone: "red",
      packet: true,
      labelAt: 0.4,
      step: 5,
      until: 6,
    },
    { from: "stranger", to: "trail", label: "logged", dashed: true, step: 5 },
    {
      from: "hub",
      to: "digest",
      label: "02:10 high: read Monday",
      tone: "red",
      dashed: true,
      step: 5,
      until: 5,
    },

    // Step 6: severity decides who hears. High goes to a phone; low stays in the weekly email.
    { from: "hub", to: "rule", label: "high", packet: true, step: 6 },
    { from: "rule", to: "oncall", label: "page", packet: true, delay: 1, step: 6 },
    { from: "hub", to: "digest", label: "low: weekly", dashed: true, step: 6 },

    // Step 7: the same rule starts the first response: disable the key, isolate the machines.
    { from: "rule", to: "responder", label: "run", packet: true, delay: 1, step: 7 },
    { from: "responder", to: "iam", label: "disable key", packet: true, delay: 2, step: 7 },
    { from: "responder", to: "vms", label: "isolate", packet: true, delay: 2, step: 7 },
    {
      from: "stranger",
      to: "vms",
      label: "key refused",
      tone: "red",
      dashed: true,
      labelAt: 0.4,
      step: 7,
    },
  ],
};

export default spec;
