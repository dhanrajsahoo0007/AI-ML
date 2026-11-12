import type { DiagramSpec } from "@/components/diagrams/types";

// Brightpost climbs the service-model ladder one part at a time (cloud/fundamentals/service-models).
// Step 1: the shop app and its Postgres database run on one VM, and Asha runs both. Step 2 (the failure step): at
// 3:10 a.m. the database disk fills, checkouts fail and the alert goes to a sleeping engineer. Step 3: the database
// moves to a managed engine; the provider's operations team now patches it and backs it up, and Asha only picks the
// size. Step 4: the image-resize job becomes a function that runs once per new photo. Step 5: the support agent
// works in a rented help desk (SaaS) that a vendor runs end to end.
//
// Who runs a part is drawn as an edge into it ("patches the OS", "runs it", "patches, backups"), so nodes never move
// or disappear: when a job changes hands, the old edge ends (`until`) and a new one starts.
//
// Layout: three columns. Left (x 115): people. Middle (x 400): the shop's own parts. Right (x 674): parts added in
// later steps and the provider. Rows (centres): 110 | 300 | 490.
// customers 115,110 | app 400,110 | photos 674,100 | asha 115,300 | db 400,300 | fn 674,300 |
// agent 115,490 | helpdesk 400,490 | provider 674,490.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 use only the left and middle
// columns. The canvas stays under 800 wide for the 660 px article column.
//
// Tabs: a zone's tab spans x+16 to x+44+8.2 per title character, y-14 to y+14. Vertical edges enter the Data zone at
// x 400, right of its tab (292-353). The Functions and Provider zones have edges through their tops at x 674, so they
// use the subnet kind (inline label, no tab). Asha's edge to the app leaves her box near its top (y 274), so it stays
// clear of the label pills on her edge to the database (y 290-310), then runs up the gutter at x 248; its label sits
// at about y 205, above the tabs of the second row (which start at y 216).
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the
// longest Services-toggle names: "Database for PostgreSQL" (w 230), "Cloud Run functions" (w 196),
// "Virtual Machines" (w 190).
const spec: DiagramSpec = {
  title: "Brightpost climbs the ladder, one part at a time",
  width: 795,
  height: 580,
  steps: [
    { title: "One VM runs everything" },
    { title: "3:10 a.m.: the database disk fills" },
    { title: "Hand the database to the provider" },
    { title: "Hand the photo job to a function" },
    { title: "Rent the help desk" },
  ],
  zones: [
    { id: "customers", title: "Customers", tone: "neutral", x: 10, y: 40, w: 210, h: 150 },
    { id: "team", title: "Brightpost team", tone: "neutral", x: 10, y: 230, w: 210, h: 330 },
    { id: "compute", title: "Compute", tone: "teal", x: 276, y: 40, w: 248, h: 150 },
    { id: "data", title: "Data", tone: "violet", x: 276, y: 230, w: 248, h: 150 },
    { id: "rented", title: "Rented software", tone: "neutral", x: 276, y: 420, w: 248, h: 140 },
    { id: "storage", title: "Storage", tone: "violet", x: 564, y: 40, w: 221, h: 150 },
    { id: "functions", title: "Functions", tone: "teal", kind: "subnet", x: 564, y: 236, w: 221, h: 144 },
    { id: "provider", title: "Provider", tone: "neutral", kind: "subnet", x: 564, y: 420, w: 221, h: 140 },
  ],
  nodes: [
    // Step 1
    {
      id: "customers",
      label: "Customers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 115,
      y: 110,
    },
    {
      id: "app",
      label: "App server",
      sub: "the shop, on a VM",
      icon: "server",
      tone: "teal",
      x: 400,
      y: 110,
      w: 190,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "Postgres",
      icon: "database",
      tone: "violet",
      x: 400,
      y: 300,
      w: 230,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Database for PostgreSQL" },
      },
    },
    {
      id: "asha",
      label: "Asha",
      sub: "engineer, on call",
      icon: "wrench",
      tone: "neutral",
      x: 115,
      y: 300,
      w: 150,
    },

    // Step 3
    {
      id: "provider",
      label: "Provider operations",
      sub: "on call all night",
      icon: "building",
      tone: "neutral",
      step: 3,
      x: 674,
      y: 490,
      w: 196,
    },

    // Step 4
    {
      id: "photos",
      label: "Photo buckets",
      sub: "uploads, thumbnails",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 674,
      y: 100,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "fn",
      label: "Resize function",
      sub: "runs once per photo",
      icon: "function",
      tone: "teal",
      step: 4,
      x: 674,
      y: 300,
      w: 196,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },

    // Step 5
    {
      id: "agent",
      label: "Support agent",
      sub: "Brightpost staff",
      icon: "user-check",
      tone: "neutral",
      step: 5,
      x: 115,
      y: 490,
      w: 150,
    },
    {
      id: "helpdesk",
      label: "Help desk",
      sub: "a vendor runs it all",
      icon: "chat",
      tone: "neutral",
      step: 5,
      x: 400,
      y: 490,
      w: 190,
    },
  ],
  edges: [
    // Step 1: the shop works, and Asha runs both the machine and the database on it.
    { from: "customers", to: "app", label: "orders", packet: true, until: 1 },
    { from: "app", to: "db", label: "SQL", packet: true, delay: 1 },
    {
      from: "asha",
      to: "app",
      label: "patches the OS",
      dashed: true,
      via: [
        [248, 274],
        [248, 150],
      ],
      labelAt: 0.53,
    },
    { from: "asha", to: "db", label: "runs it", dashed: true, until: 1 },

    // Step 2: the disk is full, so writes stop; the alert reaches a phone nobody is awake to answer.
    { from: "customers", to: "app", label: "orders fail", tone: "red", dashed: true, step: 2, until: 2 },
    { from: "db", to: "asha", label: "3:10 a.m.", tone: "red", packet: true, step: 2, until: 2 },

    // Step 3: the provider runs the database engine; Asha keeps one small job. The provider's edge climbs the
    // gutter between the middle and right columns (x 544).
    { from: "customers", to: "app", label: "orders", packet: true, step: 3 },
    {
      from: "provider",
      to: "db",
      label: "patches, backups",
      packet: true,
      via: [
        [544, 490],
        [544, 300],
      ],
      labelAt: 0.5,
      step: 3,
    },
    { from: "asha", to: "db", label: "picks size", dashed: true, step: 3 },

    // Step 4: each new photo starts the function, which writes the thumbnail back. The provider runs and scales it.
    { from: "app", to: "photos", label: "product photos", packet: true, step: 4 },
    { from: "photos", to: "fn", label: "new photo, thumbnail", bidirectional: true, packet: true, labelAt: 0.45, step: 4 },
    { from: "provider", to: "fn", label: "runs, scales", dashed: true, step: 4 },

    // Step 5: a finished product; Brightpost only uses it and chooses its settings.
    { from: "agent", to: "helpdesk", label: "answers emails", packet: true, step: 5 },
  ],
};

export default spec;
