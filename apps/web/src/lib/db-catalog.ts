// Database families, their workload fit and the "pick a database" decision tree. Single source of truth for
// the widgets in src/components/db: the profile card, the workload matrix, the compare view and the picker
// all read from here, so a rating changed once shows up everywhere.

export type FamilyId =
  | "relational"
  | "key-value"
  | "document"
  | "wide-column"
  | "search"
  | "time-series"
  | "graph"
  | "vector"
  | "olap"
  | "newsql"
  | "object";

export type RatingKey = "reads" | "writes" | "queryFlex" | "scale" | "consistency" | "ops";

export const RATING_LABELS: Record<RatingKey, string> = {
  reads: "Read throughput",
  writes: "Write throughput",
  queryFlex: "Query flexibility",
  scale: "Horizontal scale",
  consistency: "Consistency / transactions",
  ops: "Operational simplicity",
};

export type ScenarioId =
  | "high-reads"
  | "high-writes"
  | "transactions"
  | "full-text"
  | "analytics"
  | "time-series"
  | "relationships"
  | "similarity"
  | "geo"
  | "flexible-schema";

export const SCENARIOS: { id: ScenarioId; label: string; short: string }[] = [
  { id: "high-reads", label: "High read volume", short: "Reads" },
  { id: "high-writes", label: "High write volume", short: "Writes" },
  { id: "transactions", label: "Multi-row transactions", short: "ACID" },
  { id: "full-text", label: "Full-text search", short: "Text" },
  { id: "analytics", label: "Aggregations / analytics", short: "Aggr" },
  { id: "time-series", label: "Time-keyed data", short: "Time" },
  { id: "relationships", label: "Deep relationships", short: "Graph" },
  { id: "similarity", label: "Similarity (vectors)", short: "Similar" },
  { id: "geo", label: "Geo / nearby", short: "Geo" },
  { id: "flexible-schema", label: "Flexible schema", short: "Schema" },
];

/** 2 = strong fit, 1 = workable with care, 0 = poor fit. */
export type Fit = 0 | 1 | 2;

export interface DbFamily {
  id: FamilyId;
  title: string;
  short: string;
  href: string;
  icon: string;
  tagline: string;
  dataModel: string;
  queryStyle: string;
  consistency: string;
  scaling: string;
  latency: string;
  examples: string[];
  useWhen: string[];
  avoidWhen: string[];
  /** 1 to 5. */
  ratings: Record<RatingKey, number>;
  fit: Record<ScenarioId, [Fit, string]>;
}

const base = "/system-design/databases";

