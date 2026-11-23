import type { LayoutSpec } from "@/components/diagrams/types";
import { patternTile } from "@/components/diagrams/presets/agents";

// The prompt chaining pattern drawn with the Brightpost task. Every pattern tile comes from patternTile(), so the
// five tiles on agent-architectures share node sizes and colours: input orange, model call green, check lime, plain
// code neutral, a person orange outline, the reply green outline. The ring marks the node that defines the pattern.
const tile = patternTile("p", "chaining", 0, 0, { highlight: "gate" });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Prompt chaining: A fixed order of calls, with a check in code between steps.",
  width: tile.width,
  height: tile.height,
  shapes: tile.shapes,
};

export default spec;
