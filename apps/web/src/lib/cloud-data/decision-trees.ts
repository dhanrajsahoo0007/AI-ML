import type { DecisionTree } from "./types";

// Cloud-neutral decision trees for <CloudDecisionTree topic="…" />. Each one starts from what the workload needs,
// not from a product, and ends on a pattern with the matching service on each cloud. Answers are catalog ids (linked
// to their profile) or plain names for things that are a feature of a service rather than a service of their own.

export const TREES: Record<string, DecisionTree> = {
  database: {
    title: "Database picker",
    start: "shape",
    questions: [
      {
        id: "shape",
        prompt: "What does the main workload look like?",
        options: [
          {
            label: "Related rows changed together",
            hint: "orders, payments, accounts; joins, constraints, transactions",
            next: "writes",
          },
          {
            label: "Lookups by key at very high volume",
            hint: "sessions, carts, profiles, device state, event history",
            next: "items",
          },
          {
            label: "Questions over a lot of history",
            hint: "dashboards, reports, scans across billions of rows",
            next: "r-warehouse",
          },
          {
            label: "A helper next to the main database",
            hint: "text search, or a cache for hot reads",
            next: "helper",
          },
        ],
      },
      {
        id: "writes",
        prompt: "Where do writes need to land?",
        options: [
          {
            label: "In one Region",
            hint: "a standby and read replicas cover failures and read load",
            next: "r-relational",
          },
          {
            label: "In several Regions, with no stale reads",
            hint: "users on different continents changing the same data",
            next: "r-distributed-sql",
          },
        ],
      },
      {
        id: "items",
        prompt: "What do the items look like?",
        options: [
          {
            label: "Records or JSON documents",
            hint: "fields vary per item; read by id or by a few indexes",
            next: "r-key-document",
          },
          {
            label: "Huge tables that mostly grow",
            hint: "sensor readings, metrics, message history, read by key and time range",
            next: "r-wide-column",
          },
        ],
      },
      {
        id: "helper",
        prompt: "Which job does the helper do?",
        options: [
          { label: "Text search", hint: "relevance ranking, typos, filters and facets", next: "r-search" },
          { label: "Cache", hint: "hot reads, sessions, counters, rate limits", next: "r-cache" },
        ],
      },
    ],
    results: [
      {
        id: "r-relational",
        headline: "A managed relational database",
        answer: {
          aws: ["aws-rds", "aws-aurora"],
          gcp: ["gcp-cloud-sql", "gcp-alloydb"],
          azure: ["azure-sql", "azure-postgresql"],
        },
        why: "Transactions keep related rows correct together, SQL answers questions you have not thought of yet, and the service takes over backups, patching and failover to a standby in another zone.",
        tradeoff:
          "One primary takes every write, so write load grows by buying a bigger machine until you shard. Replicas lag a little behind the primary.",
      },
      {
        id: "r-distributed-sql",
        headline: "A distributed SQL database",
        answer: {
          aws: ["aws-aurora-dsql"],
          gcp: ["gcp-spanner"],
          azure: ["Azure Cosmos DB for PostgreSQL"],
        },
        why: "It keeps SQL and transactions while copying every write to several Regions before confirming it, so any Region can serve current data and losing one Region loses nothing.",
        tradeoff:
          "Every write waits for a quorum across Regions, so writes are slower and cost more than on a single-Region database. Azure's closest option scales out inside one Region only.",
      },
      {
        id: "r-key-document",
        headline: "A serverless key-value or document database",
        answer: {
          aws: ["aws-dynamodb", "aws-documentdb"],
          gcp: ["gcp-firestore"],
          azure: ["azure-cosmos-db", "azure-documentdb"],
        },
        why: "Data is spread over many partitions by key, so reads and writes stay fast at any size and there are no servers to size. Each item can carry its own fields.",
        tradeoff:
          "You design the keys around the queries you already know. A new kind of query later often means a new index or a second copy of the data, and there are no joins.",
      },
      {
        id: "r-wide-column",
        headline: "A wide-column or time-series store",
        answer: {
          aws: ["Amazon Keyspaces", "Timestream for InfluxDB"],
          gcp: ["gcp-bigtable"],
          azure: ["Managed Instance for Apache Cassandra", "Azure Data Explorer"],
        },
        why: "Rows are kept sorted by key, so writing at a very high rate and reading one key's range of time are both cheap, and old data can expire on its own.",
        tradeoff:
          "Only queries that follow the key order are fast. A badly chosen key puts all traffic on one partition, and fixing it means rewriting the table.",
      },
      {
        id: "r-warehouse",
        headline: "A data warehouse or lake query engine",
        answer: {
          aws: ["aws-redshift", "aws-athena"],
          gcp: ["gcp-bigquery"],
          azure: ["azure-fabric"],
        },
        why: "Column storage reads only the columns a query needs and spreads the scan over many machines, so questions over billions of rows come back in seconds.",
        tradeoff:
          "Built for a few large questions, not thousands of small ones: single-row reads and updates are slow, and data arrives in batches or with a short delay.",
      },
      {
        id: "r-search",
        headline: "A search engine fed from the main database",
        answer: {
          aws: ["aws-opensearch"],
          gcp: ["Vertex AI Search"],
          azure: ["azure-ai-search"],
        },
        why: "An inverted index finds documents by the words in them and ranks them by relevance, which a database index cannot do well.",
        tradeoff:
          "It is a second copy of the data that trails the source by seconds, so keep the database as the source of truth and plan how the index is rebuilt.",
      },
      {
        id: "r-cache",
        headline: "A managed in-memory cache",
        answer: {
          aws: ["aws-elasticache"],
          gcp: ["gcp-memorystore"],
          azure: ["azure-managed-redis"],
        },
        why: "Answers kept in memory come back in under a millisecond and take read load off the database behind them.",
        tradeoff:
          "Cached data can be stale and can vanish when a node restarts, so the application must cope with a miss and decide when entries expire.",
      },
    ],
  },

  storage: {
    title: "Storage picker",
    start: "access",
    questions: [
      {
        id: "access",
        prompt: "How will programs reach the data?",
        options: [
          {
            label: "Whole files by name, over HTTP",
            hint: "uploads, media, backups, logs, data-lake files",
            next: "frequency",
          },
          {
            label: "As a disk for one machine",
            hint: "database files, boot volumes, fast random reads and writes",
            next: "r-block",
          },
          {
            label: "As a folder many machines mount",
            hint: "shared content, home directories, apps that expect a file path",
            next: "share",
          },
        ],
      },
      {
        id: "frequency",
        prompt: "How often is a file read after it is written?",
        options: [
          { label: "Often, or hard to predict", hint: "live media, active datasets", next: "r-object-hot" },
          {
            label: "Rarely, but it must open at once",
            hint: "older media, monthly reports, recent backups",
            next: "r-object-cool",
          },
          {
            label: "Almost never; a slow restore is fine",
            hint: "compliance archives, raw footage, old backups",
            next: "r-archive",
          },
        ],
      },
      {
        id: "share",
        prompt: "What kind of shared file system?",
        options: [
          { label: "A general NFS or SMB share", hint: "web content, team folders, CMS uploads", next: "r-file" },
          {
            label: "Very high throughput, or a specific engine",
            hint: "HPC and ML training, NetApp or Windows file-server features",
            next: "r-file-specialised",
          },
        ],
      },
    ],
    results: [
      {
        id: "r-object-hot",
        headline: "Object storage, standard class",
        answer: { aws: ["aws-s3"], gcp: ["gcp-cloud-storage"], azure: ["azure-blob"] },
        why: "It holds any number of files, survives the loss of a zone, and clients can upload and download directly with signed URLs so files never pass through your servers.",
        tradeoff:
          "An object is replaced whole, never edited in place, and every request has a small charge, so millions of tiny files cost more than their size suggests.",
      },
      {
        id: "r-object-cool",
        headline: "Object storage, infrequent-access class",
        answer: {
          aws: ["aws-s3", "S3 Standard-IA", "S3 Intelligent-Tiering"],
          gcp: ["gcp-cloud-storage", "Nearline", "Autoclass"],
          azure: ["azure-blob", "Cool tier"],
        },
        why: "The same bucket and the same instant access at a lower price per gigabyte. A lifecycle rule or automatic tiering moves objects there when reads stop.",
        tradeoff:
          "Reads cost more and each object has a minimum billed lifetime, so data that turns out to be busy ends up costing more than in the standard class.",
      },
      {
        id: "r-archive",
        headline: "Object storage, archive class",
        answer: {
          aws: ["aws-s3", "S3 Glacier Deep Archive"],
          gcp: ["gcp-cloud-storage", "Archive class"],
          azure: ["azure-blob", "Archive tier"],
        },
        why: "The cheapest place to keep data you must retain but do not expect to read, with the same durability as the other classes.",
        tradeoff:
          "Getting data back costs money and, on AWS and Azure, takes hours. Deleting early is charged, so only move data here once it has gone quiet.",
      },
      {
        id: "r-block",
        headline: "A block volume attached to the machine",
        answer: { aws: ["aws-ebs"], gcp: ["gcp-persistent-disk"], azure: ["azure-managed-disks"] },
        why: "It behaves like a local disk: any file system, low and steady latency, and performance you can set. Snapshots give point-in-time copies.",
        tradeoff:
          "It normally belongs to one machine in one zone and you pay for the size you provision, whether or not it is full.",
      },
      {
        id: "r-file",
        headline: "A managed file share",
        answer: { aws: ["aws-efs"], gcp: ["gcp-filestore"], azure: ["azure-files"] },
        why: "Many machines and containers mount the same folder with ordinary file operations, so existing software works without changes.",
        tradeoff:
          "It costs more per gigabyte than object storage and is slower than a local disk, so do not put a database on it.",
      },
      {
        id: "r-file-specialised",
        headline: "A specialised managed file system",
        answer: {
          aws: ["aws-fsx"],
          gcp: ["Managed Lustre", "NetApp Volumes"],
          azure: ["Azure Managed Lustre", "Azure NetApp Files"],
        },
        why: "Parallel file systems feed large compute clusters far faster than a general share, and managed NetApp or Windows file servers keep the features existing estates rely on.",
        tradeoff:
          "You size capacity and throughput up front and pay for it while it sits idle. For training data, keep the long-term copy in object storage.",
      },
    ],
  },

  connectivity: {
    title: "Connectivity picker",
    start: "ends",
    questions: [
      {
        id: "ends",
        prompt: "What needs to reach what?",
        options: [
          {
            label: "My workloads to a managed service, privately",
            hint: "storage, a database or another team's API, without crossing the internet",
            next: "r-private-endpoint",
          },
          {
            label: "One of my networks to another, in the same cloud",
            hint: "separate networks per team, environment or account",
            next: "count",
          },
          {
            label: "My data centre or office to the cloud",
            hint: "hybrid applications, migrations, shared directories",
            next: "volume",
          },
          {
            label: "Private machines out to the internet",
            hint: "download packages, call third-party APIs; nothing may connect in",
            next: "r-nat",
          },
        ],
      },
      {
        id: "count",
        prompt: "How many networks have to talk to each other?",
        options: [
          { label: "Two or three", hint: "and that is unlikely to change", next: "r-peering" },
          {
            label: "Many, or the number keeps growing",
            hint: "shared services, central inspection, on-premises links to all of them",
            next: "r-hub",
          },
        ],
      },
      {
        id: "volume",
        prompt: "How much traffic, and how steady must it be?",
        options: [
          {
            label: "Modest, and needed soon",
            hint: "admin access, small syncs, a first migration wave",
            next: "r-vpn",
          },
          {
            label: "Heavy, or sensitive to latency",
            hint: "database replication, large transfers, calls users wait on",
            next: "single-link",
          },
        ],
      },
      {
        id: "single-link",
        prompt: "Could the business ride out the loss of that one link?",
        options: [
          { label: "Yes, for a few hours", hint: "non-critical or batch traffic", next: "r-dedicated" },
          { label: "No", hint: "production traffic depends on it", next: "r-dedicated-backup" },
        ],
      },
    ],
    results: [
      {
        id: "r-private-endpoint",
        headline: "A private endpoint for that service",
        answer: { aws: ["aws-privatelink"], gcp: ["gcp-psc"], azure: ["azure-private-link"] },
        why: "The service appears as a private address inside your network. Traffic stays on the provider's backbone, and only that one service is exposed, not the network behind it.",
        tradeoff:
          "One endpoint per service per network, each billed by the hour and by the gigabyte, and private DNS must point the service's name at it.",
      },
      {
        id: "r-peering",
        headline: "Network peering",
        answer: { aws: ["VPC peering"], gcp: ["VPC Network Peering"], azure: ["VNet peering"] },
        why: "The two networks route to each other directly over the provider's backbone, with no gateway to run and no extra hop.",
        tradeoff:
          "Peering does not pass traffic on to a third network, so every pair needs its own link, and the address ranges must not overlap.",
      },
      {
        id: "r-hub",
        headline: "A managed hub with each network as a spoke",
        answer: {
          aws: ["aws-transit-gateway"],
          gcp: ["Network Connectivity Center"],
          azure: ["Virtual WAN"],
        },
        why: "Each network attaches once to the hub, which holds the routes. Adding a network is one attachment, and shared firewalls or on-premises links hang off the same hub.",
        tradeoff:
          "The hub charges per attachment and per gigabyte and adds a hop, and its route tables become something a team has to own.",
      },
      {
        id: "r-vpn",
        headline: "A site-to-site VPN",
        answer: { aws: ["AWS Site-to-Site VPN"], gcp: ["Cloud VPN"], azure: ["VPN Gateway"] },
        why: "Encrypted tunnels over the internet connection you already have: it can be working the same day and costs little.",
        tradeoff:
          "Speed and latency follow the public internet and each tunnel has a throughput ceiling. Set up two tunnels so one failure is not an outage.",
      },
      {
        id: "r-dedicated",
        headline: "A dedicated private line",
        answer: { aws: ["aws-direct-connect"], gcp: ["gcp-interconnect"], azure: ["azure-expressroute"] },
        why: "A private circuit from your site to the provider gives steady latency and high bandwidth, and data leaving the cloud over it is billed at a lower rate.",
        tradeoff:
          "It takes weeks to install, has a monthly port fee, and is not encrypted unless you add that. One circuit is one point of failure.",
      },
      {
        id: "r-dedicated-backup",
        headline: "Two dedicated lines, or a line with a VPN behind it",
        answer: {
          aws: ["aws-direct-connect", "AWS Site-to-Site VPN"],
          gcp: ["gcp-interconnect", "Cloud VPN"],
          azure: ["azure-expressroute", "VPN Gateway"],
        },
        why: "Routing shifts to the second path when the first one fails. Two lines in different locations keep full capacity; a VPN backup is cheaper and keeps the essentials running.",
        tradeoff:
          "You pay for a path that is idle most of the time. A VPN backup is slower, so decide in advance which traffic may use it, and test the switch.",
      },
      {
        id: "r-nat",
        headline: "A managed NAT gateway",
        answer: { aws: ["NAT gateway"], gcp: ["Cloud NAT"], azure: ["NAT Gateway"] },
        why: "Private machines share a few public addresses for outbound connections, and nothing on the internet can open a connection to them.",
        tradeoff:
          "It bills by the hour and by the gigabyte, which adds up for heavy traffic. Send traffic for the provider's own services through private endpoints instead.",
      },
    ],
  },

  "load-balancer": {
    title: "Load balancer picker",
    start: "callers",
    questions: [
      {
        id: "callers",
        prompt: "Who sends the traffic?",
        options: [
          {
            label: "Internet users, served from one Region",
            hint: "a regional product, or the first version of anything",
            next: "protocol",
          },
          {
            label: "Internet users, served from several Regions",
            hint: "one address worldwide, nearest healthy Region, failover",
            next: "global",
          },
          {
            label: "Only my own services",
            hint: "calls between tiers inside the private network",
            next: "r-internal",
          },
        ],
      },
      {
        id: "protocol",
        prompt: "What must the balancer understand?",
        options: [
          {
            label: "HTTP requests",
            hint: "route by host, path or header; end TLS; attach a WAF; gRPC",
            next: "r-http",
          },
          {
            label: "Only connections",
            hint: "raw TCP or UDP, a fixed IP address, very high connection counts",
            next: "r-network",
          },
        ],
      },
      {
        id: "global",
        prompt: "What should spread users across Regions?",
        options: [
          {
            label: "An HTTP entry point at the edge",
            hint: "web and API traffic; caching and WAF in the same place",
            next: "r-global-http",
          },
          {
            label: "Fixed global IP addresses",
            hint: "TCP or UDP: games, voice, custom protocols, clients that pin IPs",
            next: "r-global-network",
          },
          {
            label: "DNS answers",
            hint: "each Region keeps its own balancer; failover in about a minute is fine",
            next: "r-dns",
          },
        ],
      },
    ],
    results: [
      {
        id: "r-http",
        headline: "A regional HTTP (layer 7) load balancer",
        answer: {
          aws: ["aws-elb"],
          gcp: ["gcp-cloud-load-balancing"],
          azure: ["azure-app-gateway"],
        },
        why: "It reads each request, so one address can route /api and /images to different services, end TLS, check health per path and sit behind a WAF. On AWS this is the Application Load Balancer.",
        tradeoff:
          "It speaks only HTTP-family protocols and has an idle timeout that long-lived connections must keep alive. Its addresses can change, so point DNS at its name.",
      },
      {
        id: "r-network",
        headline: "A regional network (layer 4) load balancer",
        answer: {
          aws: ["aws-elb"],
          gcp: ["gcp-cloud-load-balancing"],
          azure: ["azure-load-balancer"],
        },
        why: "It forwards connections without reading them, which gives very high throughput, fixed IP addresses and support for any TCP or UDP protocol. On AWS this is the Network Load Balancer.",
        tradeoff:
          "No routing by path or header and no WAF. A connection stays on one backend for its whole life, so long-lived connections can pile up unevenly.",
      },
      {
        id: "r-internal",
        headline: "An internal load balancer",
        answer: {
          aws: ["aws-elb"],
          gcp: ["gcp-cloud-load-balancing"],
          azure: ["azure-load-balancer", "azure-app-gateway"],
        },
        why: "It has only private addresses, so callers inside the network get one stable name for a tier while instances come and go behind it. Pick the HTTP or the network kind by the same rule as for public traffic.",
        tradeoff:
          "One more hop and one more hourly charge per service. With many small services, service discovery or a mesh may be the better fit.",
      },
      {
        id: "r-global-http",
        headline: "A global HTTP load balancer at the edge",
        answer: {
          aws: ["aws-cloudfront", "aws-elb"],
          gcp: ["gcp-cloud-load-balancing"],
          azure: ["azure-front-door"],
        },
        why: "Users connect to the nearest edge location, which ends TLS, serves cached content and forwards the rest to the closest healthy Region. Google Cloud and Azure offer this as one service; on AWS it is CloudFront in front of a load balancer in each Region.",
        tradeoff:
          "Routing and caching rules now live at the edge and are another thing to keep in step. Each Region still needs its own backends and its own copy of the data.",
      },
      {
        id: "r-global-network",
        headline: "Global anycast IP addresses",
        answer: {
          aws: ["aws-global-accelerator"],
          gcp: ["gcp-cloud-load-balancing"],
          azure: ["azure-load-balancer", "Cross-region Load Balancer"],
        },
        why: "The same IP addresses are announced from many locations, so traffic enters the provider's network close to the user and is steered to a healthy Region within seconds, with no DNS change.",
        tradeoff: "It adds an hourly fee and a per-gigabyte fee, and it does no caching and no HTTP routing.",
      },
      {
        id: "r-dns",
        headline: "DNS-based routing between Regions",
        answer: { aws: ["aws-route53"], gcp: ["gcp-cloud-dns"], azure: ["azure-traffic-manager"] },
        why: "DNS answers with the Region that is closest, healthiest or weighted highest. It works for any protocol and adds nothing to the request path.",
        tradeoff:
          "Clients and resolvers cache answers, so failover takes as long as the record's lifetime and some clients keep the old address longer.",
      },
    ],
  },

  "dr-strategy": {
    title: "Disaster recovery picker",
    start: "downtime",
    questions: [
      {
        id: "downtime",
        prompt: "After losing a whole Region, how long may the system stay down?",
        options: [
          { label: "Hours, up to a day", hint: "internal tools, back-office systems", next: "loss" },
          { label: "Tens of minutes", hint: "customer-facing, but a short outage is survivable", next: "budget" },
          {
            label: "Seconds to a few minutes",
            hint: "payments, communications, anything with a strict availability target",
            next: "writers",
          },
        ],
      },
      {
        id: "loss",
        prompt: "How much recent data may be lost?",
        options: [
          { label: "Everything since the last backup", hint: "hours of data can be re-entered", next: "r-backup" },
          { label: "A few minutes at most", hint: "orders and payments must survive", next: "r-pilot-light" },
        ],
      },
      {
        id: "budget",
        prompt: "What can you afford to keep running in the second Region?",
        options: [
          {
            label: "Only the data",
            hint: "a database replica; servers are defined but switched off",
            next: "r-pilot-light",
          },
          {
            label: "A small live copy of everything",
            hint: "every tier running at reduced size, ready to scale up",
            next: "r-warm-standby",
          },
        ],
      },
      {
        id: "writers",
        prompt: "Can the data layer accept writes in two Regions at once?",
        options: [
          {
            label: "No, one Region writes at a time",
            hint: "a relational database with a single primary",
            next: "r-hot-standby",
          },
          {
            label: "Yes, or we will build for it",
            hint: "a multi-Region database, or data split by user or tenant",
            next: "r-active-active",
          },
        ],
      },
    ],
    results: [
      {
        id: "r-backup",
        headline: "Backup and restore",
        answer: {
          aws: ["aws-backup", "aws-s3"],
          gcp: ["gcp-backup-dr", "gcp-cloud-storage"],
          azure: ["azure-backup", "azure-blob"],
        },
        why: "Backups are copied to a second Region and nothing runs there. After a disaster you rebuild the environment from infrastructure code and restore the data. It is the cheapest tier.",
        tradeoff:
          "Recovery takes hours and you lose whatever changed since the last backup. A restore that has never been rehearsed usually takes far longer than planned.",
      },
      {
        id: "r-pilot-light",
        headline: "Pilot light",
        answer: {
          aws: ["aws-elastic-disaster-recovery", "aws-aurora"],
          gcp: ["gcp-backup-dr", "gcp-cloud-sql"],
          azure: ["azure-site-recovery", "azure-sql"],
        },
        why: "Data is copied to the second Region continuously, so little is lost, while servers exist there only as images and templates. You pay for storage and a replica, not for idle compute.",
        tradeoff:
          "Starting servers, scaling them and switching traffic takes tens of minutes, and the capacity you need may be scarce if many customers fail over at once.",
      },
      {
        id: "r-warm-standby",
        headline: "Warm standby",
        answer: {
          aws: ["aws-route53", "aws-aurora"],
          gcp: ["gcp-cloud-load-balancing", "gcp-cloud-sql"],
          azure: ["azure-front-door", "azure-sql"],
        },
        why: "A small but complete copy of the system is always running in the second Region, so failing over means promoting the database, scaling out and moving traffic: minutes, not hours.",
        tradeoff:
          "You pay for a second environment all year, and it must be deployed and tested with every release or it will have drifted when you need it.",
      },
      {
        id: "r-hot-standby",
        headline: "Hot standby (active-passive at full size)",
        answer: {
          aws: ["aws-global-accelerator", "aws-aurora"],
          gcp: ["gcp-cloud-load-balancing", "gcp-alloydb"],
          azure: ["azure-front-door", "azure-sql"],
        },
        why: "The second Region runs at full size and its database replica is ready to be promoted, so health checks can move all traffic within a minute or two without waiting for anything to start.",
        tradeoff:
          "Roughly double the running cost for capacity that serves no users. Writes confirmed just before the failure may be missing on the replica unless replication is synchronous.",
      },
      {
        id: "r-active-active",
        headline: "Active-active across Regions",
        answer: {
          aws: ["aws-dynamodb", "aws-aurora-dsql", "aws-global-accelerator"],
          gcp: ["gcp-spanner", "gcp-cloud-load-balancing"],
          azure: ["azure-cosmos-db", "azure-front-door"],
        },
        why: "Every Region serves users all the time, so losing one removes some capacity but needs no failover step, and the path you depend on in a disaster is exercised every day.",
        tradeoff:
          "The data layer must either resolve conflicting writes or wait on a cross-Region quorum, and each Region needs spare capacity to absorb another's users. It is the most expensive and the hardest to build.",
      },
    ],
  },
};
