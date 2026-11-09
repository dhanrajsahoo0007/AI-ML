"use client";

import dynamic from "next/dynamic";

// The teach islands, each in its own chunk, so an article only loads the ones it renders (same reason as
// src/lib/mdx-lazy-widgets.tsx). They are still server-rendered.

export const TabsIsland = dynamic(() => import("./tabs.client").then((m) => m.Tabs));
export const Tab = dynamic(() => import("./tabs.client").then((m) => m.Tab));
export const DecisionTreeClient = dynamic(() => import("./decision-tree.client").then((m) => m.DecisionTreeClient));
export const TermRoot = dynamic(() => import("./term.client").then((m) => m.TermRoot));
