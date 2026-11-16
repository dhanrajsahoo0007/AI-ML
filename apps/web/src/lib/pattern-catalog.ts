// The System Design Patterns hub as data: every pattern page with its tier and category, and the use cases the
// hub explorer (<PatternUseCaseExplorer />) highlights. `pattern-catalog.test.ts` checks this file against the hub
// MDX's index (`content/system-design/_index.yaml`), so titles, order, tiers and categories cannot drift.
// Counts shown in the UI are computed from these lists, never typed.

export type PatternTier = "core" | "advanced";

export const PATTERN_CATEGORIES = [
  "Scaling & Traffic",
  "Data & Consistency",
  "Messaging & Async",
  "Reliability & Resilience",
  "Specialised Structures",
] as const;

type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

interface Pattern {
  slug: string;
  href: string;
  title: string;
  /** The hub card's text. */
  description: string;
  tier: PatternTier;
  category: PatternCategory;
  /** Advanced only: the one line that sets a senior answer apart. */
  edge?: string;
}

type PatternRow = Omit<Pattern, "href">;

const ROWS: PatternRow[] = [
  // Scaling & Traffic
  {
    slug: "load-balancing",
    title: "Load Balancing",
    description: "L4 vs L7, algorithms, health checks and global balancing.",
    tier: "core",
    category: "Scaling & Traffic",
  },
  {
    slug: "caching",
    title: "Caching",
    description: "Cache-aside, write-through, eviction, invalidation and stampedes.",
    tier: "core",
    category: "Scaling & Traffic",
  },
  {
    slug: "consistent-hashing",
    title: "Consistent Hashing",
    description: "Hash rings and virtual nodes so scaling moves minimal data.",
    tier: "core",
    category: "Scaling & Traffic",
  },
  {
    slug: "sharding",
    title: "Sharding and Partitioning",
    description: "Range, hash and directory partitioning, hot shards and resharding.",
    tier: "core",
    category: "Scaling & Traffic",
  },
  {
    slug: "service-discovery-and-coordination",
    title: "Service Discovery and Coordination Services",
    description: "Registries, health-checked endpoints, watches and config push.",
    tier: "core",
    category: "Scaling & Traffic",
  },
  {
    slug: "hot-keys-and-coalescing",
    title: "Hot Keys, Skew and Request Coalescing",
    description: "Singleflight, in-process caches and key salting for skewed traffic.",
    tier: "advanced",
    category: "Scaling & Traffic",
    edge: "Name single flight, a 1 s in-process cache and key salting when asked about a celebrity key.",
  },
  {
    slug: "batching-and-pipelining",
    title: "Request Batching, Pipelining and Scatter-Gather",
    description: "Linger windows, pipelined sockets and scatter-gather with deadlines.",
    tier: "advanced",
    category: "Scaling & Traffic",
    edge: "Turn thousands of tiny writes into linger-window batches and say what the delay costs.",
  },

  // Data & Consistency
  {
    slug: "consistency-models",
    title: "Consistency Models and CAP",
    description: "Strong, eventual and causal consistency, PACELC and quorums.",
    tier: "core",
    category: "Data & Consistency",
  },
  {
    slug: "idempotency",
    title: "Idempotency",
    description: "Idempotency keys and deduplication so retries are safe.",
    tier: "core",
    category: "Data & Consistency",
  },
  {
    slug: "saga",
    title: "Saga and Distributed Transactions",
    description: "Compensating workflows instead of two-phase commit.",
    tier: "core",
    category: "Data & Consistency",
  },
  {
    slug: "cqrs-event-sourcing",
    title: "CQRS and Event Sourcing",
    description: "Separate read and write models and store state as events.",
    tier: "core",
    category: "Data & Consistency",
  },
  {
    slug: "outbox-and-cdc",
    title: "Transactional Outbox and Change Data Capture",
    description: "One transaction, then a log-tailed relay, so no event is lost.",
    tier: "advanced",
    category: "Data & Consistency",
    edge: "Close the dual-write gap with an outbox row in the same transaction and a log-tailed relay.",
  },
  {
    slug: "concurrency-and-locking",
    title: "Concurrency Control, Locking and Reservations",
    description: "Row locks, version checks, timed holds and fencing tokens.",
    tier: "advanced",
    category: "Data & Consistency",
    edge: "Choose between a row lock, a version check and a timed hold, and fence stale holders.",
  },
  {
    slug: "materialized-views",
    title: "Materialized Views and Read Projections",
    description: "Precomputed query tables kept fresh from a change stream.",
    tier: "advanced",
    category: "Data & Consistency",
    edge: "Replace a cross-shard join with a precomputed view you can rebuild from the source.",
  },
  {
    slug: "distributed-time-and-clocks",
    title: "Distributed Time, Clocks and Ordering",
    description: "Clock skew, Lamport and vector clocks, HLC and TrueTime.",
    tier: "advanced",
    category: "Data & Consistency",
    edge: "Explain why timestamps cannot order writes and what Lamport, HLC and TrueTime do instead.",
  },
  {
    slug: "online-migrations",
    title: "Zero-Downtime Migrations: Dual Writes, Backfill and Cutover",
    description: "Dual writes, backfills, shadow reads and a cutover you can undo.",
    tier: "advanced",
    category: "Data & Consistency",
    edge: "Move live data with dual writes, a backfill and compared reads, with a way back at every step.",
  },
  {
    slug: "ledgers-and-reconciliation",
    title: "Double-Entry Ledgers and Reconciliation",
    description: "Append-only double-entry records that always sum to zero.",
    tier: "advanced",
    category: "Data & Consistency",
    edge: "Record money as immutable double-entry pairs and prove it with a daily reconciliation.",
  },

  // Messaging & Async
  {
    slug: "message-queues",
    title: "Message Queues and Pub/Sub",
    description: "Queues, topics, partitions, delivery guarantees and dead letters.",
    tier: "core",
    category: "Messaging & Async",
  },
  {
    slug: "fan-out",
    title: "Fan-out: Push vs Pull",
    description: "Fan-out on write, on read and the hybrid for feeds and notifications.",
    tier: "core",
    category: "Messaging & Async",
  },
  {
    slug: "back-pressure",
    title: "Back Pressure and Load Shedding",
    description: "Bounded queues, admission control and priority shedding.",
    tier: "core",
    category: "Messaging & Async",
  },
  {
    slug: "workflows-and-job-scheduling",
    title: "Durable Workflows and Distributed Job Scheduling",
    description: "Delay queues, leased workers and durable state machines.",
    tier: "advanced",
    category: "Messaging & Async",
    edge: 'Replace "a cron job" with due-time buckets, leased workers and a durable workflow.',
  },
  {
    slug: "realtime-gateways-and-presence",
    title: "Real-Time Connection Gateways and Presence",
    description: "Gateway fleets, session routing, presence and reconnect cursors.",
    tier: "advanced",
    category: "Messaging & Async",
    edge: "Say how a message finds one socket among many gateways, and what presence costs.",
  },
  {
    slug: "stream-processing-and-windowing",
    title: "Stream Processing and Windowed Aggregation",
    description: "Tumbling, sliding and session windows, watermarks and checkpoints.",
    tier: "advanced",
    category: "Messaging & Async",
    edge: "Use event-time windows and watermarks when events arrive late and out of order.",
  },

  // Reliability & Resilience
  {
    slug: "circuit-breaker-and-retries",
    title: "Circuit Breaker, Retries and Timeouts",
    description: "Backoff with jitter, breakers and bulkheads.",
    tier: "core",
    category: "Reliability & Resilience",
  },
  {
    slug: "rate-limiting",
    title: "Rate Limiting",
    description: "Token bucket, sliding window and distributed counters.",
    tier: "core",
    category: "Reliability & Resilience",
  },
  {
    slug: "leader-election",
    title: "Leader Election and Consensus",
    description: "Raft, quorums, leases and fencing tokens.",
    tier: "core",
    category: "Reliability & Resilience",
  },
  {
    slug: "bulkheads-and-cell-architecture",
    title: "Bulkheads, Shuffle Sharding and Cell Architecture",
    description: "Isolated pools, shuffle shards and cells that cap the blast radius.",
    tier: "advanced",
    category: "Reliability & Resilience",
    edge: "Cap an outage to one cell or one shuffle shard and give the fraction of customers hit.",
  },
  {
    slug: "gossip-and-failure-detection",
    title: "Gossip Protocols, Heartbeats and Failure Detection",
    description: "SWIM probes, phi accrual, epidemic spread and Merkle repair.",
    tier: "advanced",
    category: "Reliability & Resilience",
    edge: "Track liveness with gossip and indirect probes where a central monitor would flap.",
  },
  {
    slug: "tail-latency-and-degradation",
    title: "Tail-Latency Hedging, Deadlines and Degradation",
    description: "Hedged requests, deadline budgets and brownout modes.",
    tier: "advanced",
    category: "Reliability & Resilience",
    edge: "Do the fan-out maths, then hedge, pass deadlines down and switch off optional work.",
  },
  {
    slug: "multi-region-and-failover",
    title: "Multi-Region, Active-Active and Failover",
    description: "Home regions, cross-region replication, RPO, RTO and failover.",
    tier: "advanced",
    category: "Reliability & Resilience",
    edge: "Give each user a home region, state the RPO and RTO, and say who decides to fail over.",
  },

  // Specialised Structures
  {
    slug: "unique-id-generation",
    title: "Unique ID Generation",
    description: "Snowflake IDs, UUIDs, ranges and base62 short codes.",
    tier: "core",
    category: "Specialised Structures",
  },
  {
    slug: "bloom-filter",
    title: "Bloom Filters and Probabilistic Structures",
    description: "Cheap membership, cardinality and frequency estimates.",
    tier: "core",
    category: "Specialised Structures",
  },
  {
    slug: "geospatial-indexing",
    title: "Geospatial Indexing",
    description: "Geohash, quadtrees, R-trees and H3 for proximity search.",
    tier: "core",
    category: "Specialised Structures",
  },
  {
    slug: "blob-storage-and-chunking",
    title: "Blob Storage, Chunking and Dedup",
    description: "Object storage, resumable uploads, dedup and CDNs.",
    tier: "core",
    category: "Specialised Structures",
  },
  {
    slug: "top-k-and-leaderboards",
    title: "Top-K, Heavy Hitters and Leaderboards",
    description: "Sorted-set rankings and Count-Min heavy hitters over windows.",
    tier: "advanced",
    category: "Specialised Structures",
    edge: "Pick an exact sorted set or a Count-Min sketch with a heap, and state the error bound.",
  },
  {
    slug: "tries-and-typeahead",
    title: "Tries, Prefix Trees and Typeahead",
    description: "Radix tries with top-k per node, built offline, served from memory.",
    tier: "advanced",
    category: "Specialised Structures",
    edge: "Serve suggestions from a trie with top-k stored per node, built offline from query logs.",
  },
];

