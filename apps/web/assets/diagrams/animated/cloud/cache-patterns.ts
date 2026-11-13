import type { DiagramSpec } from "@/components/diagrams/types";

// A managed cache in front of the orders database, told as Brightpost's sale-day stampede (cloud/data/managed-caches).
// Step 1: every product view runs a query on the orders database; the cache holds only baskets. Step 2: cache-aside:
// the app reads the hero poster's page from one key and fills it on a miss, with a 5-minute TTL. Step 3 (the only
// failure step): the key expires at 9:00, 1,200 requests miss together and all run the same query. Step 4: a rebuild
// lock lets one request rebuild while the rest get the old copy, and the key is refreshed before it expires. Step 5:
// a replica in zone B copies the primary and takes over if zone A fails. Step 6: cluster mode spreads the keys over
// more shards. Step 7: the cache reports hit rate, evictions and memory to monitoring.
//
// Nodes never move and never disappear. The app-to-database and app-to-key edges change their labels from step to
// step, so every version but the last ends with `until`; the step-3 failure edges end at step 3.
//
// Layout: three columns (x 125 | 395 | 670) and four rows (y 100 | 250 | 405 | 560).
//   Left, the shop side: shoppers 125,100 | app servers 125,250 | orders database 125,405 | monitoring 125,560.
//   Middle, zone A of the cache: rebuild lock 395,100 | cache primary 395,250 | hero poster key 395,405.
//   Right, added later: replica in zone B 670,250 | more shards 670,405.
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 4 (the free
// preview, the failure and its fix) and step 7 use only the left and middle columns; only the replica and the shards
// need the right column. The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Edge routes: the app reaches the key and the lock on diagonals whose pills sit in the gutter between the left zones
// (which end at x 235) and zone A (which starts at x 300), between zone rows. The key-to-monitoring diagonal passes
// below the database box; its pill sits between the Database and Monitoring zones. The shards edge leaves the primary
// to the lower right and passes under the replica. Vertical edges at x 125 enter zones right of their tabs.
// Every node's top sits at least 26 units below its zone's top, so the NEW ring clears the tab.
// Text room: a label takes about 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle shows: "Virtual Machines" (app, w 170), "Flexible server"
// (database, w 170), "Managed Redis" (primary, w 170), "Memorystore replica" (w 196), "Clustered shards" (w 196),
// "Cloud Monitoring" (w 170).
const spec: DiagramSpec = {
  title: "A managed cache: cache-aside, a stampede, a rebuild lock, a replica and shards",
  width: 795,
  height: 640,
  steps: [
    { title: "Every product view reads the database" },
    { title: "Cache-aside: read the key, fill it on a miss" },
    { title: "The key expires: 1,200 misses at once" },
    { title: "One rebuild per key, refreshed early" },
    { title: "A replica in zone B takes over on failure" },
    { title: "Cluster mode spreads keys over shards" },
    { title: "Watch hit rate, evictions and memory" },
  ],
  zones: [
    { id: "shoppers-zone", title: "Shoppers", tone: "neutral", x: 10, y: 40, w: 225, h: 115 },
    { id: "app-zone", title: "App servers", tone: "teal", x: 10, y: 190, w: 225, h: 120 },
    { id: "db-zone", title: "Database", tone: "violet", x: 10, y: 345, w: 225, h: 115 },
    { id: "mon-zone", title: "Monitoring", tone: "orange", x: 10, y: 500, w: 225, h: 120 },
    { id: "zone-a", title: "Cache, zone A", tone: "orange", x: 300, y: 40, w: 190, h: 420 },
    { id: "zone-b", title: "Zone B", tone: "orange", x: 560, y: 190, w: 225, h: 120 },
    { id: "shards-zone", title: "Cluster mode", tone: "orange", x: 560, y: 345, w: 225, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "2,000 at 9 a.m.",
      icon: "users",
      tone: "neutral",
      x: 125,
      y: 100,
      w: 170,
    },
    {
      id: "app",
      label: "App servers",
      sub: "up to 10 on sale day",
      icon: "server",
      tone: "teal",
      x: 125,
      y: 250,
      w: 170,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "PostgreSQL, 4 CPUs",
      icon: "database",
      tone: "violet",
      x: 125,
      y: 405,
      w: 170,
      cloud: {
        aws: { id: "aws-rds", label: "RDS PostgreSQL" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL" },
        azure: { id: "azure-postgresql", label: "Flexible server" },
      },
    },
    {
      id: "cache",
      label: "Cache primary",
      sub: "baskets, 7 days",
      icon: "cache",
      tone: "orange",
      accent: true,
      x: 395,
      y: 250,
      w: 170,
      cloud: {
        aws: "aws-elasticache",
        gcp: "gcp-memorystore",
        azure: { id: "azure-managed-redis", label: "Managed Redis" },
      },
    },

    // Step 2
    {
      id: "key",
      label: "Hero poster key",
      sub: "TTL 5 minutes",
      icon: "key",
      tone: "orange",
      step: 2,
      x: 395,
      y: 405,
      w: 170,
    },

    // Step 4
    {
      id: "lock",
      label: "Rebuild lock",
      sub: "1 winner, 5 s expiry",
      icon: "lock",
      tone: "orange",
      step: 4,
      x: 395,
      y: 100,
      w: 170,
    },

    // Step 5
    {
      id: "replica",
      label: "Cache replica",
      sub: "takes over if A fails",
      icon: "cache",
      tone: "orange",
      step: 5,
      x: 670,
      y: 250,
      w: 196,
      cloud: {
        aws: { id: "aws-elasticache", label: "ElastiCache replica" },
        gcp: { id: "gcp-memorystore", label: "Memorystore replica" },
        azure: { id: "azure-managed-redis", label: "Redis replica" },
      },
    },

    // Step 6
    {
      id: "shards",
      label: "Shards 2 and 3",
      sub: "each owns some slots",
      icon: "partition",
      tone: "orange",
      step: 6,
      x: 670,
      y: 405,
      w: 196,
      cloud: {
        aws: { id: "aws-elasticache", label: "Cluster mode" },
        gcp: { id: "gcp-memorystore", label: "Cluster shards" },
        azure: { id: "azure-managed-redis", label: "Clustered shards" },
      },
    },

    // Step 7
    {
      id: "metrics",
      label: "Cache metrics",
      sub: "hit rate, evictions",
      icon: "signal",
      tone: "orange",
      step: 7,
      x: 125,
      y: 560,
      w: 170,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },
  ],
  edges: [
    // Step 1: baskets already come from the cache; product pages come from the database on every view.
    { from: "shoppers", to: "app", label: "view a product", packet: true },
    { from: "app", to: "cache", label: "basket by id", packet: true, delay: 0.8 },
    { from: "app", to: "db", label: "query, every view", packet: true, delay: 1.2, until: 1 },

    // Step 2: cache-aside. Read the key; only a miss reaches the database, and the answer is stored for 5 minutes.
    { from: "app", to: "key", label: "GET, else SET", packet: true, step: 2, until: 2 },
    { from: "app", to: "db", label: "on a miss only", dashed: true, step: 2, until: 2 },

    // Step 3: the failure. The key expires at 9:00 and every request misses at the same moment.
    { from: "key", to: "app", label: "expired: 1,200 misses", tone: "red", dashed: true, step: 3, until: 3 },
    { from: "app", to: "db", label: "1,200 queries", tone: "red", packet: true, step: 3, until: 3 },

    // Step 4: one request takes the lock and rebuilds; the others get the old copy. The key is refreshed early.
    { from: "app", to: "lock", label: "take lock", packet: true, step: 4 },
    { from: "app", to: "key", label: "old copy, refresh early", packet: true, delay: 0.6, step: 4 },
    { from: "app", to: "db", label: "1 query per key", packet: true, delay: 1.2, step: 4 },

    // Step 5: the primary copies every write to the replica in zone B.
    { from: "cache", to: "replica", label: "copy", flow: true, dashed: true, step: 5 },

    // Step 6: cluster mode hands some of the key slots to new shards.
    { from: "cache", to: "shards", label: "slots move", dashed: true, step: 6 },

    // Step 7: the cache reports misses, evictions and memory use.
    { from: "key", to: "metrics", label: "misses, evictions", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
