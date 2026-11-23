import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { A2A_VERSION, COURIER } from "@/components/diagrams/presets/agents-a2a";

// Discovery on agent-to-agent-protocols (Core concepts, "Agent cards and discovery"): Brightpost's support agent
// fetches the courier's agent card from the well-known path and reads it top to bottom. Fields follow the A2A
// specification v1.0 (AgentCard in specification/a2a.proto, checked 2026-11-15): name and description, skills,
// supportedInterfaces (url, protocolBinding, protocolVersion; the first is preferred), capabilities (streaming,
// pushNotifications), securitySchemes and signatures (JWS over the RFC 8785 canonical card). The card is served at
// https://{domain}/.well-known/agent-card.json with ordinary HTTP caching.
//
// Four steps: 1 GET the card; it arrives with a cache lifetime · 2 name and skills: is this the right agent, and which
// skill to ask for (the skills row is ringed) · 3 interfaces and capabilities: where to send, which binding, stream or
// webhook · 4 security and signatures: get a token from the courier's sign-in server first; verify the signature.
//
// Layout: the client at x 20–190 with the request text under it; the card as six rows (x 290, w 260, h 46, from y 40,
// 54 apart) inside a group; one annotation per row at x 600 (w 200), joined by short arrows. The sign-in box sits
// under the client at the security row's height, so its arrow runs straight left.
//
// Colour (agents legend, three tones plus neutral): the client agent green; the card's rows blue (what comes back);
// the signature check lime; annotations, the sign-in server and the request text neutral.

const ROW_X = 290;
const ROW_W = 260;
const ROW_H = 46;
const NOTE_X = 600;
const NOTE_W = 200;
const rowY = (i: number) => 40 + i * 54;

const ROWS = [
  { id: "name", label: "name, description", sub: COURIER.agentName, note: "Is this the right agent?", step: 2 },
  {
    id: "skills",
    label: "skills",
    sub: `${COURIER.skill.id}: ${COURIER.skill.name}`,
    note: "Pick the skill to ask for",
    step: 2,
  },
  {
    id: "interfaces",
    label: "supportedInterfaces",
    sub: `${COURIER.binding} ${A2A_VERSION} · agents.${COURIER.domain}`,
    note: "Where to send, which binding",
    step: 3,
  },
  {
    id: "caps",
    label: "capabilities",
    sub: "streaming, pushNotifications",
    note: "Stream, or give a webhook",
    step: 3,
  },
  { id: "security", label: "securitySchemes", sub: COURIER.auth, note: "Get a token before calling", step: 4 },
  { id: "sigs", label: "signatures", sub: `JWS, signed by ${COURIER.short}`, note: "", step: 4 },
] as const;

const rows: LayoutShape[] = ROWS.flatMap((r, i): LayoutShape[] => {
  const y = rowY(i);
  const shapes: LayoutShape[] = [
    {
      id: `row-${r.id}`,
      type: "cell",
      x: ROW_X,
      y,
      w: ROW_W,
      h: ROW_H,
      label: r.label,
      sub: r.sub,
      tone: AGENT_TONE.result,
      highlight: r.id === "skills" ? true : undefined,
      // One "NEW" ring for the card at step 1 (on its first row), not six.
      quiet: i > 0 ? true : undefined,
    },
  ];
  if (r.note) {
    shapes.push(
      {
        id: `note-${r.id}`,
        type: "text",
        x: NOTE_X,
        y,
        w: NOTE_W,
        h: ROW_H,
        label: r.note,
        tone: AGENT_TONE.infra,
        step: r.step,
      },
      { id: `to-${r.id}`, type: "arrow", x: 0, y: 0, from: `row-${r.id}`, to: `note-${r.id}`, step: r.step }
    );
  }
  return shapes;
});

const sigY = rowY(5);
const secY = rowY(4);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Discovery: fetch the agent card and read it",
  width: 820,
  height: sigY + ROW_H + 28,
  steps: [
    { title: "Fetch the card from the well-known path" },
    { title: "Name and skills: the right agent, the right skill" },
    { title: "Interfaces and capabilities: where and how to send" },
    { title: "Security and signatures: sign in, then trust the card" },
  ],
  groups: [
    {
      id: "card",
      title: `Agent card · ${COURIER.domain}`,
      tone: AGENT_TONE.result,
      x: ROW_X - 14,
      y: 14,
      w: ROW_W + 28,
      h: sigY + ROW_H + 12 - 14,
    },
  ],
  shapes: [
    {
      id: "client",
      type: "box",
      x: 20,
      y: 40,
      w: 170,
      h: 56,
      label: "Brightpost agent",
      sub: "the A2A client",
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    { id: "get", type: "arrow", x: 190, y: 63, w: ROW_X - 14 - 190, h: 0, label: "GET", packet: true },
    {
      id: "request",
      type: "text",
      x: 20,
      y: 108,
      w: 230,
      h: 40,
      label: `https://${COURIER.domain}\n${COURIER.cardPath}`,
      tone: AGENT_TONE.infra,
    },
    {
      id: "cache",
      type: "text",
      x: 20,
      y: 152,
      w: 230,
      h: 24,
      label: `200 OK · max-age=${COURIER.cardMaxAge}`,
      tone: AGENT_TONE.infra,
      quiet: true,
    },
    ...rows,
    {
      id: "signin",
      type: "box",
      x: 20,
      y: secY,
      w: 170,
      h: ROW_H,
      label: `${COURIER.short} sign-in`,
      sub: `token: ${COURIER.scope}`,
      tone: AGENT_TONE.infra,
      step: 4,
    },
    { id: "to-signin", type: "arrow", x: 0, y: 0, from: "row-security", to: "signin", step: 4 },
    {
      id: "verify",
      type: "box",
      x: NOTE_X,
      y: sigY,
      w: NOTE_W,
      h: ROW_H,
      label: "Verify the signature",
      sub: `against ${COURIER.short}'s key`,
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 4,
    },
    { id: "to-verify", type: "arrow", x: 0, y: 0, from: "row-sigs", to: "verify", step: 4 },
  ],
};

export default spec;