const PATTERN_PREFIX = "/system-design/patterns/";
const CASE_STUDY_PREFIX = "/system-design-case-studies/case-studies/";

export const PATTERNS: Pattern[] = ROWS.map((r) => ({ ...r, href: PATTERN_PREFIX + r.slug }));
export const PATTERN_BY_SLUG: ReadonlyMap<string, Pattern> = new Map(PATTERNS.map((p) => [p.slug, p]));

interface UseCase {
  id: string;
  label: string;
  blurb: string;
  caseStudies: { title: string; href: string }[];
  patterns: { slug: string; role: "core" | "edge"; why: string }[];
}

type CaseStudySlug = keyof typeof CASE_STUDIES;

const CASE_STUDIES = {
  "url-shortener": "URL Shortener",
  netflix: "Netflix",
  "facebook-messenger": "Facebook Messenger",
  whatsapp: "WhatsApp",
  chatgpt: "ChatGPT",
  twitter: "Twitter",
  instagram: "Instagram",
  tiktok: "TikTok",
  ticketmaster: "Ticketmaster",
  "hotel-booking": "Hotel Booking",
  "parking-garage": "Parking Garage",
  "kindle-payments": "Kindle Payments",
  "uber-eats": "Uber Eats",
  "google-maps": "Google Maps",
  tinder: "Tinder",
  zillow: "Zillow",
  dropbox: "Dropbox",
  youtube: "YouTube",
  s3: "S3",
  "user-data-export": "User Data Export",
  typeahead: "Typeahead",
  "web-crawler": "Web Crawler",
  "metrics-and-logging": "Metrics and Logging",
  "distributed-message-queue": "Distributed Message Queue",
  "key-value-store": "Key-Value Store",
  "rate-limiter": "Rate Limiter",
} as const;

