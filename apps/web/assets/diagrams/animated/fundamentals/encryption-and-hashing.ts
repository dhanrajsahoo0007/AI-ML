import type { LayoutSpec } from "@/components/diagrams/types";

// StitchBox, a small knitting-kit shop: where its data is protected while it moves and while it sits.
// Step 1: in transit. Every hop (browser > load balancer > app > database) runs inside TLS.
// Step 2: at rest. Database pages and the nightly backup are stored as AES-256 ciphertext.
// Step 3: key management. A key service holds the master key, which wraps the data key stored beside the data;
//         a secrets manager hands the app its database password and API keys at start-up.
//
// Layout (top-left x, y, w x h):
//   in-transit group 20,40 590x150: browser 40,80 120x56 | lb 210,80 140x56 | app 440,80 150x56
//   at-rest group 640,40 240x370:   db 670,80 180x56 | blocks 670/732/794,160 56x40 | backup 670,240 180x56 |
//                                    dk 670,330 180x48
//   keys group 20,230 590x180:      kms 60,280 200x56 | secrets 360,280 200x56 | keys-note 200,348 390x20
//   (keys-note starts right of x=160, where the unwrap arrow drops from the KMS box.)
// Gaps between solid shapes are at least 6 px (the three blocks) and 60 px elsewhere.
const spec: LayoutSpec = {
  kind: "layout",
  title: "Data in transit, data at rest, and the keys",
  width: 900,
  height: 440,
  steps: [
    { title: "In transit: TLS on every hop" },
    { title: "At rest: disks and backups hold ciphertext" },
    { title: "Keys live apart from the data" },
  ],
  groups: [
    { id: "g-transit", title: "In transit", tone: "blue", x: 20, y: 40, w: 590, h: 150 },
    { id: "g-rest", title: "At rest", tone: "violet", x: 640, y: 40, w: 240, h: 370 },
    { id: "g-keys", title: "Key management", tone: "orange", x: 20, y: 230, w: 590, h: 180 },
  ],
  shapes: [
    // Step 1: the request path, encrypted on the wire.
    { id: "browser", type: "box", x: 40, y: 80, w: 120, h: 56, label: "Browser", sub: "customer", tone: "neutral" },
    {
      id: "lb",
      type: "box",
      x: 210,
      y: 80,
      w: 140,
      h: 56,
      label: "Load balancer",
      sub: "ends public TLS",
      tone: "blue",
    },
    {
      id: "app",
      type: "box",
      x: 440,
      y: 80,
      w: 150,
      h: 56,
      label: "Shop app",
      sub: "plain text in memory",
      tone: "teal",
    },
    {
      id: "db",
      type: "box",
      x: 670,
      y: 80,
      w: 180,
      h: 56,
      label: "Orders database",
      sub: "rows on disk",
      tone: "violet",
    },
    { id: "t1", type: "arrow", x: 0, y: 0, from: "browser", to: "lb", label: "TLS", tone: "blue", packet: true },
    { id: "t2", type: "arrow", x: 0, y: 0, from: "lb", to: "app", label: "TLS again", tone: "blue", packet: true },
    { id: "t3", type: "arrow", x: 0, y: 0, from: "app", to: "db", label: "TLS", tone: "blue", packet: true },
    {
      id: "transit-note",
      type: "text",
      x: 40,
      y: 152,
      w: 550,
      h: 20,
      label: "A tapped cable or shared Wi-Fi sees only ciphertext",
      tone: "blue",
    },

    // Step 2: what sits on disk is ciphertext, and so is the backup copy.
    { id: "blk1", type: "cell", x: 670, y: 160, w: 56, h: 40, label: "9f3a", tone: "violet", step: 2, highlight: true },
    { id: "blk2", type: "cell", x: 732, y: 160, w: 56, h: 40, label: "c01e", tone: "violet", step: 2 },
    { id: "blk3", type: "cell", x: 794, y: 160, w: 56, h: 40, label: "7b52", tone: "violet", step: 2 },
    { id: "blk-note", type: "text", x: 660, y: 206, w: 200, h: 20, label: "AES-256 pages", tone: "violet", step: 2 },
    {
      id: "backup",
      type: "box",
      x: 670,
      y: 240,
      w: 180,
      h: 56,
      label: "Nightly backup",
      sub: "same ciphertext",
      tone: "violet",
      step: 2,
    },

    // Step 3: the keys. The master key never leaves the key service; it only wraps and unwraps the data key.
    {
      id: "kms",
      type: "box",
      x: 60,
      y: 280,
      w: 200,
      h: 56,
      label: "Key service (KMS)",
      sub: "master key stays inside",
      tone: "orange",
      step: 3,
    },
    {
      id: "secrets",
      type: "box",
      x: 360,
      y: 280,
      w: 200,
      h: 56,
      label: "Secrets manager",
      sub: "DB password, API keys",
      tone: "orange",
      step: 3,
    },
    {
      id: "dk",
      type: "cell",
      x: 670,
      y: 330,
      w: 180,
      h: 48,
      label: "Data key (wrapped)",
      sub: "stored beside the data",
      tone: "orange",
      step: 3,
      highlight: true,
    },
    {
      id: "unwrap",
      type: "arrow",
      x: 0,
      y: 0,
      from: "kms",
      to: "dk",
      via: [
        [160, 390],
        [640, 390],
      ],
      label: "unwraps the data key",
      dashed: true,
      tone: "orange",
      step: 3,
    },
    {
      id: "fetch",
      type: "arrow",
      x: 0,
      y: 0,
      from: "secrets",
      to: "app",
      label: "fetched at start",
      dashed: true,
      tone: "orange",
      step: 3,
    },
    {
      id: "keys-note",
      type: "text",
      x: 200,
      y: 348,
      w: 390,
      h: 20,
      label: "Master key wraps data keys; data keys encrypt data",
      tone: "orange",
      step: 3,
    },
  ],
};

export default spec;