export const FAMILIES: DbFamily[] = [
  {
    id: "relational",
    title: "Relational (SQL)",
    short: "Relational",
    href: `${base}/relational-databases`,
    icon: "table",
    tagline: "Tables, joins and ACID transactions. The default until a requirement says otherwise.",
    dataModel: "Normalized tables with a fixed schema, linked by foreign keys",
    queryStyle: "SQL: joins, filters, aggregates, ad-hoc queries",
    consistency: "Strong, ACID transactions across rows and tables",
    scaling: "Vertical first, then read replicas, then sharding",
    latency: "~1–10 ms indexed reads",
    examples: ["PostgreSQL", "MySQL", "SQL Server"],
    useWhen: [
      "Money, orders, inventory: anything that must never be half-written",
      "Data has clear relationships and you need joins",
      "Query patterns are unknown or will change",
      "Write load fits on one primary (true for most products)",
    ],
    avoidWhen: [
      "Sustained writes beyond what one primary can take",
      "Schema varies wildly per record",
      "Full-text relevance ranking or vector similarity at scale",
    ],
    ratings: { reads: 4, writes: 3, queryFlex: 5, scale: 2, consistency: 5, ops: 4 },
    fit: {
      "high-reads": [2, "Indexes + read replicas + a cache handle very high read volume"],
      "high-writes": [1, "One primary takes every write; beyond that you must shard"],
      transactions: [2, "Native multi-row, multi-table ACID transactions"],
      "full-text": [1, "Built-in full-text works for simple search, not relevance at scale"],
      analytics: [1, "Fine for modest data; row storage slows big scans"],
      "time-series": [1, "Works with partitioning (or the TimescaleDB extension)"],
      relationships: [1, "Joins handle 1–2 hops; deep traversals get expensive"],
      similarity: [1, "pgvector works well up to millions of vectors"],
      geo: [2, "PostGIS is the gold standard for geospatial queries"],
      "flexible-schema": [1, "JSONB columns give flexibility inside a fixed schema"],
    },
  },
  {
    id: "key-value",
    title: "Key-Value & In-Memory",
    short: "Key-value",
    href: `${base}/key-value-stores`,
    icon: "key",
    tagline: "Get and put by key, in microseconds to single-digit milliseconds, at any scale.",
    dataModel: "A key mapped to an opaque value (or a data structure in Redis)",
    queryStyle: "GET / PUT / DELETE by key; no ad-hoc queries",
    consistency: "Per-key atomicity; replicas usually asynchronous",
    scaling: "Hash-partition the key space; scales near-linearly",
    latency: "<1 ms in memory, ~1–10 ms durable",
    examples: ["Redis", "DynamoDB", "Memcached"],
    useWhen: [
      "You always know the key: sessions, carts, feature flags, URL codes",
      "Caching hot reads in front of a slower database",
      "Counters, rate limits, leaderboards (Redis sorted sets)",
      "Huge scale with simple, predictable access patterns",
    ],
    avoidWhen: [
      "You need to filter or search by value",
      "Relationships or transactions across many keys",
      "Using an in-memory cache as the only copy of important data",
    ],
    ratings: { reads: 5, writes: 5, queryFlex: 1, scale: 5, consistency: 2, ops: 4 },
    fit: {
      "high-reads": [2, "O(1) lookups; the classic cache in front of a database"],
      "high-writes": [2, "Partitioned by key, writes spread across nodes"],
      transactions: [0, "Atomic per key only (DynamoDB has small multi-item transactions)"],
      "full-text": [0, "No way to search inside values"],
      analytics: [0, "No scans or aggregations"],
      "time-series": [1, "Possible with time-bucketed keys, but no window queries"],
      relationships: [0, "No joins; you fetch keys one by one"],
      similarity: [1, "Redis has a vector module; fine for small sets"],
      geo: [1, "Redis GEO commands handle simple radius queries"],
      "flexible-schema": [2, "The value is opaque, so any shape works"],
    },
  },
  {
    id: "document",
    title: "Document Databases",
    short: "Document",
    href: `${base}/document-databases`,
    icon: "file-json",
    tagline: "Store each entity as one JSON document, shaped the way the app reads it.",
    dataModel: "JSON-like documents with nested objects and arrays",
    queryStyle: "Query by any indexed field; aggregation pipelines",
    consistency: "Atomic per document; multi-document transactions cost more",
    scaling: "Shard by a document key; replica sets for reads",
    latency: "~1–10 ms by key or index",
    examples: ["MongoDB", "Couchbase", "Firestore"],
    useWhen: [
      "Entities read as one self-contained unit: catalogs, profiles, CMS",
      "Schema evolves often or varies per record",
      "Data is a tree, not a web of relationships",
    ],
    avoidWhen: [
      "Many-to-many relationships that need joins",
      "Heavy cross-entity transactions",
      "Documents that grow without bound (comments embedded forever)",
    ],
    ratings: { reads: 4, writes: 4, queryFlex: 3, scale: 4, consistency: 3, ops: 4 },
    fit: {
      "high-reads": [2, "One read returns the whole aggregate, no joins"],
      "high-writes": [1, "Scales with sharding; large document rewrites cost"],
      transactions: [1, "Single-document atomic; multi-document is supported but slower"],
      "full-text": [1, "Basic text indexes; Atlas Search adds Lucene"],
      analytics: [1, "Aggregation pipeline is fine for moderate data"],
      "time-series": [1, "MongoDB has time-series collections"],
      relationships: [0, "Joins ($lookup) are limited and slow"],
      similarity: [1, "Vector search is available in managed offerings"],
      geo: [2, "Geospatial indexes (2dsphere) built in"],
      "flexible-schema": [2, "Each document can have its own shape"],
    },
  },
  {
    id: "wide-column",
    title: "Wide-Column Stores",
    short: "Wide-column",
    href: `${base}/wide-column-stores`,
    icon: "columns",
    tagline: "Absorb enormous write volume, as long as you design tables around your queries.",
    dataModel: "Rows grouped by partition key, sorted by clustering key",
    queryStyle: "Lookups and range scans within one partition",
    consistency: "Tunable per query (ONE, QUORUM, ALL)",
    scaling: "Leaderless, consistent hashing; add nodes linearly",
    latency: "~1–10 ms within a partition",
    examples: ["Cassandra", "ScyllaDB", "HBase / Bigtable"],
    useWhen: [
      "Write-heavy: chat messages, activity feeds, IoT, event logs",
      "You know every query up front (query-first modeling)",
      "Multi-region availability matters more than strict consistency",
    ],
    avoidWhen: [
      "Ad-hoc queries, joins or aggregations",
      "Strong transactional guarantees across rows",
      "Small data: the operational cost isn't worth it",
    ],
    ratings: { reads: 3, writes: 5, queryFlex: 1, scale: 5, consistency: 2, ops: 2 },
    fit: {
      "high-reads": [1, "Fast within a partition; hot partitions hurt"],
      "high-writes": [2, "LSM-tree storage turns writes into sequential appends"],
      transactions: [0, "Lightweight transactions only, per partition"],
      "full-text": [0, "Pair it with a search engine"],
      analytics: [0, "Full scans are slow; export to an OLAP store"],
      "time-series": [2, "Partition by (source, time bucket), cluster by timestamp"],
      relationships: [0, "Denormalize instead of joining"],
      similarity: [0, "Not supported natively"],
      geo: [1, "Only via geohash-based partition keys"],
      "flexible-schema": [1, "Sparse columns allowed, but keys are fixed"],
    },
  },
  {
    id: "search",
    title: "Search Engines",
    short: "Search",
    href: `${base}/search-engines`,
    icon: "search",
    tagline: "An inverted index for relevance-ranked text search, filters and facets.",
    dataModel: "Denormalized documents, tokenized into an inverted index",
    queryStyle: "Full-text queries, fuzzy match, facets, aggregations",
    consistency: "Near real time (~1 s refresh); eventually consistent",
    scaling: "Shards + replicas per index",
    latency: "~10–100 ms per query",
    examples: ["Elasticsearch", "OpenSearch", "Typesense"],
    useWhen: [
      "Users type words and expect ranked, typo-tolerant results",
      "Faceted filtering: product search with brand, price, rating",
      "Log and event search across huge volumes",
    ],
    avoidWhen: [
      "As the source of truth: keep the primary copy in a database",
      "Data that must be readable right after it's written",
      "Heavy transactional updates to the same documents",
    ],
    ratings: { reads: 4, writes: 3, queryFlex: 4, scale: 4, consistency: 1, ops: 2 },
    fit: {
      "high-reads": [2, "Query load spreads across replicas"],
      "high-writes": [1, "Bulk indexing is fast; per-document updates cost"],
      transactions: [0, "No transactions; index is eventually consistent"],
      "full-text": [2, "This is what it's built for: BM25 ranking, analyzers, fuzzy"],
      analytics: [1, "Aggregations work well for logs and facets"],
      "time-series": [1, "Common for logs with time-based indices"],
      relationships: [0, "No joins; denormalize at index time"],
      similarity: [2, "kNN vector fields plus hybrid text + vector search"],
      geo: [2, "geo_point / geo_shape queries and distance sorting"],
      "flexible-schema": [1, "Dynamic mapping, but mapping changes need reindexing"],
    },
  },
  {
    id: "time-series",
    title: "Time-Series Databases",
    short: "Time-series",
    href: `${base}/time-series-databases`,
    icon: "line-chart",
    tagline: "Append timestamped points at high rates and query them by time window.",
    dataModel: "(series tags, timestamp, value) points, append-only",
    queryStyle: "Range scans, downsampling, rate/avg/percentile over windows",
    consistency: "Eventual is fine; late data tolerated",
    scaling: "Partition by time and series; old data tiered or dropped",
    latency: "~10–100 ms for window queries",
    examples: ["Prometheus", "InfluxDB", "TimescaleDB"],
    useWhen: [
      "Metrics, monitoring, IoT sensors, market ticks",
      "Queries are always over a time window",
      "You need retention policies and downsampling",
    ],
    avoidWhen: [
      "Data gets updated in place often",
      "Very high-cardinality tags (a user id per series)",
      "General business records",
    ],
    ratings: { reads: 3, writes: 5, queryFlex: 3, scale: 4, consistency: 2, ops: 3 },
    fit: {
      "high-reads": [1, "Dashboards are fine; not built for point lookups"],
      "high-writes": [2, "Millions of points per second with heavy compression"],
      transactions: [0, "Append-only, no transactions"],
      "full-text": [0, "Not supported"],
      analytics: [2, "Window aggregates are first-class"],
      "time-series": [2, "Purpose-built: compression, retention, downsampling"],
      relationships: [0, "Not supported"],
      similarity: [0, "Not supported"],
      geo: [0, "Only as tags"],
      "flexible-schema": [1, "New tags and fields appear freely, but cardinality is costly"],
    },
  },
  {
    id: "graph",
    title: "Graph Databases",
    short: "Graph",
    href: `${base}/graph-databases`,
    icon: "share",
    tagline: "Nodes and edges, where following a relationship is as cheap as reading a field.",
    dataModel: "Nodes and edges, both with properties",
    queryStyle: "Traversals and pattern matching (Cypher, Gremlin)",
    consistency: "Usually ACID on a single machine",
    scaling: "Mostly vertical; partitioning a graph is hard",
    latency: "~1–50 ms for a few hops",
    examples: ["Neo4j", "Amazon Neptune", "JanusGraph"],
    useWhen: [
      "Queries walk relationships 3+ hops deep",
      "Fraud rings, social graphs, knowledge graphs",
      "Recommendations like friends-of-friends",
    ],
    avoidWhen: [
      "Relationships are shallow (1–2 joins): use SQL",
      "Bulk scans and aggregations over everything",
      "Massive write volume across a huge graph",
    ],
    ratings: { reads: 3, writes: 2, queryFlex: 4, scale: 2, consistency: 4, ops: 2 },
    fit: {
      "high-reads": [1, "Fast traversals; big graphs need caches like Facebook's TAO"],
      "high-writes": [0, "Write scaling is the weak spot"],
      transactions: [2, "Neo4j is fully ACID"],
      "full-text": [1, "Lucene-backed indexes for lookup, not relevance"],
      analytics: [1, "Graph algorithms (PageRank, communities), not BI"],
      "time-series": [0, "Not a fit"],
      relationships: [2, "Index-free adjacency: each hop is a pointer chase"],
      similarity: [1, "Some support vector indexes"],
      geo: [1, "Basic spatial functions"],
      "flexible-schema": [2, "Add labels and properties freely"],
    },
  },
  {
    id: "vector",
    title: "Vector Databases",
    short: "Vector",
    href: `${base}/vector-databases`,
    icon: "sparkles",
    tagline: "Find the nearest embeddings: semantic search, RAG and recommendations.",
    dataModel: "High-dimensional vectors plus metadata",
    queryStyle: "Approximate nearest neighbor (ANN) with metadata filters",
    consistency: "Eventual; indexes rebuild in the background",
    scaling: "Shard vectors; trade recall for latency",
    latency: "~5–50 ms for top-k",
    examples: ["pgvector", "Qdrant", "Pinecone"],
    useWhen: [
      "Search by meaning, not keywords (RAG, semantic search)",
      '"More like this" recommendations and image similarity',
      "Corpus is large enough that brute force is too slow",
    ],
    avoidWhen: [
      "Exact matches or keyword queries: use a search engine",
      "Small corpora: pgvector or in-memory is enough",
      "As the source of truth for the documents themselves",
    ],
    ratings: { reads: 4, writes: 3, queryFlex: 2, scale: 4, consistency: 2, ops: 3 },
    fit: {
      "high-reads": [1, "ANN queries are CPU and memory heavy"],
      "high-writes": [1, "Index updates (HNSW) are costly"],
      transactions: [0, "Not supported (except pgvector inside Postgres)"],
      "full-text": [1, "Pair with BM25 for hybrid search"],
      analytics: [0, "Not a fit"],
      "time-series": [0, "Not a fit"],
      relationships: [0, "Not a fit"],
      similarity: [2, "HNSW / IVF indexes return top-k in milliseconds"],
      geo: [0, "Only through metadata filters"],
      "flexible-schema": [1, "Metadata payloads are flexible"],
    },
  },
  {
    id: "olap",
    title: "Analytical (OLAP) & Columnar",
    short: "OLAP",
    href: `${base}/analytical-databases`,
    icon: "bar-chart",
    tagline: "Columnar storage that scans billions of rows to answer aggregate questions in seconds.",
    dataModel: "Columnar tables (star / snowflake schemas)",
    queryStyle: "SQL aggregates, GROUP BY over huge scans",
    consistency: "Batch or micro-batch loaded; not for OLTP",
    scaling: "Massively parallel; separates storage and compute",
    latency: "~100 ms – seconds per query",
    examples: ["ClickHouse", "Snowflake", "BigQuery"],
    useWhen: [
      "Dashboards, BI, product analytics over all history",
      "Queries touch few columns but many rows",
      "Event and log analytics at TB–PB scale",
    ],
    avoidWhen: [
      "Serving user requests that need single-row lookups",
      "Frequent updates or deletes of individual rows",
      "Transactions",
    ],
    ratings: { reads: 3, writes: 3, queryFlex: 5, scale: 5, consistency: 2, ops: 3 },
    fit: {
      "high-reads": [0, "Built for few big queries, not many small ones"],
      "high-writes": [1, "Fast batched inserts; single-row inserts are slow"],
      transactions: [0, "Not an OLTP store"],
      "full-text": [1, "Basic token and n-gram indexes"],
      analytics: [2, "Columnar compression + vectorized execution"],
      "time-series": [2, "ClickHouse is widely used for metrics and logs"],
      relationships: [1, "Joins work but are expensive at scale"],
      similarity: [1, "Some engines add vector functions"],
      geo: [1, "Geo functions exist"],
      "flexible-schema": [1, "Semi-structured columns (JSON / VARIANT)"],
    },
  },
  {
    id: "newsql",
    title: "NewSQL / Distributed SQL",
    short: "NewSQL",
    href: `${base}/newsql-databases`,
    icon: "globe",
    tagline: "SQL and ACID transactions that shard and replicate themselves across regions.",
    dataModel: "Relational tables, automatically range-sharded",
    queryStyle: "SQL, including distributed transactions",
    consistency: "Strong (serializable), via consensus (Raft / Paxos)",
    scaling: "Horizontal and multi-region, automatic rebalancing",
    latency: "~5–20 ms locally; cross-region writes pay round trips",
    examples: ["Google Spanner", "CockroachDB", "YugabyteDB"],
    useWhen: [
      "You need SQL + transactions but outgrew a single primary",
      "Multi-region writes with strong consistency (global payments)",
      "You want to avoid hand-rolled sharding",
    ],
    avoidWhen: [
      "One Postgres instance still fits: it's simpler and faster",
      "Latency-critical writes that can't pay a consensus round trip",
      "Tight budgets: it costs more to run",
    ],
    ratings: { reads: 4, writes: 4, queryFlex: 4, scale: 5, consistency: 5, ops: 3 },
    fit: {
      "high-reads": [2, "Follower reads and range splits spread load"],
      "high-writes": [2, "Writes spread across ranges (avoid sequential keys)"],
      transactions: [2, "Distributed serializable transactions"],
      "full-text": [1, "Limited"],
      analytics: [1, "Works, but not columnar"],
      "time-series": [1, "Works with careful key design"],
      relationships: [1, "Joins work; distributed joins are slower"],
      similarity: [1, "Some support vector indexes"],
      geo: [1, "Basic spatial support"],
      "flexible-schema": [1, "JSONB columns"],
    },
  },
  {
    id: "object",
    title: "Object / Blob Storage",
    short: "Object",
    href: `${base}/object-storage`,
    icon: "hard-drive",
    tagline: "Cheap, durable storage for files of any size, addressed by key.",
    dataModel: "Immutable objects (bytes + metadata) in buckets",
    queryStyle: "PUT / GET by key, list by prefix",
    consistency: "Strong read-after-write (S3, since 2020)",
    scaling: "Effectively unlimited",
    latency: "~10–100 ms to first byte",
    examples: ["Amazon S3", "Google Cloud Storage", "Azure Blob"],
    useWhen: [
      "Images, video, documents, backups",
      "Data lake raw files (Parquet) for analytics",
      "Anything large: store the bytes here, the metadata in a database",
    ],
    avoidWhen: [
      "Small records read and updated often",
      "Queries by content",
      "Low-latency random access within a file",
    ],
    ratings: { reads: 4, writes: 4, queryFlex: 1, scale: 5, consistency: 3, ops: 5 },
    fit: {
      "high-reads": [2, "Put a CDN in front and reads are nearly free"],
      "high-writes": [2, "Massive parallel uploads (multipart)"],
      transactions: [0, "Single-object only"],
      "full-text": [0, "Index content into a search engine"],
      analytics: [1, "Query Parquet in place with Athena / Spark"],
      "time-series": [1, "Cold-tier archive for old data"],
      relationships: [0, "Not a fit"],
      similarity: [0, "Not a fit"],
      geo: [0, "Not a fit"],
      "flexible-schema": [2, "Bytes are bytes"],
    },
  },
];

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<FamilyId, DbFamily>;

