import type { ReactNode } from "react";
import { features } from "@/config/features";

// Content that links into /cloud (such as a case study's "Running it on AWS" section) renders only while the cloud
// section is switched on in src/config/features.ts, so published pages never link to a hidden section.
// Usage in MDX: <CloudOnly> ...markdown... </CloudOnly> (keep blank lines inside so markdown still parses).
export function CloudOnly({ children }: { children: ReactNode }) {
  return features.cloud ? <>{children}</> : null;
}
