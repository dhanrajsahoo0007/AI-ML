import * as React from "react";
import type { z } from "zod";
import {
  BloomFilterSimIsland,
  CacheSimIsland,
  ConsistentHashRingIsland,
  EstimateCalculatorIsland,
  IndexPlaygroundIsland,
  LatencyLadderIsland,
  LoadBalancerSimIsland,
  NinesCalculatorIsland,
  QuorumPickerIsland,
  RateLimiterSimIsland,
  ReplicationLagDemoIsland,
} from "@/lib/mdx-lazy-widgets";
import { parseProps } from "../parse-props";
import { InvalidProps } from "../props";
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

// The MDX entry points for the interactive teaching widgets. Each one validates its props with zod on the
// server (MDX is a trust boundary), fills the defaults, and renders the lazily loaded island from
// src/lib/mdx-lazy-widgets.tsx. A bad prop shows a red note in dev and fails the production build.

function widget<P extends object>(
  name: string,
  schema: z.ZodType<P>,
  Island: React.ComponentType<P & { idBase: string }>
) {
  // MDX props are untyped at the call site; the schema is what checks them.
  function Widget(props: Record<string, unknown>) {
    // Ids for labels and controls come from the server render: the island sits behind next/dynamic, where a
    // client-side useId differs between SSR and hydration. A Server Component id is part of the RSC payload.
    const idBase = React.useId();
    const parsed = parseProps(name, schema, props);
    if (!parsed.ok) return <InvalidProps message={parsed.message} />;
    return React.createElement(Island, { ...parsed.data, idBase });
  }
  Widget.displayName = name;
  return Widget;
}

export const LatencyLadder = widget("LatencyLadder", latencyLadderSchema, LatencyLadderIsland);
export const EstimateCalculator = widget("EstimateCalculator", estimateCalculatorSchema, EstimateCalculatorIsland);
export const NinesCalculator = widget("NinesCalculator", ninesCalculatorSchema, NinesCalculatorIsland);
export const ConsistentHashRing = widget("ConsistentHashRing", consistentHashRingSchema, ConsistentHashRingIsland);
export const LoadBalancerSim = widget("LoadBalancerSim", loadBalancerSimSchema, LoadBalancerSimIsland);
export const CacheSim = widget("CacheSim", cacheSimSchema, CacheSimIsland);
export const RateLimiterSim = widget("RateLimiterSim", rateLimiterSimSchema, RateLimiterSimIsland);
export const BloomFilterSim = widget("BloomFilterSim", bloomFilterSimSchema, BloomFilterSimIsland);
export const ReplicationLagDemo = widget("ReplicationLagDemo", replicationLagDemoSchema, ReplicationLagDemoIsland);
export const IndexPlayground = widget("IndexPlayground", indexPlaygroundSchema, IndexPlaygroundIsland);
export const QuorumPicker = widget("QuorumPicker", quorumPickerSchema, QuorumPickerIsland);
