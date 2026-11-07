"use client";

import dynamic from "next/dynamic";

// Interactive MDX widgets, each in its own chunk. Every article shares one component map, so importing the
// widgets directly would put all of them (and framer-motion) into the first-load JS of every page that
// touches src/lib/mdx-doc.tsx, including hubs and the home page. Through next/dynamic, a page only loads
// the widgets it renders; they are still server-rendered, so nothing pops in.

export const DatabasePicker = dynamic(() => import("@/components/db/database-picker").then((m) => m.DatabasePicker));
export const DatabaseWorkloadMatrix = dynamic(() =>
  import("@/components/db/workload-matrix").then((m) => m.DatabaseWorkloadMatrix),
);
export const CompareDatabases = dynamic(() => import("@/components/db/compare-databases").then((m) => m.CompareDatabases));
export const DataModelView = dynamic(() => import("@/components/db/data-model-view").then((m) => m.DataModelView));
export const DataModelTab = dynamic(() => import("@/components/db/data-model-view").then((m) => m.DataModelTab));
export const ScenarioCard = dynamic(() => import("@/components/db/scenario-card").then((m) => m.ScenarioCard));
export const ScenarioGrid = dynamic(() => import("@/components/db/scenario-card").then((m) => m.ScenarioGrid));
export const CloudDecisionTree = dynamic(() =>
  import("@/components/cloud/cloud-decision-tree").then((m) => m.CloudDecisionTree),
);
export const CloudEquivalenceMatrix = dynamic(() =>
  import("@/components/cloud/cloud-equivalence-matrix").then((m) => m.CloudEquivalenceMatrix),
);
