import type { DiagramSpec } from "@/components/diagrams/types";

// The spine of the Cloud section: Brightpost grows from one rented server to a shop that is ready for a second
// region (cloud/start-here/cloud-in-10-minutes). Other pages embed single steps and highlight nodes by id, so the
// ids are part of the contract: shoppers, lost, lb, app, app-b, app-c, scaler, db, standby, photos, resize, cdn,
// identity, org, audit, budget, region2. Never rename one.
//
// Step 1: shoppers reach one rented server that runs the shop and its database. Step 2 (the only failure step): on
// the first sale day 2,000 shoppers arrive at 9 a.m., the server times out and about 1,200 orders are lost.
// Step 3: a load balancer shares shoppers between copies of the server in three zones; a scaling rule adds and
// removes copies (1 to 10). Step 4: the database moves to a managed service with a standby in a second zone.
// Step 5: photos go to a bucket, a function makes thumbnails, and an edge cache keeps copies near far shoppers.
// Step 6: one organisation holds separate accounts; staff sign in once, and every call is copied to the audit
// account. Step 7: a budget watches the spend, split by tag. Step 8: a second region, previewed and not built.
//
// Nodes never move and never disappear. The two shopper-to-server edges of steps 1 and 2 and the failure edge end
// with `until`, because from step 3 every shopper goes through the load balancer.
//
// Layout: a left column for the outside world, the home region to its right, the organisation along the bottom.
//   Left, "Internet" (x 8-180): shoppers 62,260 (far left, so the step 1 and 2 edges have room for a label) |
//   edge cache 92,565.
//   Lost orders 370,85 sit above the region, outside every zone, so the failure edge from the first server rises
//   right of the zone A label and right of the region tab (title kept short, "London region", so the tab ends at
//   x 325).
//   Home region (x 188-782, y 150-650): load balancer 480,205 above three zone bands drawn side by side (subnet
//   kind, inline label, no tab): zone A x 196 (app 285,315 | db 282,430), zone B x 390 (app-b 483,315 |
//   standby 492,430), zone C x 584 (app-c 677,315; a shorter band, so the scaling rule 677,440 sits below it, in
//   the region but in no zone). Photos bucket 330,565 and resize function 677,565 sit below the bands, regional.
//   Second region (preview), top right: region2 671,80.
//   Organisation (y 690-905): identity 105,755 | org 400,755 | audit 676,755 | budget 400,860.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. Steps 1 and 2 (the free
// preview and the failure) use only the shoppers, the first server and the lost orders, all left of x 480.
// The canvas stays under 800 wide so labels are readable in the 660 px article column; it grows taller instead.
//
// Edge routes: the shoppers sit a little below the load balancer's row, so the edge to the first server enters its
// left side under the "ZONE A" label, and the edge to the load balancer crosses the region outline below its tab.
// The edge to zone C runs along y 205 and turns down at x 677, so it enters zone C right of the band's label.
// Long labels sit on vertical edges (photos, adds or removes, spend by tag).
// Text room: about 7.6 px per bold label character and 5.5 px per sub character after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle shows: "Cloud Load Balancing" (lb, w 206), "Cloud Run
// functions" (resize, w 196), "Management groups" (org, w 196), "Virtual Machines" (app servers, w 174),
// "Azure Postgres" (database and standby, w 162).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const database = {
  aws: "aws-rds",
  gcp: "gcp-cloud-sql",
  azure: { id: "azure-postgresql", label: "Azure Postgres" },
};

