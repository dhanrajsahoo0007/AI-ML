"use client";

import dynamic from "next/dynamic";

// The teach islands, each in its own chunk, so an article only loads the ones it renders (same reason as
// src/lib/mdx-lazy-widgets.tsx). They are still server-rendered.

export const TabsIsland = dynamic(() => import("./tabs.client").then((m) => m.Tabs));
export const Tab = dynamic(() => import("./tabs.client").then((m) => m.Tab));
export const DecisionTreeClient = dynamic(() => import("./decision-tree.client").then((m) => m.DecisionTreeClient));
export const SpotTheFlagClient = dynamic(() => import("./spot-the-flag.client").then((m) => m.SpotTheFlagClient));
export const ChoiceDrillClient = dynamic(() => import("./choice-drill.client").then((m) => m.ChoiceDrillClient));
export const StoryBuilderClient = dynamic(() => import("./story-builder.client").then((m) => m.StoryBuilderClient));
export const StoryMatrixClient = dynamic(() => import("./story-matrix.client").then((m) => m.StoryMatrixClient));
export const MockLoopClient = dynamic(() => import("./mock-loop.client").then((m) => m.MockLoopClient));
export const PrepChecklistClient = dynamic(() => import("./prep-checklist.client").then((m) => m.PrepChecklistClient));
export const TermRoot = dynamic(() => import("./term.client").then((m) => m.TermRoot));
