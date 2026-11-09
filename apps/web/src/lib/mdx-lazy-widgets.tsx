"use client";

import dynamic from "next/dynamic";

// Interactive MDX widgets, each in its own chunk. Every article shares one component map, so importing the
// widgets directly would put all of them (and framer-motion) into the first-load JS of every page that
// touches src/lib/mdx-doc.tsx, including hubs and the home page. Through next/dynamic, a page only loads
// the widgets it renders; they are still server-rendered, so nothing pops in.

export const DatabasePicker = dynamic(() => import("@/components/db/database-picker").then((m) => m.DatabasePicker));
export const DatabaseWorkloadMatrix = dynamic(() =>
  import("@/components/db/workload-matrix").then((m) => m.DatabaseWorkloadMatrix)
);
export const CompareDatabases = dynamic(() =>
  import("@/components/db/compare-databases").then((m) => m.CompareDatabases)
);
export const DataModelView = dynamic(() => import("@/components/db/data-model-view").then((m) => m.DataModelView));
export const DataModelTab = dynamic(() => import("@/components/db/data-model-view").then((m) => m.DataModelTab));
export const ScenarioCard = dynamic(() => import("@/components/db/scenario-card").then((m) => m.ScenarioCard));
export const ScenarioGrid = dynamic(() => import("@/components/db/scenario-card").then((m) => m.ScenarioGrid));
export const CloudDecisionTree = dynamic(() =>
  import("@/components/cloud/cloud-decision-tree").then((m) => m.CloudDecisionTree)
);
export const CloudEquivalenceMatrix = dynamic(() =>
  import("@/components/cloud/cloud-equivalence-matrix").then((m) => m.CloudEquivalenceMatrix)
);

// System-design teaching widgets. MDX uses the zod-validating wrappers in src/components/teach/widgets/index.tsx,
// which render these islands.
export const LatencyLadderIsland = dynamic(() =>
  import("@/components/teach/widgets/latency-ladder.client").then((m) => m.LatencyLadder)
);
export const EstimateCalculatorIsland = dynamic(() =>
  import("@/components/teach/widgets/estimate-calculator.client").then((m) => m.EstimateCalculator)
);
export const NinesCalculatorIsland = dynamic(() =>
  import("@/components/teach/widgets/nines-calculator.client").then((m) => m.NinesCalculator)
);
export const ConsistentHashRingIsland = dynamic(() =>
  import("@/components/teach/widgets/consistent-hash-ring.client").then((m) => m.ConsistentHashRing)
);
export const LoadBalancerSimIsland = dynamic(() =>
  import("@/components/teach/widgets/load-balancer-sim.client").then((m) => m.LoadBalancerSim)
);
export const CacheSimIsland = dynamic(() =>
  import("@/components/teach/widgets/cache-sim.client").then((m) => m.CacheSim)
);
export const RateLimiterSimIsland = dynamic(() =>
  import("@/components/teach/widgets/rate-limiter-sim.client").then((m) => m.RateLimiterSim)
);
export const BloomFilterSimIsland = dynamic(() =>
  import("@/components/teach/widgets/bloom-filter-sim.client").then((m) => m.BloomFilterSim)
);
export const ReplicationLagDemoIsland = dynamic(() =>
  import("@/components/teach/widgets/replication-lag-demo.client").then((m) => m.ReplicationLagDemo)
);
export const IndexPlaygroundIsland = dynamic(() =>
  import("@/components/teach/widgets/index-playground.client").then((m) => m.IndexPlayground)
);
export const QuorumPickerIsland = dynamic(() =>
  import("@/components/teach/widgets/quorum-picker.client").then((m) => m.QuorumPicker)
);
