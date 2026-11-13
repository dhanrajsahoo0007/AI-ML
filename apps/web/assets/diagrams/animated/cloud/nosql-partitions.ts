import type { DiagramSpec } from "@/components/diagrams/types";

// Managed NoSQL, told as Brightpost's live sale counter (cloud/data/managed-nosql). Step 1: the printing partner's
// status updates and the shop's reads go to a NoSQL table, which hashes each order id to one of four partitions.
// Step 2 (the only failure step): 2,000 shoppers arrive at 9:00 and every page view adds 1 to one counter item,
// `sale-42`; all 400 writes a second land on partition 3 and are throttled. Step 3: write sharding: the shop writes
// to `sale-42#0` to `#9`, which spread over all partitions, and a banner reader adds the 10 items up. Step 4: a status
// index lets the support agent find stuck parcels without a scan. Step 5: a change stream feeds an email sender when
// a parcel is delivered. Step 6: a replica table in a second region takes writes too, copied both ways.
//
// Nodes never move and never disappear. The shop's edge to the table changes its label (read by id, then the hot
// counter, then the sharded counter), so the first two versions end with `until`. The red edge to partition 3 also
// ends at step 2, and a plain edge to partition 3 comes back at step 3.
//
// Layout: two blocks. Left block (x 8-576) reads top to bottom: outside, partner and shop, the table, region B.
//   Row 0 (y 66):  shoppers 292 (glyph, in the "Outside" subnet).
//   Row 1 (y 240): partner 102 | app 292 | banner reader 480.
//   Row 2 (y 410): table router 292.
//   Row 3 (y 570): partitions 66 | 180 | 404 | 518, with a gap in the middle (232-352).
//   Row 4 (y 735): replica table 292 in region B; its edge drops from the router through the middle gap.
//   Right column (x 687): support agent 240 | status index 410 | change stream 580 | email sender 735. The index
//   and stream edges fan right from the router; the stream edge passes 20 units above partition 4's corner and
//   enters the events zone below its tab.
// Why this order: on a phone the figure scrolls sideways and opens on the left ~500 units. Steps 1 to 3 (the free
// preview, the failure and its repair) use only the left block. The canvas stays under 800 wide; it grows taller.
//
// Text room: about 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are sized
// for the longest name the Services toggle shows: "Virtual Machines" (app), "Global index (GSI)" (index),
// "Firestore trigger" (stream), "Cloud Run functions" (email sender), "Multi-region location" (replica).
// Partitions have no icon, so "Partition 1" fits a 104-wide box.
const spec: DiagramSpec = {
  title: "A NoSQL table: partition key, hot key, write sharding and a second region",
  width: 795,
  height: 800,
  steps: [
    { title: "The key picks the partition" },
    { title: "One hot key throttles" },
    { title: "Spread the key, add up on read" },
    { title: "A second way in: an index" },
    { title: "Changes flow out" },
    { title: "A copy in a second region" },
  ],
  zones: [
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 150, y: 12, w: 426, h: 128 },
    { id: "partner-z", title: "Partner", tone: "neutral", x: 8, y: 180, w: 190, h: 118 },
    { id: "shop", title: "Shop", tone: "teal", x: 204, y: 180, w: 372, h: 118 },
    { id: "table", title: "Region A table", tone: "violet", x: 8, y: 340, w: 568, h: 290 },
    { id: "regionb", title: "Region B", tone: "blue", x: 8, y: 670, w: 568, h: 120 },
    { id: "support", title: "Support", tone: "neutral", x: 588, y: 180, w: 198, h: 118 },
    { id: "index-z", title: "Index", tone: "violet", x: 588, y: 340, w: 198, h: 118 },
    { id: "events", title: "Events", tone: "orange", x: 588, y: 500, w: 198, h: 290 },
  ],
  nodes: [
    // Step 1
    {
      id: "partner",
      label: "Printing partner",
      sub: "3 updates per order",
      icon: "building",
      tone: "neutral",
      x: 102,
      y: 240,
      w: 172,
    },
    {
      id: "app",
      label: "App server",
      sub: "Brightpost shop",
      icon: "server",
      tone: "teal",
      x: 292,
      y: 240,
      w: 168,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "router",
      label: "NoSQL table",
      sub: "hashes each key",
      icon: "partition",
      tone: "violet",
      accent: true,
      x: 292,
      y: 410,
      w: 210,
      cloud: { aws: "aws-dynamodb", gcp: "gcp-firestore", azure: "azure-cosmos-db" },
    },
    { id: "p1", label: "Partition 1", tone: "violet", x: 66, y: 570, w: 104, h: 46 },
    { id: "p2", label: "Partition 2", tone: "violet", x: 180, y: 570, w: 104, h: 46 },
    { id: "p3", label: "Partition 3", tone: "violet", x: 404, y: 570, w: 104, h: 46 },
    { id: "p4", label: "Partition 4", tone: "violet", x: 518, y: 570, w: 104, h: 46 },

    // Step 2: the failure
    {
      id: "shoppers",
      label: "Sale shoppers",
      sub: "2,000 at 9:00",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      step: 2,
      x: 292,
      y: 66,
    },

    // Step 3
    {
      id: "reader",
      label: "Banner reader",
      sub: "adds up 10 keys",
      icon: "chart",
      tone: "teal",
      step: 3,
      x: 480,
      y: 240,
      w: 150,
    },

    // Step 4
    {
      id: "agent",
      label: "Support agent",
      sub: "finds stuck parcels",
      icon: "users",
      tone: "neutral",
      step: 4,
      x: 687,
      y: 240,
      w: 180,
    },
    {
      id: "index",
      label: "Status index",
      sub: "parcels by status",
      icon: "search",
      tone: "violet",
      step: 4,
      x: 687,
      y: 410,
      w: 190,
      cloud: {
        aws: { label: "Global index (GSI)" },
        gcp: { label: "Composite index" },
        azure: { label: "Indexing policy" },
      },
    },

    // Step 5
    {
      id: "stream",
      label: "Change stream",
      sub: "every write, in order",
      icon: "log",
      tone: "orange",
      step: 5,
      x: 687,
      y: 580,
      w: 190,
      cloud: {
        aws: { label: "DynamoDB Streams" },
        gcp: { id: "gcp-eventarc", label: "Firestore trigger" },
        azure: { label: "Change feed" },
      },
    },
    {
      id: "mailer",
      label: "Email sender",
      sub: "tells the customer",
      icon: "function",
      tone: "teal",
      step: 5,
      x: 687,
      y: 735,
      w: 190,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },

    // Step 6
    {
      id: "replica",
      label: "Replica table",
      sub: "Region B, takes writes",
      icon: "partition",
      tone: "violet",
      step: 6,
      x: 292,
      y: 735,
      w: 230,
      cloud: {
        aws: { label: "Global table replica" },
        gcp: { label: "Multi-region location" },
        azure: { label: "Second write region" },
      },
    },
  ],
  edges: [
    // Step 1: writes and reads name an order id; the table hashes it to one partition.
    { from: "partner", to: "router", label: "status updates", packet: true, labelAt: 0.33 },
    { from: "app", to: "router", label: "read by order id", packet: true, delay: 1, labelAt: 0.6, until: 1 },
    { from: "router", to: "p1", label: "hash of key", packet: true, delay: 1.6 },
    { from: "router", to: "p2", packet: true, delay: 1.9 },
    { from: "router", to: "p3", packet: true, delay: 2.2, until: 1 },
    { from: "router", to: "p4", packet: true, delay: 2.5 },

    // Step 2: every page view adds 1 to one item; all of it lands on partition 3, which refuses the excess.
    { from: "shoppers", to: "app", label: "2,000 at 9:00", packet: true, labelAt: 0.22, step: 2 },
    {
      from: "app",
      to: "router",
      label: "sale-42 +1, 400/s",
      tone: "red",
      packet: true,
      delay: 0.6,
      labelAt: 0.6,
      step: 2,
      until: 2,
    },
    {
      from: "router",
      to: "p3",
      label: "throttled",
      tone: "red",
      dashed: true,
      packet: true,
      delay: 1.2,
      step: 2,
      until: 2,
    },

    // Step 3: ten keys instead of one; the banner reads all ten and adds them up.
    { from: "app", to: "router", label: "sale-42#0 to #9", packet: true, labelAt: 0.6, step: 3 },
    { from: "router", to: "p3", packet: true, delay: 1.2, step: 3 },
    { from: "reader", to: "router", label: "reads 10, adds up", packet: true, delay: 2, labelAt: 0.35, step: 3 },

    // Step 4: the table keeps the index up to date; the agent asks it by status, not by order id.
    { from: "router", to: "index", label: "copied on write", dashed: true, flow: true, step: 4 },
    { from: "agent", to: "index", label: "status = shipped", packet: true, labelAt: 0.3, step: 4 },

    // Step 5: every write appears on the stream; "delivered" triggers the email.
    { from: "router", to: "stream", label: "every change", dashed: true, flow: true, step: 5 },
    { from: "stream", to: "mailer", label: "on delivered", packet: true, step: 5 },

    // Step 6: the replica in region B accepts writes; both copy to each other. Drops through the middle gap.
    {
      from: "router",
      to: "replica",
      label: "copies both ways",
      bidirectional: true,
      dashed: true,
      flow: true,
      labelAt: 0.82,
      step: 6,
    },
  ],
};

export default spec;
