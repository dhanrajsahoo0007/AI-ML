import type { DiagramSpec } from "@/components/diagrams/types";

// Analytics on the cloud, told as the story of Brightpost's sales dashboard (cloud/data/warehouses-lakes-and-query-engines).
// Step 1: the finance lead's questions go to the orders database (its read copy); click events sit in a stream for
// 7 days, out of reach. Step 2: a lake: every night the day's click events and orders land as raw JSON files in a
// bucket. Step 3: a serverless query engine reads those files in place, and a catalog says which files make a table.
// Step 4 (the only failure step): the dashboard's 6 charts refresh every 15 minutes, and each one scans all 18 GB of
// raw JSON. Step 5: a nightly job converts the raw files to columnar Parquet split by date, so a chart reads about
// 20 MB. Step 6: a warehouse loads the curated tables every night and the dashboard reads a small summary table; the
// finance lead keeps the query engine for one-off questions. Step 7: access rules hide customer names and addresses,
// set once in the catalog and applied in the warehouse too.
//
// Nodes never move and never disappear. The dashboard-to-engine and engine-to-raw edges change label (normal, then
// red in the failure, then normal again), so each version ends with `until`.
//
// Layout: three columns (x 130 | 400 | 670) and four rows (y 110 | 260 | 410 | 560).
//   Left:   catalog 130,110 | finance lead 130,260 | orders database 130,410 | shop app 130,560.
//   Middle: dashboard 400,110 | query engine 400,260 | raw files 400,410 | click stream 400,560.
//   Right:  access rules 670,110 | warehouse 670,260 | curated tables 670,410.
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. Steps 1 to 4 (the free
// preview, the lake, the engine and the failure) use only the left and middle columns.
// Edges stay out of the zone tabs: the engine-to-catalog edge leaves the engine's left side and climbs the gutter at
// x 267; the dashboard-to-warehouse edge runs down the gutter at x 535 and enters the warehouse from the left. The one
// diagonal (engine to curated) crosses only plain zone borders. The rule-to-catalog edge runs above every zone (y 25),
// entering both zones right of their tabs. Right-column zones have short titles ("Rules", "Serving") so the vertical
// edges at x 670 pass right of their tabs.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Fabric SQL endpoint", "BigQuery (BigLake)",
// "AWS Lake Formation", "Glue Data Catalog").
const LAKE: NonNullable<DiagramSpec["nodes"][number]["cloud"]> = {
  aws: "aws-s3",
  gcp: "gcp-cloud-storage",
  azure: { id: "azure-fabric", label: "OneLake" },
};

const spec: DiagramSpec = {
  title: "From questions on the orders database to a lake, a query engine and a warehouse",
  width: 795,
  height: 635,
  steps: [
    { title: "Questions go to the orders database" },
    { title: "A lake: raw files in a bucket" },
    { title: "A query engine reads the files in place" },
    { title: "Every refresh scans two years" },
    { title: "Columnar files, split by date" },
    { title: "A warehouse serves a summary table" },
    { title: "Rules decide who sees which columns" },
  ],
  zones: [
    { id: "meta", title: "Catalog", tone: "orange", x: 10, y: 55, w: 240, h: 110 },
    { id: "people", title: "People", tone: "neutral", x: 10, y: 205, w: 240, h: 110 },
    { id: "shop", title: "Shop", tone: "teal", x: 10, y: 355, w: 240, h: 260 },
    { id: "reports", title: "Reports", tone: "neutral", x: 285, y: 55, w: 230, h: 110 },
    { id: "query", title: "Query", tone: "teal", x: 285, y: 205, w: 230, h: 110 },
    { id: "lake", title: "Lake", tone: "violet", x: 285, y: 355, w: 500, h: 110 },
    { id: "events", title: "Events", tone: "orange", x: 285, y: 505, w: 230, h: 110 },
    { id: "governance", title: "Rules", tone: "red", x: 555, y: 55, w: 230, h: 110 },
    { id: "dw", title: "Serving", tone: "violet", x: 555, y: 205, w: 230, h: 110 },
  ],
  nodes: [
    // Step 1
    {
      id: "finance",
      label: "Finance lead",
      sub: "December best-sellers",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 260,
      w: 180,
    },
    {
      id: "db",
      label: "Orders database",
      sub: "and its read copy",
      icon: "database",
      tone: "violet",
      x: 130,
      y: 410,
      w: 180,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },
    {
      id: "app",
      label: "Shop app",
      sub: "2 servers",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 560,
      w: 180,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: { id: "azure-vm", label: "Azure VMs" } },
    },
    {
      id: "stream",
      label: "Click stream",
      sub: "25,000 a day, 7 days",
      icon: "log",
      tone: "orange",
      x: 400,
      y: 560,
      w: 190,
      cloud: {
        aws: { id: "aws-kinesis", label: "Kinesis stream" },
        gcp: "gcp-pubsub",
        azure: "azure-event-hubs",
      },
    },

    // Step 2
    {
      id: "raw",
      label: "Raw files",
      sub: "JSON, 2 years, 18 GB",
      icon: "blob",
      tone: "violet",
      step: 2,
      x: 400,
      y: 410,
      w: 190,
      cloud: LAKE,
    },

    // Step 3
    {
      id: "engine",
      label: "Query engine",
      sub: "bills per data read",
      icon: "search",
      tone: "teal",
      step: 3,
      x: 400,
      y: 260,
      w: 190,
      cloud: {
        aws: "aws-athena",
        gcp: { id: "gcp-bigquery", label: "BigQuery (BigLake)" },
        azure: { id: "azure-fabric", label: "Fabric SQL endpoint" },
      },
    },
    {
      id: "catalog",
      label: "Catalog",
      sub: "table = these files",
      icon: "registry",
      tone: "orange",
      step: 3,
      x: 130,
      y: 110,
      w: 196,
      cloud: {
        aws: { id: "aws-glue", label: "Glue Data Catalog" },
        gcp: { id: "gcp-dataplex", label: "Knowledge Catalog" },
        azure: { id: "azure-fabric", label: "OneLake catalog" },
      },
    },
    {
      id: "dashboard",
      label: "Sales dashboard",
      sub: "6 charts, by a contractor",
      icon: "chart",
      tone: "neutral",
      step: 3,
      x: 400,
      y: 110,
      w: 190,
    },

    // Step 5
    {
      id: "curated",
      label: "Curated tables",
      sub: "Parquet, split by date",
      icon: "partition",
      tone: "violet",
      step: 5,
      x: 670,
      y: 410,
      w: 186,
      cloud: LAKE,
    },

    // Step 6
    {
      id: "warehouse",
      label: "Warehouse",
      sub: "summary tables",
      icon: "columns",
      tone: "violet",
      step: 6,
      x: 670,
      y: 260,
      w: 186,
      cloud: {
        aws: "aws-redshift",
        gcp: "gcp-bigquery",
        azure: { id: "azure-fabric", label: "Fabric Warehouse" },
      },
    },

    // Step 7
    {
      id: "rules",
      label: "Access rules",
      sub: "hide names, addresses",
      icon: "policy",
      tone: "red",
      step: 7,
      x: 670,
      y: 110,
      w: 186,
      cloud: {
        aws: "aws-lake-formation",
        gcp: { id: "gcp-dataplex", label: "Policy tags" },
        azure: "azure-purview",
      },
    },
  ],
  edges: [
    // Step 1: the shop writes orders and clicks; the finance lead reads the database's copy.
    { from: "app", to: "db", label: "orders", packet: true },
    { from: "app", to: "stream", label: "each click", packet: true, delay: 0.6 },
    { from: "finance", to: "db", label: "monthly report", packet: true, delay: 1.2 },

    // Step 2: every night the day's clicks and orders land as raw files in the lake.
    { from: "stream", to: "raw", label: "nightly, raw JSON", flow: true, dashed: true, step: 2 },
    { from: "db", to: "raw", label: "nightly", flow: true, dashed: true, step: 2 },

    // Step 3: the dashboard asks the query engine, which looks up the catalog and reads the files where they sit.
    { from: "dashboard", to: "engine", label: "6 charts", packet: true, step: 3, until: 3 },
    {
      from: "engine",
      to: "catalog",
      label: "which files?",
      dashed: true,
      via: [
        [267, 232],
        [267, 110],
      ],
      labelAt: 0.62,
      step: 3,
    },
    { from: "engine", to: "raw", label: "reads in place", packet: true, delay: 1.2, step: 3, until: 3 },

    // Step 4: the failure. Every 15 minutes, day and night, each chart reads all 18 GB.
    { from: "dashboard", to: "engine", label: "every 15 min", tone: "red", packet: true, step: 4, until: 4 },
    {
      from: "engine",
      to: "raw",
      label: "18 GB a chart",
      tone: "red",
      packet: true,
      delay: 1.2,
      step: 4,
      until: 4,
    },

    // Step 5: a nightly job writes Parquet split by date; a chart now reads one month and three columns.
    { from: "raw", to: "curated", label: "convert", flow: true, dashed: true, step: 5 },
    { from: "dashboard", to: "engine", label: "1 month each", packet: true, step: 5, until: 5 },
    { from: "engine", to: "curated", label: "about 20 MB", packet: true, delay: 1.2, step: 5 },

    // Step 6: the warehouse loads the curated tables; the dashboard reads a summary; the engine stays for one-offs.
    { from: "curated", to: "warehouse", label: "nightly load", flow: true, dashed: true, step: 6 },
    {
      from: "dashboard",
      to: "warehouse",
      label: "summary table",
      packet: true,
      via: [
        [535, 110],
        [535, 260],
      ],
      labelAt: 0.5,
      step: 6,
    },
    { from: "finance", to: "engine", label: "ad-hoc SQL", packet: true, delay: 1.2, step: 6 },

    // Step 7: one set of column rules, kept with the catalog and applied by the warehouse too.
    { from: "rules", to: "warehouse", label: "hides 2 columns", dashed: true, step: 7 },
    {
      from: "rules",
      to: "catalog",
      label: "same rules for the lake",
      dashed: true,
      via: [
        [670, 25],
        [130, 25],
      ],
      step: 7,
    },
  ],
};

export default spec;
