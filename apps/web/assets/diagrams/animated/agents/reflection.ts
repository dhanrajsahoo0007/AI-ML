import type { LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";

// Reflection on the Brightpost refund (agent-architectures, Core concepts). Suppose the model drafts its reply right
// after asking for the refund, before anyone approves it. A critique reads the draft next to a real signal, the
// create_refund result "pending approval", and finds the claim the signal contradicts; the revised draft fixes it. The
// critique is also saved as a short lesson that the next conversation starts with (Reflexion keeps such reflections
// in an episodic memory).
//
// Layout: the three stages in a row at y 40 (x 20, 310, 600); the tool result under the critique, the saved lesson
// under the revised draft. Static: no steps.
//
// Colour (agents legend, four tones): drafts green, the critique lime, the tool result blue, the lesson violet.

const spec: LayoutSpec = {
  kind: "layout",
  title: "Reflection: draft, critique against a real signal, revise, keep the lesson",
  width: 820,
  height: 270,
  shapes: [
    {
      id: "draft1",
      type: "box",
      x: 20,
      y: 40,
      w: 230,
      h: 56,
      label: "Draft 1",
      sub: '"Your refund is done."',
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    {
      id: "critique",
      type: "box",
      x: 310,
      y: 40,
      w: 230,
      h: 56,
      label: "Critique",
      sub: `"Not done: £${BRIGHTPOST.price} needs approval"`,
      tone: AGENT_TONE.check,
      fill: "pastel",
      highlight: true,
    },
    {
      id: "draft2",
      type: "box",
      x: 600,
      y: 40,
      w: 200,
      h: 56,
      label: "Draft 2",
      sub: '"A colleague approves it today."',
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    {
      id: "signal",
      type: "box",
      x: 310,
      y: 170,
      w: 230,
      h: 56,
      label: "Tool result",
      sub: "create_refund: pending approval",
      tone: AGENT_TONE.result,
      fill: "pastel",
    },
    {
      id: "lesson",
      type: "box",
      x: 600,
      y: 170,
      w: 200,
      h: 56,
      label: "Lesson saved",
      sub: `"Over £${BRIGHTPOST.approvalLimit}: say it needs approval"`,
      tone: AGENT_TONE.memory,
      fill: "pastel",
    },
    { id: "a1", type: "arrow", x: 0, y: 0, from: "draft1", to: "critique" },
    { id: "a2", type: "arrow", x: 0, y: 0, from: "critique", to: "draft2" },
    { id: "a3", type: "arrow", x: 0, y: 0, from: "signal", to: "critique", label: "feedback" },
    {
      id: "a4",
      type: "arrow",
      x: 0,
      y: 0,
      from: "critique",
      to: "lesson",
      dashed: true,
      label: "store",
    },
  ],
};

export default spec;