// ---------------------------------------------------------------------------------------------------------
// Picker decision tree. A question's options point at another question or at a result.

export interface PickerOption {
  label: string;
  hint?: string;
  next: string;
}

export interface PickerQuestion {
  id: string;
  prompt: string;
  options: PickerOption[];
}

export interface PickerResult {
  id: string;
  primary: FamilyId;
  /** Shown instead of the family name, e.g. "PostgreSQL + read replicas". */
  headline: string;
  supporting: { label: string; family?: FamilyId }[];
  why: string;
  tradeoff: string;
}

export const PICKER_START = "job";

export const PICKER_QUESTIONS: PickerQuestion[] = [
  {
    id: "job",
    prompt: "What is this data's main job?",
    options: [
      { label: "Core business records", hint: "users, orders, payments, bookings", next: "oltp" },
      { label: "Fast lookup by a key", hint: "sessions, cache, counters, short URLs", next: "kv" },
      { label: "A huge stream of writes", hint: "chat messages, activity, events", next: "writes" },
      { label: "Search by keywords", hint: "product search, typeahead, logs", next: "r-search" },
      { label: "Metrics over time", hint: "monitoring, IoT, telemetry", next: "ts" },
      { label: "Dashboards over all history", hint: "BI, product analytics", next: "r-olap" },
      { label: "Walk relationships", hint: "friends-of-friends, fraud rings", next: "r-graph" },
      { label: "Find similar items", hint: "embeddings, RAG, recommendations", next: "vec" },
      { label: "Large files", hint: "images, video, backups", next: "r-object" },
    ],
  },
  {
    id: "oltp",
    prompt: "How do the writes and the data shape look?",
    options: [
      { label: "Writes fit on one primary", hint: "true for most products, even big ones", next: "reads" },
      { label: "Writes or data outgrow one machine", hint: "and I still need transactions", next: "global" },
      { label: "Every record has a different shape", hint: "few cross-entity transactions", next: "r-document" },
    ],
  },
  {
    id: "reads",
    prompt: "What's the read-to-write ratio?",
    options: [
      { label: "Read-heavy", hint: "10:1 or more, e.g. profiles, catalogs", next: "r-sql-reads" },
      { label: "Balanced or write-leaning", hint: "e.g. bookings, order processing", next: "r-sql" },
    ],
  },
  {
    id: "global",
    prompt: "What kind of consistency do you need across regions?",
    options: [
      { label: "Strong, everywhere", hint: "global payments, inventory", next: "r-newsql" },
      {
        label: "Data splits cleanly by tenant or user",
        hint: "each shard can be its own Postgres",
        next: "r-sql-sharded",
      },
    ],
  },
  {
    id: "kv",
    prompt: "Is this the only copy of the data?",
    options: [
      { label: "No, it's a cache", hint: "can be rebuilt from the database", next: "r-cache" },
      { label: "Yes, it must be durable", hint: "at very large scale", next: "r-dynamo" },
    ],
  },
  {
    id: "writes",
    prompt: "How will you read it back?",
    options: [
      { label: "By a known key + time range", hint: "messages in a channel, events for a user", next: "r-wide" },
      { label: "With flexible filters and text search", hint: "beyond the partition key", next: "r-wide-search" },
    ],
  },
  {
    id: "ts",
    prompt: "What else do you query alongside the metrics?",
    options: [
      { label: "Mostly dashboards and alerts", hint: "recent windows, high volume", next: "r-tsdb" },
      { label: "Joins with business data", hint: "moderate volume", next: "r-timescale" },
    ],
  },
  {
    id: "vec",
    prompt: "How many vectors, and what do you already run?",
    options: [
      { label: "Up to ~10M, already on Postgres", hint: "keep it in one database", next: "r-pgvector" },
      { label: "Hundreds of millions, or hybrid search at scale", hint: "dedicated infrastructure", next: "r-vector" },
    ],
  },
];

