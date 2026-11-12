import type { DiagramSpec } from "@/components/diagrams/types";

// Identity and access, told as the story of Brightpost's leaked storage key (cloud/fundamentals/identity-and-access).
// Step 1: the app server reads the orders bucket with a static key pasted into the code. Step 2 (the failure step):
// a stranger who found the key in a public repository reads the same bucket. Step 3: the key is deleted; a service
// identity is attached to the server and the identity service hands it a short-lived token. Step 4: a policy limits
// that identity to reading one bucket, so a write is refused. Step 5: people sign in once, with MFA, and get a role
// through their group. Step 6: a second account holds the log archive; a role there trusts the shop app, and an
// organisation guardrail sits above both accounts. Step 7: an audit trail records every call.
//
// Nodes never move between steps. A key is never drawn as a node, because a node cannot be removed by a later step:
// the key lives in the labels of two edges that end at step 2 (`until: 2`).
//
// Layout: three columns that read left to right, each one a question.
//   Left (x 130), "who is calling": service identity, app server, identity service, single sign-on, developers.
//   Middle (x 390), "what is touched and what is allowed": policy, orders bucket, the stranger.
//   Right (x 672), "the company level": org guardrail and the audit account (audit trail, log archive, writer role).
// Rows (centres): 95 | 245 | 400 | 510-530 | 650.
// svcid 130,95 | policy 390,95 | guardrail 672,95 | server 130,245 | bucket 390,245 | trail 672,245 |
// iam 130,400 | stranger 390,420 | archive 672,390 | sso 130,510 | role2 672,530 | dev 130,650.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 5 happen in
// the left and middle columns, so the reader sees them without scrolling; only steps 6 and 7 need the right column.
// The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Zone title tabs sit on the top-left corner of a zone, so a vertical edge enters a zone right of its tab
// (x 130 clears the tabs of the left column, which end near 120). The "Outside" zone uses the subnet kind, which
// has an inline label and no tab, because the stranger's edge leaves through the top of it.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Organizations SCP", "Managed identity",
// "Role assignment", "Cloud Audit Logs"), not only for the generic label.
const spec: DiagramSpec = {
  title: "From a key in the code to roles and short-lived credentials",
  width: 795,
  height: 735,
  steps: [
    { title: "A key in the code" },
    { title: "The key leaks" },
    { title: "Attach a service identity, delete the key" },
    { title: "Least privilege: read one bucket, nothing else" },
    { title: "People sign in through one door" },
    { title: "A second account trusts the first" },
    { title: "Every call leaves a record" },
  ],
  zones: [
    { id: "app", title: "Application", tone: "teal", x: 10, y: 40, w: 240, h: 260 },
    { id: "permissions", title: "Permissions", tone: "red", x: 295, y: 40, w: 190, h: 100 },
    { id: "org", title: "Organisation", tone: "orange", x: 560, y: 40, w: 225, h: 100 },
    { id: "storage", title: "Storage", tone: "violet", x: 295, y: 190, w: 190, h: 128 },
    { id: "audit", title: "Audit account", tone: "blue", x: 560, y: 190, w: 225, h: 385 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 295, y: 355, w: 190, h: 110 },
    { id: "identity", title: "Identity", tone: "red", x: 10, y: 345, w: 240, h: 210 },
    { id: "people", title: "People", tone: "neutral", x: 10, y: 595, w: 240, h: 125 },
  ],
  nodes: [
    // Step 1
    {
      id: "server",
      label: "App server",
      sub: "Brightpost shop",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 245,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "bucket",
      label: "Orders bucket",
      sub: "730 export files",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 390,
      y: 245,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },

    // Step 2: the failure
    {
      id: "stranger",
      label: "Stranger",
      sub: "found the key",
      icon: "robot",
      tone: "red",
      step: 2,
      x: 390,
      y: 420,
      w: 160,
    },

    // Step 3
    {
      id: "iam",
      label: "Identity service",
      sub: "checks each call",
      icon: "key",
      tone: "red",
      step: 3,
      x: 130,
      y: 400,
      w: 176,
      cloud: { aws: "aws-iam", gcp: "gcp-iam", azure: "azure-entra-id" },
    },
    {
      id: "svcid",
      label: "Service identity",
      sub: "no key to copy",
      icon: "shield",
      tone: "red",
      step: 3,
      x: 130,
      y: 95,
      w: 176,
      cloud: {
        aws: { label: "IAM role" },
        gcp: { label: "Service account" },
        azure: { label: "Managed identity" },
      },
    },

    // Step 4
    {
      id: "policy",
      label: "Policy",
      sub: "read orders only",
      icon: "policy",
      tone: "red",
      step: 4,
      x: 390,
      y: 95,
      w: 166,
      cloud: {
        aws: { label: "IAM policy" },
        gcp: { label: "Allow policy" },
        azure: { label: "Role assignment" },
      },
    },

    // Step 5
    {
      id: "sso",
      label: "Single sign-on",
      sub: "password + MFA",
      icon: "lock",
      tone: "red",
      step: 5,
      x: 130,
      y: 510,
      w: 176,
      cloud: {
        aws: { label: "Identity Center" },
        gcp: { label: "Cloud Identity" },
        azure: "azure-entra-id",
      },
    },
    {
      id: "dev",
      label: "Developers",
      sub: "no personal keys",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      step: 5,
      x: 130,
      y: 650,
    },

    // Step 6
    {
      id: "guardrail",
      label: "Org guardrail",
      sub: "for every account",
      icon: "building",
      tone: "orange",
      step: 6,
      x: 672,
      y: 95,
      w: 180,
      cloud: {
        aws: { id: "aws-organizations", label: "Organizations SCP" },
        gcp: { id: "gcp-resource-manager", label: "Org Policy" },
        azure: "azure-policy",
      },
    },
    {
      id: "archive",
      label: "Log archive",
      sub: "append only",
      icon: "vault",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 672,
      y: 390,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "role2",
      label: "Writer role",
      sub: "trusts the shop app",
      icon: "shield",
      tone: "red",
      step: 6,
      x: 672,
      y: 530,
      w: 176,
      cloud: {
        aws: { label: "Trusted IAM role" },
        gcp: { label: "Role binding" },
        azure: { label: "Role assignment" },
      },
    },

    // Step 7
    {
      id: "trail",
      label: "Audit trail",
      sub: "who, what, when",
      icon: "log",
      tone: "orange",
      step: 7,
      x: 672,
      y: 245,
      w: 176,
      h: 50,
      cloud: {
        aws: "aws-cloudtrail",
        gcp: { id: "gcp-cloud-logging", label: "Cloud Audit Logs" },
        azure: { id: "azure-monitor", label: "Activity log" },
      },
    },
  ],
  edges: [
    // Step 1: the app proves who it is with a key that never changes.
    { from: "server", to: "bucket", label: "read, static key", packet: true, until: 2 },

    // Step 2: the same key works for anyone who holds it.
    { from: "stranger", to: "bucket", label: "same key", tone: "red", packet: true, step: 2, until: 2 },

    // Step 3: the key is gone. The identity service issues a token to the server; the stolen key stops working.
    { from: "iam", to: "server", label: "1-hour token", packet: true, labelAt: 0.6, step: 3 },
    { from: "svcid", to: "server", label: "attached", dashed: true, step: 3 },
    { from: "server", to: "bucket", label: "read, 1-hour token", packet: true, delay: 1.2, step: 3 },
    { from: "stranger", to: "bucket", label: "old key: refused", tone: "red", dashed: true, step: 3 },

    // Step 4: a policy limits the identity; a write is refused. The arc runs above the read edge, between the rows.
    { from: "svcid", to: "policy", label: "limited by", dashed: true, step: 4 },
    {
      from: "server",
      to: "bucket",
      label: "write: denied",
      tone: "red",
      dashed: true,
      via: [
        [232, 160],
        [445, 160],
      ],
      step: 4,
    },

    // Step 5: people sign in once; the group they are in decides the role they get.
    { from: "dev", to: "sso", label: "sign in + MFA", packet: true, labelAt: 0.75, step: 5 },
    { from: "sso", to: "iam", label: "group → role", packet: true, delay: 1.2, step: 5 },

    // Step 6: a role in the audit account trusts the shop app; the guardrail caps every policy below it.
    // The edge to the writer role runs down the gutter between the left and middle columns (x 272).
    { from: "policy", to: "guardrail", label: "capped by", dashed: true, step: 6 },
    {
      from: "server",
      to: "role2",
      label: "takes on role",
      dashed: true,
      flow: true,
      via: [
        [272, 300],
        [272, 530],
      ],
      labelAt: 0.78,
      step: 6,
    },
    { from: "role2", to: "archive", label: "write only", packet: true, step: 6 },

    // Step 7: the cloud writes down every call, and the record is kept where the shop team cannot erase it.
    { from: "bucket", to: "trail", label: "each call", dashed: true, flow: true, step: 7 },
    { from: "trail", to: "archive", label: "kept", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
