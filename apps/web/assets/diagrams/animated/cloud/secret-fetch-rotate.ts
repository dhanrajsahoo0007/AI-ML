import type { DiagramSpec } from "@/components/diagrams/types";

// Secrets management, told as the story of Brightpost's payment key (cloud/resilience/secrets-management).
// Step 1: the app servers prove who they are with an attached service identity, read the payment provider's API key
// from the secret store, keep it in memory and charge cards with it. Step 2 (the failure step): Asha rotates the key
// by hand on the sale day. She stores v2, restarts the 6 servers on her list and revokes v1 at once; 3 servers she
// missed still hold v1, and every checkout they take is refused for 20 minutes. Step 3: a rotation job makes v2, saves
// it beside v1, and revokes v1 only a day later, so the 3 stragglers keep working. Step 4: a server whose key is
// refused re-reads the store and retries once. Step 5: the same job rotates the orders database password on a
// schedule. Step 6: every read of the store lands in an audit trail.
//
// Nodes never move between steps. Keys and versions are never nodes: they live in edge labels, and an edge a later
// step replaces ends with `until`.
//
// Layout: three columns.
//   Left (x 130), "the workload": service identity, app servers, the 3 servers that missed the restart.
//   Middle (x 390), "what it talks to": secret store, payment provider (outside), Asha.
//   Right (x 672), "automation and records": audit trail, rotation job, orders database.
// Rows (centres): 95 | 245 | 400.
// svcid 130,95 | store 390,95 | trail 672,95 | server 130,245 | provider 390,245 | rotator 672,245 |
// stale 130,400 | asha 390,400 | db 672,400.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 happen in the
// left and middle columns, so the free preview and the failure show without scrolling.
//
// Zone tabs sit on a zone's top-left corner and reach about 145 units to the right. The service identity sits inside
// the Application zone, so "attached" never crosses a tab. "Outside" and "People" are subnet bands (inline label, no
// tab) because edges enter them from above and from the side. The rotation job's edge to the store leaves its box
// right of the Automation tab (x 740), runs left in the gap between rows (y 160) and turns up into the store.
// Text room: up to 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are sized
// for the longest name the Services toggle shows ("Cloud Run function", "Virtual Machines", "Managed identity",
// "Cloud Audit Logs", "Azure PostgreSQL", "Secrets Manager").
const spec: DiagramSpec = {
  title: "A secret store, a hand rotation that broke checkout, and the fixes",
  width: 795,
  height: 490,
  steps: [
    { title: "Fetch the key with the server's own identity" },
    { title: "Rotated by hand: the old key dies at once" },
    { title: "Two valid keys during a rotation" },
    { title: "Refused? Re-read the store and retry once" },
    { title: "The database password rotates on a schedule" },
    { title: "Every read leaves a record" },
  ],
  zones: [
    { id: "app", title: "Application", tone: "teal", x: 10, y: 40, w: 240, h: 425 },
    { id: "secrets", title: "Secret store", tone: "red", x: 295, y: 40, w: 190, h: 100 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 295, y: 190, w: 190, h: 110 },
    { id: "people", title: "People", tone: "neutral", kind: "subnet", x: 295, y: 345, w: 190, h: 120 },
    { id: "audit", title: "Audit", tone: "orange", x: 560, y: 40, w: 225, h: 100 },
    { id: "automation", title: "Automation", tone: "teal", x: 560, y: 190, w: 225, h: 110 },
    { id: "data", title: "Data", tone: "violet", x: 560, y: 345, w: 225, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "svcid",
      label: "Service identity",
      sub: "no secret on disk",
      icon: "shield",
      tone: "red",
      x: 130,
      y: 95,
      w: 176,
      cloud: {
        aws: { label: "IAM role" },
        gcp: { label: "Service account" },
        azure: { label: "Managed identity" },
      },
    },
    {
      id: "server",
      label: "App servers",
      sub: "9 on the sale day",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 245,
      w: 170,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "store",
      label: "Secret store",
      sub: "payment key, versions",
      icon: "vault",
      tone: "red",
      accent: true,
      x: 390,
      y: 95,
      w: 176,
      cloud: { aws: "aws-secrets-manager", gcp: "gcp-secret-manager", azure: "azure-key-vault" },
    },
    {
      id: "provider",
      label: "Payment provider",
      sub: "checks the API key",
      icon: "card",
      tone: "neutral",
      x: 390,
      y: 245,
      w: 180,
    },

    // Step 2: the failure
    {
      id: "stale",
      label: "3 servers",
      sub: "missed the restart",
      icon: "server",
      tone: "red",
      step: 2,
      x: 130,
      y: 400,
      w: 170,
    },
    {
      id: "asha",
      label: "Asha",
      sub: "rotates by hand",
      icon: "user-check",
      tone: "neutral",
      step: 2,
      x: 390,
      y: 400,
      w: 166,
    },

    // Step 3
    {
      id: "rotator",
      label: "Rotation job",
      sub: "revokes v1 a day later",
      icon: "function",
      tone: "teal",
      step: 3,
      x: 672,
      y: 245,
      w: 190,
      cloud: {
        aws: "aws-lambda",
        gcp: { id: "gcp-cloud-run-functions", label: "Cloud Run function" },
        azure: "azure-functions",
      },
    },

    // Step 5
    {
      id: "db",
      label: "Orders database",
      sub: "password every 30 days",
      icon: "database",
      tone: "violet",
      step: 5,
      x: 672,
      y: 400,
      w: 196,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 6
    {
      id: "trail",
      label: "Audit trail",
      sub: "who read which version",
      icon: "log",
      tone: "orange",
      step: 6,
      x: 672,
      y: 95,
      w: 186,
      h: 54,
      cloud: {
        aws: "aws-cloudtrail",
        gcp: { id: "gcp-cloud-logging", label: "Cloud Audit Logs" },
        azure: "azure-monitor",
      },
    },
  ],
  edges: [
    // Step 1: the server shows its attached identity, reads the key once, keeps it in memory and charges with it.
    { from: "svcid", to: "server", label: "attached", dashed: true },
    { from: "server", to: "store", label: "fetch as itself", packet: true },
    { from: "server", to: "provider", label: "charge, v1", packet: true, delay: 1.2, until: 1 },

    // Step 2: v2 is in the store and 6 restarted servers use it; v1 is revoked at once, so the 3 others are refused.
    { from: "server", to: "provider", label: "charge, v2", packet: true, delay: 1.2, step: 2 },
    { from: "asha", to: "provider", label: "revoke v1 now", tone: "red", packet: true, step: 2, until: 2 },
    { from: "stale", to: "provider", label: "v1: refused", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: a job makes v2, saves it beside v1, and keeps v1 valid for a day. Asha sets its schedule.
    { from: "rotator", to: "provider", label: "make v2", packet: true, step: 3 },
    {
      from: "rotator",
      to: "store",
      label: "v2 current, v1 kept",
      packet: true,
      delay: 1.2,
      via: [
        [740, 200],
        [740, 160],
        [525, 160],
      ],
      step: 3,
    },
    { from: "asha", to: "rotator", label: "sets the schedule", dashed: true, step: 3 },
    { from: "stale", to: "provider", label: "v1 still works", packet: true, step: 3, until: 3 },

    // Step 4: a refused key makes the server re-read the store at once and retry the charge one time.
    // It runs round the left of the servers and along the gap under the service identity (y 145), because the gap
    // between the app servers and the payment provider already holds the "charge" label.
    {
      from: "stale",
      to: "store",
      label: "re-read now",
      tone: "green",
      packet: true,
      via: [
        [28, 400],
        [28, 145],
        [330, 145],
      ],
      labelAt: 0.73,
      step: 4,
    },
    {
      from: "stale",
      to: "provider",
      label: "retry, v2",
      tone: "green",
      packet: true,
      delay: 1.2,
      labelAt: 0.6,
      step: 4,
    },

    // Step 5: the same job changes the database password and saves the new value in the store.
    { from: "rotator", to: "db", label: "new password", packet: true, step: 5 },

    // Step 6: the store writes down every read: which identity, which secret, which version, when.
    { from: "store", to: "trail", label: "every read", dashed: true, flow: true, step: 6 },
  ],
};

export default spec;
