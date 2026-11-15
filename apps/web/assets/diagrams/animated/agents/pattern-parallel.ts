import type { LayoutSpec } from "@/components/diagrams/types";
import { patternTile } from "@/components/diagrams/presets/agents";

// The parallelization pattern drawn with the Brightpost task. Every pattern tile comes from patternTile(), so the
// five tiles on agent-architectures share node sizes and colours: input orange, model call green, check lime, plain
// code neutral, a person orange outline, the reply green outline. The ring marks the node that defines the pattern.
const tile = patternTile("p", "parallel", 0, 0, { highlight: "combine" });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Parallelization: Independent calls run at once; code combines them.",
  width: tile.width,
  height: tile.height,
  shapes: tile.shapes,
};

export default spec;
