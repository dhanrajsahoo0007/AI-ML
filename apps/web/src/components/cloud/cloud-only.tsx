import type { ReactNode } from "react";
import { isPathVisible } from "@/features/sections";

// Content that links into /cloud (such as a case study's "Running it on AWS" section) renders only while
// the cloud section is `on` in content/sections.yaml, so published pages never link to a hidden or off
// section. Usage in MDX: <CloudOnly> ...markdown... </CloudOnly> (keep blank lines inside so markdown
// still parses).
const CLOUD_PATH = "/cloud";

export function CloudOnly({ children }: { children: ReactNode }) {
  return isPathVisible(CLOUD_PATH) ? <>{children}</> : null;
}
