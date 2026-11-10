"use client";

import type { ReactNode } from "react";
import { CompletedContext } from "@/lib/completed.client";
import { useCompleted } from "./use-completed.client";

/** Gives the pages below it the learner's completed set (sidebar ticks, "N read" on section cards). */
export function CompletedProvider({ children }: { children: ReactNode }) {
  return <CompletedContext.Provider value={useCompleted()}>{children}</CompletedContext.Provider>;
}
