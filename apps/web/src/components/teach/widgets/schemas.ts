import { z } from "zod";
import { LATENCY_ROWS } from "./latency-ladder";
import { NINES, type Nines } from "./nines";
import { LB_ALGORITHMS, type LbAlgorithm } from "./load-balancer";
import { CACHE_POLICIES, type CachePolicy } from "./cache-sim";
import { LIMITER_ALGORITHMS, type LimiterAlgorithm } from "./rate-limiter";
import { INDEX_COLUMNS, type IndexColumn } from "./index-playground";
import { MAX_REPLICAS } from "./quorum";

// Props of every teaching widget, validated at the MDX boundary by the server wrappers in ./index.tsx.
// Every prop is optional; the defaults give a sensible first view. Bounds match the widget's own controls.

const title = z.string().min(1).max(80).optional();
const int = (min: number, max: number) => z.number().int().min(min).max(max);
const oneOf = <T extends string>(values: readonly { value: T }[]) =>
  z.custom<T>((v) => typeof v === "string" && values.some((o) => o.value === v), {
    message: `expected one of: ${values.map((o) => o.value).join(", ")}`,
  });

const latencyIds = LATENCY_ROWS.map((r) => ({ value: r.id }));

export const latencyLadderSchema = z
  .object({
    title,
    /** Row everything is compared against. */
    compareTo: oneOf(latencyIds).default("memory"),
    /** Row selected on first render. */
    highlight: oneOf(latencyIds).default("disk-seek"),
    /** Window for the "how many fit" column, in ms. */
    windowMs: z.number().positive().max(10_000).default(100),
  })
  .strict();

export const estimateCalculatorSchema = z
  .object({
    title,
    dau: z.number().positive().max(1e10).default(10_000_000),
    actionsPerUser: z.number().positive().max(1e5).default(10),
    peakFactor: z.number().min(1).max(100).default(3),
    payloadBytes: z.number().positive().max(1e10).default(1_000),
    retentionDays: z.number().positive().max(36_500).default(1_825),
    readWriteRatio: z.number().min(0).max(1e4).default(10),
  })
  .strict();

const nines = z.custom<Nines>((v) => typeof v === "number" && (NINES as readonly number[]).includes(v), {
  message: `expected one of: ${NINES.join(", ")}`,
});

export const ninesCalculatorSchema = z.object({ title, a: nines.default(99.9), b: nines.default(99.99) }).strict();

export const consistentHashRingSchema = z
  .object({
    title,
    servers: int(1, 8).default(3),
    vnodes: int(1, 16).default(3),
    keys: int(4, 48).default(24),
    /** Also show how many keys `hash mod N` would move. */
    showModulo: z.boolean().default(true),
  })
  .strict();

export const loadBalancerSimSchema = z
  .object({
    title,
    servers: int(3, 6).default(4),
    algorithm: oneOf<LbAlgorithm>(LB_ALGORITHMS).default("round-robin"),
    requests: int(10, 40).default(20),
    /** Weights for the weighted algorithm, one per server (extra entries are ignored). */
    weights: z.array(int(1, 5)).max(6).optional(),
  })
  .strict();

export const cacheSimSchema = z
  .object({
    title,
    policy: oneOf<CachePolicy>(CACHE_POLICIES).default("lru"),
    capacity: int(4, 8).default(4),
    /** Keys separated by spaces or commas, e.g. "A B C A D". At most 40 are used. */
    sequence: z.string().min(1).max(200).optional(),
  })
  .strict();

export const rateLimiterSimSchema = z
  .object({
    title,
    algorithm: oneOf<LimiterAlgorithm>(LIMITER_ALGORITHMS).default("token-bucket"),
    limit: int(1, 10).default(5),
    bucketSize: int(1, 20).default(5),
    steadyRps: int(0, 10).default(3),
    burst: int(0, 30).default(10),
  })
  .strict();

export const bloomFilterSimSchema = z
  .object({
    title,
    /** Must match the widget's slider (8 to 64 in steps of 8). */
    bits: int(8, 64).multipleOf(8).default(32),
    hashes: int(1, 6).default(3),
    words: z.array(z.string().min(1).max(24)).max(20).default(["apple", "banana", "cherry"]),
  })
  .strict();

export const replicationLagDemoSchema = z
  .object({
    title,
    lagMs: int(0, 3000).default(800),
    readYourWrites: z.boolean().default(false),
  })
  .strict();

export const indexPlaygroundSchema = z
  .object({
    title,
    column: oneOf<IndexColumn>(INDEX_COLUMNS).default("email"),
    indexed: z.boolean().default(false),
  })
  .strict();

export const quorumPickerSchema = z
  .object({
    title,
    n: int(1, MAX_REPLICAS).default(3),
    r: int(1, MAX_REPLICAS).default(2),
    w: int(1, MAX_REPLICAS).default(2),
  })
  .strict()
  .refine((p) => p.r <= p.n && p.w <= p.n, { message: "r and w must be at most n" });
