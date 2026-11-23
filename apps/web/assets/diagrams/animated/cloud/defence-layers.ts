import type { DiagramZone, LayoutShape, LayoutSpec, Tone } from "@/components/diagrams/types";

// Defence in depth around Brightpost's customer records (cloud/resilience/zero-trust). Six nested rings, outermost
// first: edge, identity, network, host, app, data. Each ring holds one control (left box). Step 2 adds, for every
// ring, what an attacker gets if that one control fails, and which inner ring still stands (right box).
//
// Geometry: ring k (0..5) starts at x 10 + 22k, y 40 + 90k and is 770 - 44k wide; its bottom is 632 + 14(5 - k),
// so each ring's border shows on all four sides. The ring's tab sits centred on its top edge (y ± 14). Inside each
// ring's 90-unit band the two boxes sit at y top + 24 to top + 68, 8 units above the next ring's tab.
// The boxes keep fixed columns, x 140-390 and 400-650, so the innermost ring (x 120-670) still holds both and the
// figure stays centred on x 395. Box labels fit 250 - 8 = 242 px at 6.2 px per character (39 characters).

type Ring = {
  id: string;
  title: string;
  tone: Tone;
  control: [string, string];
  ifFails: [string, string];
};

const RINGS: Ring[] = [
  {
    id: "edge",
    title: "Edge",
    tone: "blue",
    control: ["Web firewall, flood protection", "bad requests stopped at the door"],
    ifFails: ["If it fails: junk reaches the proxy", "the proxy still asks who you are"],
  },
  {
    id: "identity",
    title: "Identity",
    tone: "red",
    control: ["Sign-in, MFA and device check", "on every request, at the proxy"],
    ifFails: ["If it fails: one person gets in", "only to the apps their rule names"],
  },
  {
    id: "network",
    title: "Network",
    tone: "blue",
    control: ["Segments that accept one caller", "the tool takes traffic from the proxy"],
    ifFails: ["If it fails: a packet reaches a server", "the server still checks identity"],
  },
  {
    id: "host",
    title: "Host",
    tone: "teal",
    control: ["Patched servers, no admin port", "remote access by identity only"],
    ifFails: ["If it fails: code runs on a server", "its identity reads one table"],
  },
  {
    id: "app",
    title: "App",
    tone: "teal",
    control: ["The tool checks the role again", "least privilege for each request"],
    ifFails: ["If it fails: one account is misused", "bulk export needs a second person"],
  },
  {
    id: "data",
    title: "Data",
    tone: "violet",
    control: ["Narrow identity, encryption", "one order per query, alert on bulk"],
    ifFails: ["If it fails: records are read", "the audit log shows who and when"],
  },
];

const groups: DiagramZone[] = RINGS.map((r, k) => ({
  id: r.id,
  title: r.title,
  tone: r.tone,
  x: 10 + 22 * k,
  y: 40 + 90 * k,
  w: 770 - 44 * k,
  h: 632 + 14 * (5 - k) - (40 + 90 * k),
}));

const shapes: LayoutShape[] = [
  ...RINGS.flatMap((r, k): LayoutShape[] => [
    {
      id: `${r.id}-control`,
      type: "box",
      x: 140,
      y: 40 + 90 * k + 24,
      w: 250,
      h: 44,
      label: r.control[0],
      sub: r.control[1],
      tone: r.tone,
    },
    {
      id: `${r.id}-fails`,
      type: "box",
      x: 400,
      y: 40 + 90 * k + 24,
      w: 250,
      h: 44,
      label: r.ifFails[0],
      sub: r.ifFails[1],
      tone: "neutral",
      step: 2,
    },
  ]),
  {
    id: "records",
    type: "box",
    x: 270,
    y: 572,
    w: 250,
    h: 44,
    label: "Customer records",
    sub: "90,000 customers",
    tone: "violet",
    highlight: true,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Defence in depth: six layers around the customer records",
  width: 790,
  height: 712,
  groups,
  shapes,
  steps: [{ title: "Six layers, one control each" }, { title: "What if this layer fails?" }],
};

export default spec;
