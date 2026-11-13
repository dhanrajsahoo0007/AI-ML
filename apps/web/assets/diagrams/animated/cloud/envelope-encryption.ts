import type { DiagramSpec } from "@/components/diagrams/types";

// Envelope encryption, told as the story of Brightpost's deleted key (cloud/resilience/encryption-and-keys).
// Step 1: the shop app asks the key service for a data key and gets two copies back, one plain and one wrapped by the
// root key, which never leaves the service. Step 2: the app encrypts the export file with the plain copy, throws that
// copy away and stores the wrapped copy beside the file in the orders bucket. Step 3: to read, the app fetches the
// file and its wrapped key, asks the key service to unwrap it, and decrypts. Step 4 (the failure step): a clean-up
// script schedules the untagged orders key for deletion; after 7 days every unwrap is refused, so every file is
// unreadable. Step 5: a key policy splits key managers from key users, so the script's delete is denied. Step 6:
// every use of the key goes to the audit trail, and an alarm fires when a key is disabled or scheduled for deletion.
//
// Nodes never move between steps. The four calls between the app and the key service are four edges on the same
// line, each shown only in its own step (`until`), and the final "wrap / unwrap" edge is the one the full view keeps.
//
// Layout: three columns. Left (x 130): the shop app above the orders bucket. Middle (x 390): the key service above
// the contractor's clean-up script. Right (x 672): the key policy beside the key service, and below it the audit
// trail and the alarm. Rows (centres): 100 | 280-295 | 430.
// app 130,100 | kms 390,100 | policy 672,100 | bucket 130,280 | script 390,295 | trail 672,280 | alarm 672,430.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 to 4 use only the left and middle
// columns, so the free preview and the failure are visible without scrolling.
//
// The key service is a glyph node (76 wide), which leaves a 134-unit gap for the labels on the app-to-key edges.
// The script sits in a subnet zone (inline label, no tab) because its edge leaves through the top. The audit edge
// runs below the key-service zone (y 188) and drops into the monitoring zone at x 672, right of that zone's tab.
// Nodes are sized for the longest name the Services toggle puts in them ("Virtual Machines", "Cloud Audit Logs").
const spec: DiagramSpec = {
  title: "Envelope encryption: a data key wrapped by a key that never leaves",
  width: 795,
  height: 500,
  steps: [
    { title: "Ask the key service for a data key" },
    { title: "Encrypt the file, keep only the wrapped key" },
    { title: "Read: unwrap the key, then decrypt" },
    { title: "The key is deleted, and every file with it" },
    { title: "Key managers are not key users" },
    { title: "Every use of the key is logged and watched" },
  ],
  zones: [
    { id: "app", title: "Application", tone: "teal", x: 10, y: 40, w: 240, h: 120 },
    { id: "keys", title: "Key service", tone: "red", x: 295, y: 40, w: 490, h: 130 },
    { id: "storage", title: "Storage", tone: "violet", x: 10, y: 215, w: 240, h: 145 },
    { id: "contractor", title: "Contractor", tone: "neutral", kind: "subnet", x: 295, y: 225, w: 190, h: 135 },
    { id: "monitor", title: "Monitoring", tone: "orange", x: 560, y: 215, w: 225, h: 270 },
  ],
  nodes: [
    // Steps 1 to 3
    {
      id: "app",
      label: "Shop app",
      sub: "writes the nightly file",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 100,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: { id: "azure-vm", label: "Virtual Machines" } },
    },
    {
      id: "kms",
      label: "Key service",
      sub: "root key never leaves",
      icon: "key",
      tone: "red",
      variant: "glyph",
      x: 390,
      y: 100,
      cloud: {
        aws: { id: "aws-kms", label: "AWS KMS" },
        gcp: "gcp-kms",
        azure: { id: "azure-key-vault", label: "Key Vault" },
      },
    },
    {
      id: "bucket",
      label: "Orders bucket",
      sub: "file + wrapped key",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 130,
      y: 280,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: { id: "azure-blob", label: "Blob Storage" } },
    },

    // Step 4: the failure
    {
      id: "script",
      label: "Clean-up script",
      sub: "deletes untagged keys",
      icon: "robot",
      tone: "red",
      step: 4,
      x: 390,
      y: 295,
      w: 176,
    },

    // Step 5
    {
      id: "policy",
      label: "Key policy",
      sub: "managers ≠ users",
      icon: "policy",
      tone: "red",
      step: 5,
      x: 672,
      y: 100,
      w: 176,
      cloud: {
        aws: { label: "Key policy" },
        gcp: { label: "IAM on the key" },
        azure: { label: "Key Vault RBAC" },
      },
    },

    // Step 6
    {
      id: "trail",
      label: "Audit trail",
      sub: "every use of the key",
      icon: "log",
      tone: "orange",
      step: 6,
      x: 672,
      y: 280,
      w: 176,
      cloud: {
        aws: "aws-cloudtrail",
        gcp: { id: "gcp-cloud-logging", label: "Cloud Audit Logs" },
        azure: { id: "azure-monitor", label: "Azure Monitor" },
      },
    },
    {
      id: "alarm",
      label: "Alarm",
      sub: "key disabled or deleted",
      icon: "bell",
      tone: "orange",
      step: 6,
      x: 672,
      y: 430,
      w: 184,
      cloud: {
        aws: "aws-cloudwatch",
        gcp: "gcp-cloud-monitoring",
        azure: { id: "azure-monitor", label: "Azure Monitor" },
      },
    },
  ],
  edges: [
    // Step 1: one call returns two copies of a fresh data key.
    { from: "app", to: "kms", label: "new data key", packet: true, bidirectional: true, until: 2 },

    // Step 2: the file is encrypted locally; only the wrapped copy of the key is stored, beside the file.
    { from: "app", to: "bucket", label: "encrypted file + wrapped key", packet: true, step: 2 },

    // Step 3: reading sends the small wrapped key to the key service, never the file.
    { from: "app", to: "kms", label: "unwrap the key", packet: true, bidirectional: true, step: 3, until: 3 },

    // Step 4: the script schedules deletion; once the key is gone, every unwrap is refused.
    {
      from: "script",
      to: "kms",
      label: "delete in 7 days",
      tone: "red",
      packet: true,
      labelAt: 0.6,
      step: 4,
      until: 4,
    },
    { from: "app", to: "kms", label: "unwrap: refused", tone: "red", dashed: true, step: 4, until: 4 },

    // Step 5: the key policy decides who may manage and who may use; the script's role may do neither.
    { from: "policy", to: "kms", label: "who may do what", dashed: true, step: 5 },
    { from: "script", to: "kms", label: "delete: denied", tone: "red", dashed: true, labelAt: 0.6, step: 5 },
    { from: "app", to: "kms", label: "wrap / unwrap", packet: true, bidirectional: true, step: 5 },

    // Step 6: every call to the key service is written down, and a deletion or a disable wakes someone up.
    {
      from: "kms",
      to: "trail",
      label: "every use logged",
      dashed: true,
      flow: true,
      via: [
        [470, 188],
        [672, 188],
      ],
      labelAt: 0.4,
      step: 6,
    },
    { from: "trail", to: "alarm", label: "delete scheduled", packet: true, step: 6 },
  ],
};

export default spec;
