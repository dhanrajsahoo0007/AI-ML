import type { DiagramSpec } from "@/components/diagrams/types";

// Brightpost's data tier, one store per access pattern (cloud/start-here/databases-per-cloud).
// Step 1: one managed PostgreSQL database does three jobs for the shop app: orders, baskets and product search.
// Product photos already live in a bucket, fetched by the shoppers' browsers by URL. Step 2 (the only failure step):
// on a sale day 40 searches a second, each a slow LIKE query, fill the database's processors; checkout waits up to
// 9 seconds and about 310 orders are lost in 75 minutes. Step 3: search moves to a search engine fed with product
// changes from the database. Step 4: baskets and sessions move to an in-memory cache. Step 5: the finance lead's
// monthly report reads an asynchronous copy of the database, a few seconds behind.
//
// Nodes never move and never disappear. The app-to-database edge changes its label as jobs leave the database, so
// each version ends with `until`; the last one ("orders only") stays in the full view.
//
// Layout: three columns (x 115 | 400 | 672) and four rows (y 90 | 260 | 430 | 600).
//   Left, the shop side: shoppers 115,90 | app 115,260 | basket cache 115,430.
//   Middle, the source of truth: photos bucket 400,90 | orders database 400,260 | orders lost 400,430.
//   Right, the derived stores: search engine 672,260 | reporting copy 672,430 | finance lead 672,600.
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 (the free
// preview and the failure) use only the shoppers, the app, the photos bucket, the database and the lost orders, all
// left of x 485. The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Edge routes: the app reaches the search engine over the top of the database (y 178, between the photo row and the
// database row), so it never crosses the database box. The copy to the reporting store runs diagonally from the
// database's lower right to the copy's upper left, clear of the search engine and the lost orders.
// Zone tabs: the left zones have short titles ("Shoppers", "App", "Memory") so the vertical edges at x 115 enter
// them right of their tabs. The reporting zone uses the subnet kind (inline label, no tab) because the copy edge
// enters it through the top.
// Text room: about 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are sized
// for the longest name the Services toggle shows: "Virtual Machines" (app, w 172), "Azure Postgres" (database,
// w 170), "Vertex AI Search" (search, w 178), "Managed Redis" (cache, w 176), "Cloud SQL replica" (copy, w 182).
const database = {
  aws: "aws-rds",
  gcp: "gcp-cloud-sql",
  azure: { id: "azure-postgresql", label: "Azure Postgres" },
};

const spec: DiagramSpec = {
  title: "Brightpost's data: one store for each way the shop uses data",
  width: 790,
  height: 690,
  steps: [
    { title: "One database does every job" },
    { title: "Sale day: searches starve checkout" },
    { title: "Search moves to a search engine" },
    { title: "Baskets move to a cache" },
    { title: "Reports read a copy" },
  ],
  zones: [
    { id: "people", title: "Shoppers", tone: "neutral", x: 10, y: 35, w: 210, h: 135 },
    { id: "app-zone", title: "App", tone: "teal", x: 10, y: 205, w: 210, h: 110 },
    { id: "memory", title: "Memory", tone: "orange", x: 10, y: 375, w: 210, h: 110 },
    { id: "data", title: "Data stores", tone: "violet", x: 290, y: 35, w: 495, h: 280 },
    { id: "reporting", title: "Reporting", tone: "neutral", kind: "subnet", x: 572, y: 375, w: 213, h: 305 },
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
      x: 115,
      y: 88,
    },
    {
      id: "app",
      label: "Shop app",
      sub: "2 to 10 servers",
      icon: "server",
      tone: "teal",
      x: 115,
      y: 260,
      w: 172,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "photos",
      label: "Photos bucket",
      sub: "files by name",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 400,
      y: 88,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "PostgreSQL",
      icon: "database",
      tone: "violet",
      x: 400,
      y: 260,
      w: 170,
      cloud: database,
    },

    // Step 2: the failure
    {
      id: "lost",
      label: "Orders lost",
      sub: "about 310 in 75 min",
      icon: "bag",
      tone: "red",
      step: 2,
      x: 400,
      y: 430,
      w: 164,
    },

    // Step 3
    {
      id: "search",
      label: "Search engine",
      sub: "words to products",
      icon: "search",
      tone: "violet",
      step: 3,
      x: 672,
      y: 260,
      w: 178,
      cloud: {
        aws: "aws-opensearch",
        gcp: { label: "Vertex AI Search" },
        azure: "azure-ai-search",
      },
    },

    // Step 4
    {
      id: "cache",
      label: "Basket cache",
      sub: "kept for 7 days",
      icon: "cache",
      tone: "orange",
      step: 4,
      x: 115,
      y: 430,
      w: 176,
      cloud: {
        aws: "aws-elasticache",
        gcp: "gcp-memorystore",
        azure: { id: "azure-managed-redis", label: "Managed Redis" },
      },
    },

    // Step 5
    {
      id: "replica",
      label: "Reporting copy",
      sub: "seconds behind",
      icon: "database",
      tone: "violet",
      step: 5,
      x: 672,
      y: 445,
      w: 182,
      cloud: {
        aws: { id: "aws-rds", label: "RDS read replica" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL replica" },
        azure: { id: "azure-postgresql", label: "Postgres replica" },
      },
    },
    {
      id: "finance",
      label: "Finance lead",
      sub: "monthly report",
      icon: "chart",
      tone: "neutral",
      variant: "glyph",
      step: 5,
      x: 672,
      y: 590,
    },
  ],
  edges: [
    // Step 1: shoppers use the app; their browsers fetch photos straight from the bucket. One database, three jobs.
    { from: "shoppers", to: "app", label: "browse, search, buy", packet: true },
    { from: "shoppers", to: "photos", label: "photos by URL", packet: true, delay: 0.6 },
    { from: "app", to: "db", label: "every query", packet: true, delay: 1.2, until: 1 },

    // Step 2: search queries fill the database, and checkout waits behind them.
    { from: "app", to: "db", label: "40 searches/s", tone: "red", packet: true, step: 2, until: 2 },
    { from: "db", to: "lost", label: "checkout 9 s", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: search goes to a search engine; the database sends it every product change.
    { from: "app", to: "db", label: "orders, baskets", packet: true, step: 3, until: 3 },
    {
      from: "app",
      to: "search",
      label: "search words",
      packet: true,
      via: [
        [200, 178],
        [672, 178],
      ],
      labelAt: 0.55,
      step: 3,
    },
    { from: "db", to: "search", label: "changes", dashed: true, flow: true, step: 3 },

    // Step 4: baskets and sessions live in memory, with an expiry.
    { from: "app", to: "db", label: "orders only", packet: true, step: 4 },
    { from: "app", to: "cache", label: "basket by id", packet: true, delay: 0.8, step: 4 },

    // Step 5: an asynchronous copy takes the long report queries.
    { from: "db", to: "replica", label: "copied", dashed: true, flow: true, step: 5 },
    { from: "finance", to: "replica", label: "report", packet: true, step: 5 },
  ],
};

export default spec;
