import { describe, expect, it } from "vitest";
import {
  bloomFilterSimSchema,
  cacheSimSchema,
  consistentHashRingSchema,
  estimateCalculatorSchema,
  indexPlaygroundSchema,
  latencyLadderSchema,
  loadBalancerSimSchema,
  ninesCalculatorSchema,
  quorumPickerSchema,
  rateLimiterSimSchema,
  replicationLagDemoSchema,
} from "./schemas";

const all = [
  latencyLadderSchema,
  estimateCalculatorSchema,
  ninesCalculatorSchema,
  consistentHashRingSchema,
  loadBalancerSimSchema,
  cacheSimSchema,
  rateLimiterSimSchema,
  bloomFilterSimSchema,
  replicationLagDemoSchema,
  indexPlaygroundSchema,
  quorumPickerSchema,
];

describe("widget prop schemas", () => {
  it("accept no props and fill defaults", () => {
    for (const s of all) expect(s.safeParse({}).success).toBe(true);
    expect(latencyLadderSchema.parse({})).toMatchObject({ compareTo: "memory", windowMs: 100 });
    expect(quorumPickerSchema.parse({})).toMatchObject({ n: 3, r: 2, w: 2 });
  });

  it("reject unknown props", () => {
    for (const s of all) expect(s.safeParse({ nope: 1 }).success).toBe(false);
  });

  it("reject values outside the allowed set", () => {
    expect(latencyLadderSchema.safeParse({ compareTo: "l9" }).success).toBe(false);
    expect(ninesCalculatorSchema.safeParse({ a: 98 }).success).toBe(false);
    expect(ninesCalculatorSchema.safeParse({ a: 99.95 }).success).toBe(true);
    expect(loadBalancerSimSchema.safeParse({ algorithm: "random" }).success).toBe(false);
    expect(loadBalancerSimSchema.safeParse({ servers: 2 }).success).toBe(false);
    expect(cacheSimSchema.safeParse({ capacity: 3 }).success).toBe(false);
    expect(rateLimiterSimSchema.safeParse({ algorithm: "sliding-window" }).success).toBe(true);
    expect(indexPlaygroundSchema.safeParse({ column: "name" }).success).toBe(false);
    expect(quorumPickerSchema.safeParse({ n: 3, r: 4 }).success).toBe(false);
    expect(consistentHashRingSchema.safeParse({ vnodes: 1.5 }).success).toBe(false);
    expect(bloomFilterSimSchema.safeParse({ words: [""] }).success).toBe(false);
    expect(bloomFilterSimSchema.safeParse({ bits: 9 }).success).toBe(false);
    expect(bloomFilterSimSchema.safeParse({ bits: 24 }).success).toBe(true);
    expect(replicationLagDemoSchema.safeParse({ lagMs: -1 }).success).toBe(false);
    expect(estimateCalculatorSchema.safeParse({ peakFactor: 0.5 }).success).toBe(false);
  });
});
