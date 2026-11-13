import type { DiagramSpec } from "@/components/diagrams/types";

// The map of the Data & Storage hub: every kind of data Brightpost keeps, placed in the store that fits it
// (cloud/data/data-on-the-cloud). Step 1: the shop's app servers each have their own disk; orders go to the managed
// database, which writes a nightly export file into a bucket next to the product photos. Step 2 (the only failure
// step): customer export files are saved on each server's own disk; when the scaling rule removes servers, their disks
// are deleted and 38 files nobody had downloaded vanish. Step 3: export files go to their own bucket, deleted after
// 7 days; the server disk keeps only the operating system and code. Step 4: two copies shaped for speed, a cache for
// baskets and a search index fed with product changes. Step 5: click events go to a stream, the printing partner's
// status updates go to a key-value table, and the file share stays empty (nothing needs folders yet). Step 6: a
// warehouse takes the events and a nightly copy of the database for questions across years. Step 7: the nightly
// backup is kept in the audit account, apart from the shop.
//
// Nodes never move and never disappear. The app-to-disk edge changes its label (OS and code, then export files, then
// OS and code only), so the first two versions end with `until`.
//
// Layout: three columns (x 125 | 410 | 665) and five rows (y 95 | 245 | 395 | 545 | 695), one zone per store family.
//   Left:   cache 125,95 | app servers 125,245 | server disk 125,395 | files lost 125,545.
//   Middle: event stream 410,95 | orders database 410,245 | buckets 410,395 | exports bucket 410,545 |
//           file share 410,695.
//   Right:  warehouse 665,95 | search index 665,245 | backup vault 665,395 | tracking table 665,545 |
//           printing partner 665,695.
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. Steps 1 to 3 (the free
// preview, the failure and its repair) use only the left and middle columns.
// The canvas stays under 800 wide so labels are readable in the 660 px article column; it grows taller instead.
//
// Zone tabs: the zones that a vertical edge enters through the top have short titles ("Block", "Object"), so the
// edge at x 125 or x 410 passes right of the tab. The "Deleted" and "Outside" zones use the subnet kind (inline label,
// no tab). The edge from the app to the stream and the nightly copy to the warehouse put their pills low enough to
// clear the "Relational" and "Search" tabs (labelAt). The backup edge leaves the database to the right, runs down the
// gutter between the middle and right columns (x 542) and enters the vault from its left side, below the audit tab.
// Text room: about 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Every node is
// 176 wide, sized for the longest name the Services toggle shows: "Virtual Machines" (app), "Persistent Disk" (disk),
// "Vertex AI Search" (search), "Azure Postgres" (database), "Managed Redis" (cache), "Backup and DR" (vault).
const bucket = { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" } as const;

const spec: DiagramSpec = {
  title: "Brightpost's data map: every kind of data in the store that fits it",
  width: 790,
  height: 770,
  steps: [
    { title: "Where the data sits today" },
    { title: "Export files on a server's own disk" },
    { title: "Files go to a bucket" },
    { title: "Copies for speed: a cache and a search index" },
    { title: "Events, items by key, and folders" },
    { title: "A warehouse for questions across years" },
    { title: "Backups kept in another account" },
  ],
  zones: [
    { id: "cache-z", title: "Cache", tone: "orange", x: 15, y: 36, w: 220, h: 118 },
    { id: "app-z", title: "App", tone: "teal", x: 15, y: 186, w: 220, h: 118 },
    { id: "block-z", title: "Block", tone: "violet", x: 15, y: 336, w: 220, h: 118 },
    { id: "gone-z", title: "Deleted", tone: "neutral", kind: "subnet", x: 15, y: 486, w: 220, h: 118 },
    { id: "stream-z", title: "Stream", tone: "orange", x: 290, y: 36, w: 240, h: 118 },
    { id: "rel-z", title: "Relational", tone: "violet", x: 290, y: 186, w: 240, h: 118 },
    { id: "object-z", title: "Object", tone: "violet", x: 290, y: 336, w: 240, h: 268 },
    { id: "file-z", title: "File", tone: "violet", x: 290, y: 636, w: 240, h: 118 },
    { id: "wh-z", title: "Warehouse", tone: "violet", x: 555, y: 36, w: 220, h: 118 },
    { id: "search-z", title: "Search", tone: "violet", x: 555, y: 186, w: 220, h: 118 },
    { id: "audit-z", title: "Audit account", tone: "orange", x: 555, y: 336, w: 220, h: 118 },
    { id: "nosql-z", title: "NoSQL", tone: "violet", x: 555, y: 486, w: 220, h: 118 },
    { id: "outside-z", title: "Outside", tone: "neutral", kind: "subnet", x: 555, y: 636, w: 220, h: 118 },
  ],
  nodes: [
    // Step 1
    {
      id: "app",
      label: "App servers",
      sub: "2 to 10 copies",
      icon: "server",
      tone: "teal",
      x: 125,
      y: 245,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "disk",
      label: "Server disk",
      sub: "one per server",
      icon: "disk",
      tone: "violet",
      x: 125,
      y: 395,
      w: 176,
      cloud: { aws: "aws-ebs", gcp: "gcp-persistent-disk", azure: "azure-managed-disks" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "source of truth",
      icon: "database",
      tone: "violet",
      x: 410,
      y: 245,
      w: 176,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure Postgres" },
      },
    },
    {
      id: "buckets",
      label: "Buckets",
      sub: "order files, photos",
      icon: "blob",
      tone: "violet",
      x: 410,
      y: 395,
      w: 176,
      cloud: bucket,
    },

    // Step 2: the failure
    {
      id: "lost",
      label: "Export files lost",
      sub: "38 never downloaded",
      icon: "file",
      tone: "red",
      step: 2,
      x: 125,
      y: 545,
      w: 176,
    },

    // Step 3
    {
      id: "exports",
      label: "Exports bucket",
      sub: "deleted after 7 days",
      icon: "blob",
      tone: "violet",
      step: 3,
      x: 410,
      y: 545,
      w: 176,
      cloud: bucket,
    },

    // Step 4
    {
      id: "cache",
      label: "Cache",
      sub: "baskets, 7 days",
      icon: "cache",
      tone: "orange",
      step: 4,
      x: 125,
      y: 95,
      w: 176,
      cloud: {
        aws: "aws-elasticache",
        gcp: "gcp-memorystore",
        azure: { id: "azure-managed-redis", label: "Managed Redis" },
      },
    },
    {
      id: "search",
      label: "Search index",
      sub: "product search",
      icon: "search",
      tone: "violet",
      step: 4,
      x: 665,
      y: 245,
      w: 176,
      cloud: { aws: "aws-opensearch", gcp: { label: "Vertex AI Search" }, azure: "azure-ai-search" },
    },

    // Step 5
    {
      id: "stream",
      label: "Event stream",
      sub: "click events",
      icon: "log",
      tone: "orange",
      step: 5,
      x: 410,
      y: 95,
      w: 176,
      cloud: { aws: "aws-kinesis", gcp: "gcp-pubsub", azure: "azure-event-hubs" },
    },
    {
      id: "nosql",
      label: "Tracking table",
      sub: "status by order id",
      icon: "partition",
      tone: "violet",
      step: 5,
      x: 665,
      y: 545,
      w: 176,
      cloud: { aws: "aws-dynamodb", gcp: "gcp-firestore", azure: "azure-cosmos-db" },
    },
    {
      id: "partner",
      label: "Printing partner",
      sub: "prints and ships",
      icon: "building",
      tone: "neutral",
      step: 5,
      x: 665,
      y: 695,
      w: 176,
    },
    {
      id: "share",
      label: "File share",
      sub: "not needed yet",
      icon: "folder-share",
      tone: "violet",
      step: 5,
      x: 410,
      y: 695,
      w: 176,
      cloud: { aws: "aws-efs", gcp: "gcp-filestore", azure: "azure-files" },
    },

    // Step 6
    {
      id: "warehouse",
      label: "Warehouse",
      sub: "reports over years",
      icon: "chart",
      tone: "violet",
      step: 6,
      x: 665,
      y: 95,
      w: 176,
      cloud: { aws: "aws-redshift", gcp: "gcp-bigquery", azure: "azure-fabric" },
    },

    // Step 7
    {
      id: "vault",
      label: "Backup vault",
      sub: "kept apart",
      icon: "vault",
      tone: "violet",
      step: 7,
      x: 665,
      y: 395,
      w: 176,
      cloud: {
        aws: "aws-backup",
        gcp: { id: "gcp-backup-dr", label: "Backup and DR" },
        azure: "azure-backup",
      },
    },
  ],
  edges: [
    // Step 1: each server's disk holds its operating system and code; orders go to the database, which exports a
    // file into a bucket every night.
    { from: "app", to: "disk", label: "OS, code", dashed: true, labelAt: 0.38, until: 1 },
    { from: "app", to: "db", label: "orders", packet: true },
    { from: "db", to: "buckets", label: "nightly export", dashed: true, flow: true, labelAt: 0.35 },

    // Step 2: export files land on whichever server built them; removing a server deletes its disk.
    {
      from: "app",
      to: "disk",
      label: "+ export files",
      tone: "red",
      packet: true,
      labelAt: 0.38,
      step: 2,
      until: 2,
    },
    { from: "disk", to: "lost", label: "server removed", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: export files go to a bucket every server can reach; the disk keeps only what a new server rebuilds.
    { from: "app", to: "disk", label: "OS, code only", dashed: true, labelAt: 0.38, step: 3 },
    { from: "app", to: "exports", label: "exports", packet: true, step: 3 },

    // Step 4: two copies shaped for speed.
    { from: "app", to: "cache", label: "baskets", packet: true, step: 4 },
    { from: "db", to: "search", label: "changes", dashed: true, flow: true, step: 4 },

    // Step 5: events in time order, items read by one key, and the folder nobody needs yet.
    { from: "app", to: "stream", label: "click events", packet: true, labelAt: 0.42, step: 5 },
    { from: "partner", to: "nosql", label: "status updates", packet: true, step: 5 },

    // Step 6: the warehouse takes the events and a nightly copy of the orders.
    { from: "stream", to: "warehouse", label: "events", flow: true, step: 6 },
    { from: "db", to: "warehouse", label: "nightly copy", dashed: true, flow: true, labelAt: 0.4, step: 6 },

    // Step 7: the nightly backup leaves the shop account.
    {
      from: "db",
      to: "vault",
      label: "backup",
      dashed: true,
      flow: true,
      via: [
        [542, 300],
        [542, 395],
      ],
      step: 7,
    },
  ],
};

export default spec;
