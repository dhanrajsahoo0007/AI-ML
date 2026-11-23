import type { LayoutSpec } from "@/components/diagrams/types";
import { patternTile } from "@/components/diagrams/presets/agents";

// The evaluator-optimizer pattern drawn with the Brightpost task. Every pattern tile comes from patternTile(), so the
// five tiles on agent-architectures share node sizes and colours: input orange, model call green, check lime, plain
// code neutral, a person orange outline, the reply green outline. The ring marks the node that defines the pattern.
const tile = patternTile("p", "evaluator", 0, 0, { highlight: "eval" });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Evaluator-optimizer: A second call grades the draft and sends feedback until it passes.",
  width: tile.width,
  height: tile.height,
  shapes: tile.shapes,
};

export default spec;
