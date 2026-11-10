import { specKind, type DiagramSpec } from "./types";
import { ANIMATED_SPECS } from "./animated-specs";

// Architecture diagram specs by their short name ("messenger/architecture"), for code that still looks them up
// that way (src/components/cloud/cloud-mapping.tsx). The specs live in assets/diagrams/animated/; new code
// should use ANIMATED_SPECS with the asset ID (resolveAssetRef("AnimatedDiagram", name)). Sequence and layout
// specs have no cloud mapping, so they are left out.
export const DIAGRAMS: Record<string, DiagramSpec> = Object.fromEntries(
  Object.entries(ANIMATED_SPECS)
    .filter((entry): entry is [string, DiagramSpec] => specKind(entry[1]) === "architecture")
    .map(([id, spec]) => [id.slice("diagrams/animated/".length), spec])
);
