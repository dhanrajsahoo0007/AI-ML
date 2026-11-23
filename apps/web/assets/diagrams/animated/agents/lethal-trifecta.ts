import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";

// The lethal trifecta (Simon Willison, 16 June 2025) on guardrails-and-safety, reused by agent-security-and-sandboxing.
// Three overlapping circles: access to private data, exposure to untrusted content, and the ability to communicate
// externally. The Brightpost agent sits where all three overlap: get_order reads customers' orders and addresses,
// search_help and the chat bring in text anyone can write (a pasted note, a product review), and send_email can write
// to any address. With all three, an injected instruction can read private data and send it out.
//
// Static, no steps. The circles are outline paths (64-point polygons, no fill) so the overlaps stay visible; filled
// circles are opaque and would hide each other.
//
// Layout: radius 190, centres 190 apart: private data (270, 215), untrusted content (460, 215), way out (365, 380).
// Each circle's label box sits in the part of it no other circle covers (checked: every box corner lies inside its own
// circle and outside the other two). The agent box (130 × 44) sits on the centroid (365, 270), inside all three.
//
// Colour (agents legend): four tones. Private data violet (a store), untrusted content blue (text that comes back from
// a tool or the chat), the way out teal (a tool), the agent green and ringed. No red: nothing has broken yet.

const R = 190;

/** A circle drawn as a closed outline (no fill). */
const ring = (id: string, cx: number, cy: number, tone: LayoutTone): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  tone,
  points: Array.from({ length: 65 }, (_, i): [number, number] => {
    const a = (i / 64) * 2 * Math.PI;
    return [Math.round((cx + R * Math.cos(a)) * 10) / 10, Math.round((cy + R * Math.sin(a)) * 10) / 10];
  }),
});

const label = (id: string, x: number, y: number, text: string, sub: string, tone: LayoutTone): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w: 150,
  h: 48,
  label: text,
  sub,
  tone,
  fill: "pastel",
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The lethal trifecta: private data, untrusted content and a way to send data out",
  width: 730,
  height: 600,
  shapes: [
    ring("c-private", 270, 215, AGENT_TONE.memory),
    ring("c-untrusted", 460, 215, AGENT_TONE.result),
    ring("c-out", 365, 380, AGENT_TONE.action),
    label("private", 111, 148, "Private data", `${TOOLS.getOrder.name}: addresses`, AGENT_TONE.memory),
    label("untrusted", 469, 148, "Untrusted content", "pasted notes, reviews", AGENT_TONE.result),
    label("out", 290, 441, "Can send data out", `${TOOLS.sendEmail.name}(to, …)`, AGENT_TONE.action),
    {
      id: "agent",
      type: "box",
      x: 300,
      y: 248,
      w: 130,
      h: 44,
      label: `${BRIGHTPOST.shop} agent`,
      sub: "has all three",
      tone: AGENT_TONE.model,
      fill: "pastel",
      highlight: true,
    },
  ],
};

export default spec;
