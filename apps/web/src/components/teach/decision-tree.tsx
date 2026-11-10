import * as React from "react";
import type { z } from "zod";
import { decisionTreeSchema } from "./decision-tree-model";
import { DecisionTreeClient } from "./lazy.client";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Server wrapper: validates the tree from MDX, then hands it to the island. Usage in MDX:
//   <DecisionTree
//     title="Cache or replica?"
//     tree={{
//       q: "Do reads outnumber writes 10:1?",
//       yes: { q: "Can data be a few seconds stale?", yes: "Add a cache", no: { answer: "Read replicas", href: "/…" } },
//       no: "Scale the primary first",
//     }}
//   />
export function DecisionTree(props: z.input<typeof decisionTreeSchema>) {
  const parsed = parseProps("DecisionTree", decisionTreeSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  return <DecisionTreeClient tree={parsed.data.tree} title={parsed.data.title} />;
}
