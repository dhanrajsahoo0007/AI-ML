import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The data transfer price map (cloud/operations/cloud-cost-models): five paths a byte can take, each marked free or
// billed, never with a price. Step 1: inside one zone, free. Step 2: across zones, billed on some clouds. Step 3: to
// and from the internet, in free and out billed. Step 4: to the cloud's own storage, through a private endpoint
// (no NAT meter) or through a NAT (billed per GB). Step 5: across regions, billed per GB.
//
// Geometry. Left: Region A (x 10-540) holds Zone A (x 22-270) and Zone B (x 282-528). Boxes are 160 wide: zone A's
// at x 66, zone B's at x 326. Rows: boxes at y 98-146 and y 262-310. Right column (x 560-780), one group per row:
// Internet (customers, y 98), Provider services (storage, y 262), Region B (replica, y 428). The services and Region B
// groups start low enough that the NAT pill and the cross-region pill clear their title tabs. The internet arrows are
// free arrows at y 110 and y 136, so the two pills sit one above the other between the app server and customers.
// The cross-zone arrow runs diagonally from the zone B server to the zone A database; its pill sits in the gutter
// between the zones (x 276), clear of every box. The NAT path is a dashed diagonal from the zone B server to the
// storage box; it runs along y 190, between the Internet group and the Provider services tab, and drops at x 750,
// right of that tab, into the storage box. Its pill sits on that level stretch.
// Box labels fit 160 - 8 = 152 px at 6.2 px per character ("Private endpoint" is 16 characters, 99 px).
// The canvas is 790 wide so labels stay readable in the 660 px article column.

const shapes: LayoutShape[] = [
  // Step 1: one zone.
  { id: "srvA", type: "box", x: 66, y: 98, w: 160, h: 48, label: "App server", sub: "zone A", tone: "teal" },
  { id: "dbA", type: "box", x: 66, y: 262, w: 160, h: 48, label: "Database", sub: "zone A", tone: "violet" },
  { id: "same", type: "arrow", x: 0, y: 0, from: "srvA", to: "dbA", label: "free", tone: "green" },

  // Step 2: a second zone.
  { id: "srvB", type: "box", x: 326, y: 98, w: 160, h: 48, label: "App server", sub: "zone B", tone: "teal", step: 2 },
  {
    id: "cross-zone",
    type: "arrow",
    x: 0,
    y: 0,
    from: "srvB",
    to: "dbA",
    label: "billed on some clouds",
    tone: "orange",
    step: 2,
  },

  // Step 3: the internet. In is free, out is billed.
  {
    id: "customers",
    type: "box",
    x: 600,
    y: 98,
    w: 160,
    h: 48,
    label: "Customers",
    sub: "UK and Australia",
    tone: "neutral",
    step: 3,
  },
  { id: "in", type: "arrow", x: 600, y: 112, w: -114, h: 0, label: "in: free", tone: "green", step: 3 },
  { id: "out", type: "arrow", x: 486, y: 134, w: 114, h: 0, label: "out: billed", tone: "red", step: 3, packet: true },

  // Step 4: the cloud's own storage, by a private endpoint or through a NAT.
  {
    id: "pe",
    type: "box",
    x: 326,
    y: 262,
    w: 160,
    h: 48,
    label: "Private endpoint",
    sub: "zone B",
    tone: "blue",
    step: 4,
  },
  {
    id: "storage",
    type: "box",
    x: 600,
    y: 262,
    w: 160,
    h: 48,
    label: "Storage service",
    sub: "same region",
    tone: "violet",
    step: 4,
  },
  { id: "to-pe", type: "arrow", x: 0, y: 0, from: "srvB", to: "pe", label: "private", tone: "green", step: 4 },
  { id: "pe-storage", type: "arrow", x: 0, y: 0, from: "pe", to: "storage", label: "no NAT", tone: "green", step: 4 },
  {
    id: "via-nat",
    type: "arrow",
    x: 0,
    y: 0,
    from: "srvB",
    to: "storage",
    label: "via NAT: per GB",
    tone: "orange",
    dashed: true,
    via: [
      [543, 190],
      [750, 190],
      [750, 246],
    ],
    step: 4,
  },

  // Step 5: another region.
  {
    id: "replica",
    type: "box",
    x: 600,
    y: 428,
    w: 160,
    h: 48,
    label: "Bucket replica",
    sub: "Region B",
    tone: "violet",
    step: 5,
  },
  {
    id: "cross-region",
    type: "arrow",
    x: 0,
    y: 0,
    from: "storage",
    to: "replica",
    label: "billed per GB",
    tone: "red",
    step: 5,
    packet: true,
  },

  // A reminder under the map, from step 1.
  {
    id: "note1",
    type: "text",
    x: 22,
    y: 376,
    w: 506,
    h: 22,
    label: "Green: free. Orange: billed on some paths or clouds. Red: billed per GB.",
    tone: "neutral",
  },
  {
    id: "note2",
    type: "text",
    x: 22,
    y: 404,
    w: 506,
    h: 22,
    label: "Real rates differ by cloud and change over time.",
    tone: "neutral",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The data transfer map: which paths are free and which are billed",
  width: 790,
  height: 500,
  groups: [
    { id: "region-a", title: "Region A", tone: "blue", x: 10, y: 34, w: 530, h: 314 },
    { id: "zone-a", title: "Zone A", tone: "neutral", x: 22, y: 64, w: 248, h: 272 },
    { id: "zone-b", title: "Zone B", tone: "neutral", x: 282, y: 64, w: 246, h: 272 },
    { id: "internet", title: "Internet", tone: "neutral", x: 560, y: 64, w: 220, h: 104 },
    { id: "services", title: "Provider services", tone: "violet", x: 560, y: 228, w: 220, h: 104 },
    { id: "region-b", title: "Region B", tone: "blue", x: 560, y: 396, w: 220, h: 96 },
  ],
  shapes,
  steps: [
    { title: "Inside one zone: free" },
    { title: "Across zones: billed on some clouds" },
    { title: "The internet: in is free, out is billed" },
    { title: "The cloud's own services: private endpoint or NAT" },
    { title: "Across regions: billed per GB" },
  ],
};

export default spec;
