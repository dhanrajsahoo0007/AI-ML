import type { LayoutSpec } from "@/components/diagrams/types";
import { patternTile } from "@/components/diagrams/presets/agents";

// The orchestrator-workers pattern drawn with the Brightpost task. Every pattern tile comes from patternTile(), so the
// five tiles on agent-architectures share node sizes and colours: input orange, model call green, check lime, plain
// code neutral, a person orange outline, the reply green outline. The ring marks the node that defines the pattern.
const tile = patternTile("p", "orchestrator", 0, 0, { highlight: "lead" });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Orchestrator-workers: A lead call decides the sub-tasks at run time and merges the results.",
  width: tile.width,
  height: tile.height,
  shapes: tile.shapes,
};

export default spec;
