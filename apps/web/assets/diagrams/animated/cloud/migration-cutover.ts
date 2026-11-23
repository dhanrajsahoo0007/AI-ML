import type { DiagramSpec } from "@/components/diagrams/types";

// Moving a live database from one engine to another, told as Brightpost's wholesale move from MySQL on a VM into the
// managed PostgreSQL engine (cloud/data/database-migration).
// Step 1: about 60 gift shops order through the wholesale app, which reads and writes a 60 GB MySQL database on one
// VM. The managed PostgreSQL target already runs the shop's orders. Step 2 (the only failure step): the first try,
// dump and restore in one window, freezes writes for 11.5 hours and is rolled back. Step 3: a converter turns the
// MySQL schema into PostgreSQL tables and keys first. Step 4: a replication task copies every table while the app
// keeps writing. Step 5: the same task reads the MySQL change log and replays each change; lag falls to seconds.
// Step 6: validation compares row counts and checksums on both sides. Step 7: cutover. The app points at the new
// address, and a reverse copy keeps MySQL current, so a rollback loses nothing.
//
// Nodes never move and never disappear. Edges whose label changes from step to step (the source-to-task and
// task-to-target pair, the app's connection) end with `until`, so the full view shows the state after cutover.
//
// Layout: three columns (x 130 | 400 | 680) and four rows (y 90 | 245 | 400 | 570).
//   Left, the old side: shops 130,90 | wholesale app 130,245 | MySQL source 130,400.
//   Middle: writes frozen 400,90 (the failure) | PostgreSQL target 400,400.
//   Right and bottom, the migration tools: schema conversion 680,400 | replication task 280,570 | validation 680,570.
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 (the free preview and the failure)
// use only the left and middle columns. The tools arrive from step 3 on.
//
// Edge routes: the dump edge (step 2) and the reverse copy (step 7) run straight between source and target at y 400.
// The task sits below and between them, so the full load and the change stream form a V under the two databases.
// Validation reads the target diagonally and gets the source side from the task. The cutover edge leaves the app,
// runs down to x 400 at y 320 and enters the target from the top, right of its zone tab, so it crosses no tab.
// Zone tabs: the app and source zones use the subnet kind (inline label), because the left column's vertical edges
// enter them at x 130, where a tab would sit. The bottom zone starts at x 10, so its tab sits left of both V edges. The two database zones have short
// titles so their tabs end before x 400.
// Text room: a label takes about 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes are
// sized for the longest name the Services toggle shows: "MySQL on a VM" (w 164), "RDS for PostgreSQL" (w 192), "DMS
// Schema Conversion" and "Open-source converter" (w 226), "DMS replication task" (w 204), "Data Validation Tool"
// (w 204). The gap between source and target (212 to 304) fits a 12-character pill.
const spec: DiagramSpec = {
  title: "Moving a live database: convert, copy, stream, check, cut over",
  width: 800,
  height: 650,
  steps: [
    { title: "MySQL on a VM serves the wholesale app" },
    { title: "First try: dump and restore, 11.5 hours frozen" },
    { title: "Convert the schema first" },
    { title: "Full load while the app keeps writing" },
    { title: "Change data capture: lag falls to seconds" },
    { title: "Validate counts and checksums" },
    { title: "Cutover, with a reverse copy for rollback" },
  ],
  zones: [
    { id: "people", title: "Gift shops", tone: "neutral", x: 10, y: 20, w: 240, h: 140 },
    { id: "first-try", title: "First try", tone: "neutral", x: 290, y: 20, w: 220, h: 140 },
    { id: "app-zone", title: "Wholesale", tone: "teal", kind: "subnet", x: 10, y: 190, w: 240, h: 110 },
    { id: "old", title: "Source", tone: "violet", kind: "subnet", x: 10, y: 345, w: 240, h: 110 },
    { id: "new", title: "Target", tone: "violet", x: 290, y: 345, w: 220, h: 110 },
    { id: "convert-zone", title: "Conversion", tone: "orange", x: 548, y: 345, w: 247, h: 110 },
    { id: "migration", title: "Migration service", tone: "orange", x: 10, y: 515, w: 785, h: 115 },
  ],
  nodes: [
    // Step 1
    {
      id: "shops",
      label: "Gift shops",
      sub: "about 60, any hour",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 130,
      y: 90,
    },
    {
      id: "app",
      label: "Wholesale app",
      sub: "orders, invoices",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 245,
      w: 170,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "source",
      label: "MySQL source",
      sub: "60 GB, one VM",
      icon: "database",
      tone: "violet",
      x: 130,
      y: 400,
      w: 164,
      cloud: {
        aws: { id: "aws-ec2", label: "MySQL on EC2" },
        gcp: { id: "gcp-compute-engine", label: "MySQL on a VM" },
        azure: { id: "azure-vm", label: "MySQL on a VM" },
      },
    },
    {
      id: "target",
      label: "Orders PostgreSQL",
      sub: "managed engine",
      icon: "database",
      tone: "violet",
      accent: true,
      x: 400,
      y: 400,
      w: 192,
      cloud: {
        aws: { id: "aws-rds", label: "RDS for PostgreSQL" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL" },
        azure: { id: "azure-postgresql", label: "Flexible server" },
      },
    },

    // Step 2: the failure
    {
      id: "frozen",
      label: "Writes frozen",
      sub: "20:00 to 07:30",
      icon: "lock",
      tone: "red",
      step: 2,
      x: 400,
      y: 90,
      w: 176,
    },

    // Step 3
    {
      id: "convert",
      label: "Schema conversion",
      sub: "reads MySQL schema",
      icon: "pipeline",
      tone: "orange",
      step: 3,
      x: 672,
      y: 400,
      w: 226,
      cloud: {
        aws: { id: "aws-sct", label: "DMS Schema Conversion" },
        gcp: { label: "Open-source converter" },
        azure: { label: "Open-source converter" },
      },
    },

    // Step 4
    {
      id: "task",
      label: "Replication task",
      sub: "load, then changes",
      icon: "workers",
      tone: "orange",
      step: 4,
      x: 280,
      y: 572,
      w: 204,
      cloud: {
        aws: { id: "aws-dms", label: "DMS replication task" },
        gcp: { label: "CDC tool you run" },
        azure: { label: "CDC tool you run" },
      },
    },

    // Step 6
    {
      id: "validate",
      label: "Validation",
      sub: "counts, checksums",
      icon: "policy",
      tone: "orange",
      step: 6,
      x: 680,
      y: 572,
      w: 204,
      cloud: {
        aws: { id: "aws-dms", label: "DMS data validation" },
        gcp: { label: "Data Validation Tool" },
        azure: { label: "Checks you script" },
      },
    },
  ],
  edges: [
    // Step 1: one MySQL database on one VM takes every read and write.
    { from: "shops", to: "app", label: "orders", packet: true, labelAt: 0.3 },
    { from: "app", to: "source", label: "reads, writes", packet: true, delay: 0.8, until: 6 },

    // Step 2: the whole copy happens while writes are stopped; it overruns and is rolled back.
    { from: "shops", to: "frozen", label: "refused 11.5 h", tone: "red", dashed: true, step: 2, until: 2 },
    { from: "source", to: "target", label: "dump + load", tone: "red", dashed: true, packet: true, step: 2, until: 2 },

    // Step 3: tables, keys and indexes exist on the target before any row arrives.
    { from: "convert", to: "target", label: "schema", packet: true, step: 3 },

    // Step 4: the task copies every table while the app keeps writing to MySQL.
    { from: "source", to: "task", label: "full load", packet: true, step: 4, until: 4 },
    { from: "task", to: "target", label: "60 GB, 3 h", packet: true, delay: 1.2, step: 4, until: 4 },

    // Step 5: the task reads the change log and replays each committed change on the target.
    { from: "source", to: "task", label: "change log", dashed: true, flow: true, step: 5, until: 6 },
    { from: "task", to: "target", label: "lag 4 s", packet: true, delay: 1.2, step: 5, until: 6 },

    // Step 6: both sides are counted and checksummed, table by table.
    { from: "task", to: "validate", label: "source sums", dashed: true, step: 6 },
    { from: "target", to: "validate", label: "target sums", dashed: true, labelAt: 0.55, step: 6 },

    // Step 7: the app points at the new address; changes now flow back to MySQL, ready for a rollback.
    {
      from: "app",
      to: "target",
      label: "new address",
      tone: "green",
      packet: true,
      via: [[400, 320]],
      labelAt: 0.4,
      step: 7,
    },
    { from: "target", to: "source", label: "reverse copy", tone: "green", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