export const PICKER_RESULTS: PickerResult[] = [
  {
    id: "r-sql",
    primary: "relational",
    headline: "PostgreSQL",
    supporting: [],
    why: "Transactions, constraints and joins protect your core records, and one primary handles the write load.",
    tradeoff: "Scaling writes past one machine later means sharding or a distributed SQL database.",
  },
  {
    id: "r-sql-reads",
    primary: "relational",
    headline: "PostgreSQL + read replicas + cache",
    supporting: [{ label: "Redis cache", family: "key-value" }],
    why: "Writes stay on one primary. Replicas and a cache absorb the read volume.",
    tradeoff: "Replicas lag, so read-your-own-writes needs routing back to the primary.",
  },
  {
    id: "r-sql-sharded",
    primary: "relational",
    headline: "Sharded PostgreSQL (by tenant / user)",
    supporting: [],
    why: "Each shard is an ordinary Postgres with full transactions inside the shard. Notion and Figma took this route.",
    tradeoff: "Cross-shard queries and transactions become application work, and resharding is a project.",
  },
  {
    id: "r-newsql",
    primary: "newsql",
    headline: "Spanner / CockroachDB",
    supporting: [],
    why: "Consensus replication gives serializable transactions across shards and regions without hand-rolled sharding.",
    tradeoff: "Every write pays a consensus round trip, and it costs more to run than a single Postgres.",
  },
  {
    id: "r-document",
    primary: "document",
    headline: "MongoDB / Firestore",
    supporting: [],
    why: "Each entity is read and written as one document, and the schema can evolve per record.",
    tradeoff: "Many-to-many relationships and cross-document transactions are harder than in SQL.",
  },
  {
    id: "r-cache",
    primary: "key-value",
    headline: "Redis",
    supporting: [{ label: "Your database stays the source of truth", family: "relational" }],
    why: "Sub-millisecond reads from memory, plus data structures for counters, TTLs and leaderboards.",
    tradeoff: "You must plan invalidation and survive cache loss (stampedes on a cold cache).",
  },
  {
    id: "r-dynamo",
    primary: "key-value",
    headline: "DynamoDB",
    supporting: [],
    why: "Single-digit-millisecond reads and writes by key at any scale, fully managed.",
    tradeoff: "You design tables around access patterns up front; new query shapes need new indexes.",
  },
  {
    id: "r-wide",
    primary: "wide-column",
    headline: "Cassandra / ScyllaDB",
    supporting: [],
    why: "LSM storage and leaderless replication absorb huge write volume. Discord stores trillions of messages this way.",
    tradeoff: "Pick the partition key carefully: hot partitions and unbounded partitions are the classic failures.",
  },
  {
    id: "r-wide-search",
    primary: "wide-column",
    headline: "Cassandra + a search index",
    supporting: [{ label: "Elasticsearch via change data capture", family: "search" }],
    why: "The wide-column store takes the writes. A search engine fed by CDC answers the flexible queries.",
    tradeoff: "The search index lags behind writes and is a second system to operate.",
  },
  {
    id: "r-search",
    primary: "search",
    headline: "Elasticsearch / OpenSearch",
    supporting: [{ label: "Primary database stays the source of truth", family: "relational" }],
    why: "An inverted index gives relevance ranking, typo tolerance, facets and filters in tens of milliseconds.",
    tradeoff: "The index is eventually consistent, so sync it from the database (CDC) and never treat it as primary.",
  },
  {
    id: "r-tsdb",
    primary: "time-series",
    headline: "Prometheus / InfluxDB",
    supporting: [],
    why: "Built for append-heavy timestamped data, with compression, retention and downsampling.",
    tradeoff: "High-cardinality labels (a user id per series) blow up memory and storage.",
  },
  {
    id: "r-timescale",
    primary: "time-series",
    headline: "TimescaleDB (PostgreSQL extension)",
    supporting: [{ label: "Same Postgres as your business data", family: "relational" }],
    why: "Time partitioning and compression inside Postgres, so metrics can join business tables in plain SQL.",
    tradeoff: "At very high ingest rates a dedicated time-series database scales further.",
  },
  {
    id: "r-olap",
    primary: "olap",
    headline: "ClickHouse / BigQuery / Snowflake",
    supporting: [{ label: "Fed from the OLTP database by CDC or batch ETL", family: "relational" }],
    why: "Columnar storage reads only the columns a query needs and scans billions of rows in seconds.",
    tradeoff: "Not for serving user requests or single-row updates. Data arrives with some delay.",
  },
  {
    id: "r-graph",
    primary: "graph",
    headline: "Neo4j / Neptune",
    supporting: [],
    why: "Every hop is a pointer chase, so 3+ hop queries stay fast where SQL joins explode.",
    tradeoff: "Harder to scale horizontally. If you only need 1–2 hops, SQL is simpler.",
  },
  {
    id: "r-pgvector",
    primary: "relational",
    headline: "PostgreSQL + pgvector",
    supporting: [{ label: "Vector index inside Postgres", family: "vector" }],
    why: "Vectors live next to the rows they describe, with transactions, filters and backups you already have.",
    tradeoff: "Very large or fast-growing corpora will strain a shared database.",
  },
  {
    id: "r-vector",
    primary: "vector",
    headline: "Qdrant / Pinecone / Milvus",
    supporting: [{ label: "BM25 keyword search for hybrid retrieval", family: "search" }],
    why: "Dedicated ANN indexes (HNSW) return top-k neighbors in milliseconds over hundreds of millions of vectors.",
    tradeoff: "One more system to keep in sync with the source documents. Recall vs latency needs tuning.",
  },
  {
    id: "r-object",
    primary: "object",
    headline: "S3 + CDN",
    supporting: [{ label: "Metadata (owner, size, key) in a database", family: "relational" }],
    why: "Cheap, durable, unlimited storage for bytes. A CDN serves them close to users.",
    tradeoff: "No queries over content. Keep searchable metadata in a database.",
  },
];

export const PICKER_QUESTION_BY_ID = Object.fromEntries(PICKER_QUESTIONS.map((q) => [q.id, q])) as Record<
  string,
  PickerQuestion
>;
export const PICKER_RESULT_BY_ID = Object.fromEntries(PICKER_RESULTS.map((r) => [r.id, r])) as Record<
  string,
  PickerResult
>;
