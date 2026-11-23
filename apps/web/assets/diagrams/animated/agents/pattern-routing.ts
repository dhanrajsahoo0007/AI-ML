import type { LayoutSpec } from "@/components/diagrams/types";
import { patternTile } from "@/components/diagrams/presets/agents";

// The routing pattern drawn with the Brightpost task. Every pattern tile comes from patternTile(), so the
// five tiles on agent-architectures share node sizes and colours: input orange, model call green, check lime, plain
// code neutral, a person orange outline, the reply green outline. The ring marks the node that defines the pattern.
const tile = patternTile("p", "routing", 0, 0, { highlight: "router" });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Routing: One call sorts the request; code picks the path.",
  width: tile.width,
  height: tile.height,
  shapes: tile.shapes,
};

export default spec;
