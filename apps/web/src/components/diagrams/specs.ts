import type { DiagramSpec } from "./types";
import { ANIMATED_SPECS } from "./animated-specs";

// Animated diagram specs by their short name ("messenger/architecture"), for code that still looks them up
// that way (src/components/cloud/cloud-mapping.tsx). The specs live in assets/diagrams/animated/; new code
// should use ANIMATED_SPECS with the asset ID (resolveAssetRef("AnimatedDiagram", name)).
export const DIAGRAMS: Record<string, DiagramSpec> = Object.fromEntries(
  Object.entries(ANIMATED_SPECS).map(([id, spec]) => [id.slice("diagrams/animated/".length), spec])
);