const spec: DiagramSpec = {
  title: "Brightpost grows: one rented server to a shop ready for a second region",
  width: 790,
  height: 920,
  steps: [
    { title: "One rented server" },
    { title: "Sale day: ten times the shoppers" },
    { title: "Copies in three zones behind a load balancer" },
    { title: "A managed database with a standby" },
    { title: "Photos: a bucket, a function, an edge cache" },
    { title: "Accounts under one organisation" },
    { title: "A budget that watches the bill" },
    { title: "A second region, previewed" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 8, y: 150, w: 172, h: 490 },
    { id: "second", title: "Second region", tone: "neutral", kind: "region", x: 560, y: 25, w: 222, h: 105 },
    { id: "region", title: "London region", tone: "neutral", kind: "region", x: 188, y: 150, w: 594, h: 500 },
    { id: "zone-a", title: "Zone A", tone: "blue", kind: "subnet", x: 196, y: 255, w: 186, h: 235 },
    { id: "zone-b", title: "Zone B", tone: "blue", kind: "subnet", x: 390, y: 255, w: 186, h: 235 },
    { id: "zone-c", title: "Zone C", tone: "blue", kind: "subnet", x: 584, y: 255, w: 186, h: 115 },
    { id: "org", title: "Organisation", tone: "orange", x: 8, y: 690, w: 774, h: 215 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 62,
      y: 260,
    },
    {
      id: "app",
      label: "App server",
      sub: "Brightpost shop",
      icon: "server",
      tone: "teal",
      x: 285,
      y: 315,
      w: 174,
      cloud: server,
    },

    // Step 2: the failure
    {
      id: "lost",
      label: "Orders lost",
      sub: "about 1,200",
      icon: "bag",
      tone: "red",
      step: 2,
      x: 370,
      y: 85,
      w: 140,
    },

    // Step 3
    {
      id: "lb",
      label: "Load balancer",
      sub: "shares the shoppers",
      icon: "load-balancer",
      tone: "blue",
      step: 3,
      x: 480,
      y: 205,
      w: 206,
      cloud: {
        aws: "aws-elb",
        gcp: "gcp-cloud-load-balancing",
        azure: { id: "azure-app-gateway", label: "App Gateway" },
      },
    },
    {
      id: "app-b",
      label: "App server",
      sub: "copy in zone B",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 483,
      y: 315,
      w: 174,
      cloud: server,
    },
    {
      id: "app-c",
      label: "App server",
      sub: "copy in zone C",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 677,
      y: 315,
      w: 174,
      cloud: server,
    },
    {
      id: "scaler",
      label: "Scaling rule",
      sub: "1 to 10 servers",
      icon: "controller",
      tone: "orange",
      step: 3,
      x: 677,
      y: 440,
      w: 160,
      cloud: {
        aws: { label: "Auto Scaling" },
        gcp: { label: "Autoscaler" },
        azure: { label: "VM Scale Sets" },
      },
    },

    // Step 4
    {
      id: "db",
      label: "Database",
      sub: "orders, managed",
      icon: "database",
      tone: "violet",
      step: 4,
      x: 282,
      y: 430,
      w: 162,
      cloud: database,
    },
    {
      id: "standby",
      label: "Standby",
      sub: "ready in zone B",
      icon: "database",
      tone: "violet",
      step: 4,
      x: 492,
      y: 430,
      w: 162,
      cloud: database,
    },

    // Step 5
    {
      id: "photos",
      label: "Photos bucket",
      sub: "300 new a week",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 330,
      y: 565,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "resize",
      label: "Resize function",
      sub: "about 2 s a photo",
      icon: "function",
      tone: "teal",
      step: 5,
      x: 677,
      y: 565,
      w: 196,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },
    {
      id: "cdn",
      label: "Edge cache",
      sub: "photo copies",
      icon: "cdn",
      tone: "blue",
      step: 5,
      x: 92,
      y: 565,
      w: 150,
      cloud: { aws: "aws-cloudfront", gcp: "gcp-cloud-cdn", azure: "azure-front-door" },
    },

    // Step 6
    {
      id: "identity",
      label: "Single sign-on",
      sub: "staff, with MFA",
      icon: "lock",
      tone: "red",
      step: 6,
      x: 105,
      y: 755,
      w: 170,
      cloud: {
        aws: { id: "aws-iam", label: "Identity Center" },
        gcp: { label: "Cloud Identity" },
        azure: "azure-entra-id",
      },
    },
    {
      id: "org",
      label: "Organisation",
      sub: "shop, test, audit",
      icon: "tree",
      tone: "orange",
      step: 6,
      x: 400,
      y: 755,
      w: 196,
      cloud: {
        aws: "aws-organizations",
        gcp: { id: "gcp-resource-manager", label: "Organization" },
        azure: { id: "azure-management-groups", label: "Management groups" },
      },
    },
    {
      id: "audit",
      label: "Audit account",
      sub: "every call, kept",
      icon: "log",
      tone: "orange",
      step: 6,
      x: 676,
      y: 755,
      w: 180,
      cloud: {
        aws: "aws-cloudtrail",
        gcp: { id: "gcp-cloud-logging", label: "Cloud Audit Logs" },
        azure: { id: "azure-monitor", label: "Activity log" },
      },
    },

    // Step 7
    {
      id: "budget",
      label: "Budget alerts",
      sub: "at 50, 80, 100%",
      icon: "coin",
      tone: "orange",
      step: 7,
      x: 400,
      y: 860,
      w: 180,
      cloud: {
        aws: "aws-budgets",
        gcp: { id: "gcp-cloud-billing", label: "Billing budgets" },
        azure: "azure-cost-management",
      },
    },

    // Step 8
    {
      id: "region2",
      label: "Second region",
      sub: "preview, not built",
      icon: "globe",
      tone: "neutral",
      step: 8,
      x: 671,
      y: 80,
      w: 196,
    },
  ],
  edges: [
    // Step 1: an ordinary day fits one server.
    { from: "shoppers", to: "app", label: "a normal day", packet: true, until: 1 },

    // Step 2: ten times the shoppers; the one server cannot answer them all.
    { from: "shoppers", to: "app", label: "2,000 at once", tone: "red", packet: true, step: 2, until: 2 },
    { from: "app", to: "lost", label: "timed out", tone: "red", dashed: true, labelAt: 0.62, step: 2, until: 2 },

    // Step 3: one front door shares shoppers between copies in three zones; the rule changes how many run.
    { from: "shoppers", to: "lb", label: "every shopper", packet: true, step: 3 },
    { from: "lb", to: "app", packet: true, delay: 1, step: 3 },
    { from: "lb", to: "app-b", packet: true, delay: 1, step: 3 },
    { from: "lb", to: "app-c", packet: true, delay: 1, via: [[677, 205]], step: 3 },
    { from: "scaler", to: "app-c", label: "adds or removes", dashed: true, flow: true, step: 3 },

    // Step 4: the database leaves the server; the provider keeps a standby in another zone.
    { from: "app", to: "db", label: "orders", packet: true, step: 4 },
    { from: "db", to: "standby", label: "sync", dashed: true, flow: true, step: 4 },

    // Step 5: far shoppers get photos from the edge; the function turns each upload into thumbnails.
    { from: "shoppers", to: "cdn", label: "photos", packet: true, step: 5 },
    { from: "cdn", to: "photos", label: "first view", dashed: true, step: 5 },
    { from: "photos", to: "resize", label: "new photo, thumbnails", bidirectional: true, packet: true, step: 5 },

    // Step 6: staff sign in once; the organisation copies every call into the audit account.
    { from: "identity", to: "org", label: "staff sign in", packet: true, step: 6 },
    { from: "org", to: "audit", label: "every call", dashed: true, flow: true, step: 6 },

    // Step 7: the organisation's spend, split by tag, feeds the budget alerts.
    { from: "org", to: "budget", label: "spend, by tag", flow: true, step: 7 },

    // Step 8: a second region, previewed: some traffic goes there later.
    { from: "lb", to: "region2", label: "later", dashed: true, step: 8 },
  ],
};

export default spec;