const cases = (...slugs: CaseStudySlug[]) =>
  slugs.map((s) => ({ title: CASE_STUDIES[s], href: CASE_STUDY_PREFIX + s }));
const core = (slug: string, why: string) => ({ slug, role: "core" as const, why });
const edge = (slug: string, why: string) => ({ slug, role: "edge" as const, why });

export const USE_CASES: UseCase[] = [
  {
    id: "high-read-api",
    label: "High-read API & redirects",
    blurb: "Millions of reads for every write: serve them from memory and keep the database for misses.",
    caseStudies: cases("url-shortener", "netflix"),
    patterns: [
      core("caching", "Answer most reads from memory"),
      core("load-balancing", "Spread reads over stateless servers"),
      core("consistent-hashing", "Add cache nodes without a cold start"),
      core("unique-id-generation", "Short codes and ids without a central counter"),
      edge("hot-keys-and-coalescing", "Single flight and key salting"),
      edge("tail-latency-and-degradation", "Hedged reads"),
    ],
  },
  {
    id: "realtime-chat",
    label: "Real-time chat & presence",
    blurb: "Long-lived connections, messages in order per chat and delivery receipts that survive retries.",
    caseStudies: cases("facebook-messenger", "whatsapp", "chatgpt"),
    patterns: [
      core("sharding", "Partition conversations by chat id"),
      core("unique-id-generation", "Sortable message ids"),
      core("fan-out", "Deliver one message to every member"),
      core("idempotency", "A resent message is stored once"),
      edge("realtime-gateways-and-presence", "Gateway routing and heartbeats"),
      edge("distributed-time-and-clocks", "Per-chat ordering"),
    ],
  },
  {
    id: "social-feed",
    label: "Social feed & notifications",
    blurb: "One post reaches millions of feeds; a few accounts make most of the traffic.",
    caseStudies: cases("twitter", "instagram", "tiktok"),
    patterns: [
      core("fan-out", "Push to followers, pull for celebrities"),
      core("caching", "Keep timelines in memory"),
      core("message-queues", "Fan-out work runs off the request path"),
      core("sharding", "Split posts and timelines by user"),
      edge("hot-keys-and-coalescing", "Celebrity keys"),
      edge("materialized-views", "Precomputed timelines"),
    ],
  },
  {
    id: "flash-sale-booking",
    label: "Flash sale & seat booking",
    blurb: "Far more buyers than items at one moment: admit them fairly and never sell an item twice.",
    caseStudies: cases("ticketmaster", "hotel-booking", "parking-garage"),
    patterns: [
      core("back-pressure", "Admit buyers at the rate you can serve"),
      core("saga", "Hold, pay and confirm with compensation"),
      core("idempotency", "A double-click books once"),
      core("rate-limiting", "Stop bots from flooding the queue"),
      edge("concurrency-and-locking", "Timed seat holds"),
      edge("workflows-and-job-scheduling", "Hold expiry timers"),
    ],
  },
  {
    id: "payments-ledger",
    label: "Payments, wallets & ledgers",
    blurb: "Money moves exactly once, every movement is recorded twice and the books balance every day.",
    caseStudies: cases("kindle-payments"),
    patterns: [
      core("idempotency", "A retried charge is charged once"),
      core("saga", "Reserve, charge and refund across services"),
      core("cqrs-event-sourcing", "Balances rebuilt from an event history"),
      core("consistency-models", "Know which reads must be strong"),
      edge("ledgers-and-reconciliation", "Double entry and daily checks"),
      edge("outbox-and-cdc", "No lost payment event"),
      edge("concurrency-and-locking", "Serialised balance updates"),
    ],
  },
  {
    id: "location-dispatch",
    label: "Location & live dispatch",
    blurb: "Positions change every few seconds; match nearby people and assign each job once.",
    caseStudies: cases("uber-eats", "google-maps", "tinder", "zillow"),
    patterns: [
      core("geospatial-indexing", "Find what is near a point"),
      core("message-queues", "Location updates as a stream"),
      core("saga", "Order, assign and deliver as steps"),
      core("caching", "Keep live positions in memory"),
      edge("concurrency-and-locking", "One courier, one order"),
      edge("realtime-gateways-and-presence", "Live location stream"),
    ],
  },
  {
    id: "file-video-storage",
    label: "File sync, video & object storage",
    blurb: "Large files in chunks, long processing jobs and storage nodes that fail every day.",
    caseStudies: cases("dropbox", "youtube", "s3", "user-data-export"),
    patterns: [
      core("blob-storage-and-chunking", "Upload, dedup and serve in chunks"),
      core("consistent-hashing", "Place chunks across storage nodes"),
      core("message-queues", "Hand uploads to processing workers"),
      core("leader-election", "One coordinator per partition"),
      edge("workflows-and-job-scheduling", "Transcoding and export jobs"),
      edge("gossip-and-failure-detection", "Storage node liveness and repair"),
    ],
  },
  {
    id: "typeahead-trending",
    label: "Typeahead, trending & leaderboards",
    blurb: "Answers in tens of milliseconds from counts that change every second.",
    caseStudies: cases("typeahead"),
    patterns: [
      core("bloom-filter", "Skip lookups for terms that do not exist"),
      core("caching", "Serve popular prefixes from memory"),
      core("sharding", "Split the index by prefix"),
      edge("tries-and-typeahead", "Prefix trie with top-k per node"),
      edge("top-k-and-leaderboards", "Sketch plus sorted set"),
      edge("stream-processing-and-windowing", "Windowed counts feed the trending list"),
    ],
  },
  {
    id: "crawler-pipelines",
    label: "Web crawler & async pipelines",
    blurb: "Billions of small jobs, polite to every host, restartable after any crash.",
    caseStudies: cases("web-crawler", "user-data-export"),
    patterns: [
      core("message-queues", "A frontier of URLs to fetch"),
      core("bloom-filter", "Skip URLs already seen"),
      core("rate-limiting", "Stay polite to each host"),
      core("back-pressure", "Slow fetchers when parsers fall behind"),
      edge("workflows-and-job-scheduling", "Politeness delays and leases"),
      edge("batching-and-pipelining", "Batched fetches and index writes"),
    ],
  },
  {
    id: "metrics-streams",
    label: "Metrics, logs & stream ingestion",
    blurb: "Millions of points a second that arrive late, out of order and in bursts.",
    caseStudies: cases("metrics-and-logging", "distributed-message-queue"),
    patterns: [
      core("sharding", "Partition by series or tenant"),
      core("back-pressure", "Absorb bursts without dropping data"),
      core("message-queues", "A durable log between producers and stores"),
      core("bloom-filter", "Skip files that cannot hold a series"),
      edge("stream-processing-and-windowing", "Rollups and watermarks"),
      edge("batching-and-pipelining", "Micro-batched ingestion"),
    ],
  },
  {
    id: "kv-coordination",
    label: "Distributed KV & coordination",
    blurb: "Keys spread over many nodes that join, fail and disagree about the latest value.",
    caseStudies: cases("key-value-store", "rate-limiter"),
    patterns: [
      core("consistent-hashing", "Place keys on a ring of nodes"),
      core("consistency-models", "Pick quorums for reads and writes"),
      core("leader-election", "One writer per partition"),
      core("bloom-filter", "Skip disk reads for missing keys"),
      core("service-discovery-and-coordination", "Clients find the nodes that own a key"),
      edge("gossip-and-failure-detection", "Membership and hinted handoff"),
      edge("distributed-time-and-clocks", "Version vectors and HLC"),
    ],
  },
  {
    id: "multi-tenant-resilience",
    label: "Multi-service & tenant resilience",
    blurb: "Many services and tenants share one platform; one bad actor must not take it down.",
    caseStudies: cases("rate-limiter", "chatgpt"),
    patterns: [
      core("circuit-breaker-and-retries", "Stop calling a failing dependency"),
      core("rate-limiting", "Cap each tenant's share"),
      core("back-pressure", "Shed load before queues explode"),
      core("load-balancing", "Route around unhealthy instances"),
      core("service-discovery-and-coordination", "Healthy endpoints and config push"),
      edge("bulkheads-and-cell-architecture", "Shuffle shards and cells"),
      edge("tail-latency-and-degradation", "Deadlines and brownouts"),
    ],
  },
  {
    id: "global-and-migrations",
    label: "Global users & live migrations",
    blurb: "Users on every continent and a schema that must change without a maintenance window.",
    caseStudies: cases("netflix", "instagram", "s3"),
    patterns: [
      core("sharding", "Split users so each move is small"),
      core("consistency-models", "Say what a far region may read"),
      core("load-balancing", "Send each user to a nearby region"),
      core("idempotency", "Replayed writes land once"),
      edge("multi-region-and-failover", "Home regions and failover"),
      edge("online-migrations", "Dual writes and backfill"),
    ],
  },
];

export type PatternTierFilter = "all" | PatternTier;

interface PatternMatch {
  role: "core" | "edge";
  /** The one-line reason for this use case; empty when only the tier filter is on. */
  note: string;
}

/**
 * The cards to highlight, keyed by href, or null when nothing is selected (every card idle).
 * Tier only: every pattern of that tier. A use case: its patterns, narrowed by the tier.
 */
export function computeMatches({
  useCase,
  tier,
}: {
  useCase: string | null;
  tier: PatternTierFilter;
}): Map<string, PatternMatch> | null {
  if (!useCase && tier === "all") return null;
  const out = new Map<string, PatternMatch>();
  if (!useCase) {
    for (const p of PATTERNS) {
      if (p.tier === tier) out.set(p.href, { role: p.tier === "advanced" ? "edge" : "core", note: "" });
    }
    return out;
  }
  const uc = USE_CASES.find((u) => u.id === useCase);
  for (const entry of uc?.patterns ?? []) {
    const p = PATTERN_BY_SLUG.get(entry.slug);
    if (!p || (tier !== "all" && p.tier !== tier)) continue;
    out.set(p.href, { role: entry.role, note: entry.why });
  }
  return out;
}
