import type { LayoutSpec } from "@/components/diagrams/types";
import { frameworkStyleTile } from "@/components/diagrams/presets/agents-frameworks";

// Three framework styles, each building the same Brightpost refund (agent-frameworks-compared, Core concepts). The
// strips share the pattern tiles' node size (TILE_NODE) and node styles, so they compare at a glance:
// 1 graph-based: you write nodes and edges; the £30 rule is a conditional edge and the approval is its own node;
// 2 role-based: you write agents with a role and a goal; a manager model hands out the tasks and a person reviews the
//   answer (CrewAI's `human_input` reviews a task's final answer, not a tool call);
// 3 loop-based: the model picks each step and calls tools until it stops; the refund tool waits for approval.
//
// Layout: three strips stacked 20 units apart, each with a 144-wide label column (style name, example frameworks) and
// the diagram from x 154; columns of 112 with 40-unit gaps (96 in the loop strip, for the edge labels). Each strip
// ends with one line saying what you write. One strip per step.
//
// Colour (agents legend, four tones plus neutral): the task and the person orange, model calls and agents green,
// the £30 check lime, tools teal, plain code neutral. No highlight: the three strips are equals.

const GAP = 20;
const graph = frameworkStyleTile("g", "graph", 0, 0, { step: 1 });
const role = frameworkStyleTile("r", "role", 0, graph.height + GAP, { step: 2 });
const loop = frameworkStyleTile("l", "loop", 0, graph.height + role.height + 2 * GAP, { step: 3 });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three framework styles, one refund",
  width: 880,
  height: graph.height + role.height + loop.height + 2 * GAP,
  steps: [
    { title: "Graph-based: you draw the nodes and edges" },
    { title: "Role-based: you describe agents and tasks" },
    { title: "Loop-based: the model picks each step" },
  ],
  shapes: [...graph.shapes, ...role.shapes, ...loop.shapes],
};

export default spec;
