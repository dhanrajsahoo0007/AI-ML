"use client";

import dynamic from "next/dynamic";

// The diagram renderers, each in its own chunk (same reason as src/lib/mdx-lazy-widgets.tsx). Every docs,
// interview and company page can render <AnimatedDiagram> (the shared MDX map and the interview answer map), so a
// static import would put all three renderers into the first-load JS of those routes. next/dynamic only splits
// client components when it is called from a client module like this one; called from the server wrapper
// (./diagram.tsx) the renderers would still be part of the route's entry. They are still server-rendered.
export const AnimatedDiagram = dynamic(() => import("./animated-diagram").then((m) => m.AnimatedDiagram));
export const SequenceDiagram = dynamic(() => import("./sequence-diagram.client").then((m) => m.SequenceDiagram));
export const LayoutDiagram = dynamic(() => import("./layout-diagram.client").then((m) => m.LayoutDiagram));
