import type { DiagramSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Data exfiltration paths" (prompt-injection-and-jailbreaks). Simon Willison's "lethal trifecta" (2025): an agent
// that has access to private data, is exposed to untrusted content, and can communicate externally can be made to
// send that data to an attacker. The three zones are the three legs.
// Step 1: the trifecta. Brightpost's assistant reads the customer's account (private data) and a web page with hidden
//   text (untrusted content); it writes replies to a chat window that renders markdown and can call send_email
//   (two outbound channels).
// Step 2: path A, a markdown image. The reply contains an image whose URL carries the customer's data in its query
//   string; the browser fetches the "image" from the attacker's server, and the data goes with the request (the
//   technique Willison described in 2023 and that EchoLeak used against Microsoft 365 Copilot in 2025).
// Step 3: path B, a tool call. The assistant calls send_email with the data, addressed to the attacker.
// Step 4: cut the outbound leg: the chat window loads images only from Brightpost's own domains and send_email can
//   only write to the signed-in customer's address, so both requests are blocked.
//
// Edges that a later step replaces end with `until`; the final view shows the defended state.
// Layout: content 110,90 and private data 110,320 on the left; the assistant 370,205; the chat window 600,90 and
// send_email 600,320; the attacker's server 800,205 (130 wide). Zones: one per leg of the trifecta.
// Tones (four plus neutral): the attack red (the poisoned page, the attacker's server, red edges), private data
// violet, the assistant green (the accent), send_email teal; the chat window neutral.

const W = 150;

const spec: DiagramSpec = {
  title: "The lethal trifecta: private data, untrusted content and a way out",
  width: 880,
  height: 420,
  steps: [
    { title: "Three capabilities meet in one assistant" },
    { title: "Path A: a markdown image carries the data out" },
    { title: "Path B: a tool call sends it to the attacker" },
    { title: "Cut the outbound leg" },
  ],
  zones: [
    { id: "untrusted", title: "Untrusted content", tone: RAG_TONE.failure, x: 20, y: 30, w: 180, h: 115 },
    { id: "private", title: "Private data", tone: RAG_TONE.store, x: 20, y: 260, w: 180, h: 115 },
    { id: "outbound", title: "Outbound channels", tone: RAG_TONE.infra, x: 510, y: 30, w: 180, h: 345 },
  ],
  nodes: [
    {
      id: "page",
      label: "Web page",
      sub: "hidden text",
      icon: "browser",
      tone: RAG_TONE.failure,
      fill: "pastel",
      x: 110,
      y: 90,
      w: W,
    },
    {
      id: "account",
      label: "Account",
      sub: "email, address",
      icon: "database",
      tone: RAG_TONE.store,
      fill: "pastel",
      x: 110,
      y: 320,
      w: W,
    },
    {
      id: "assistant",
      label: "Assistant",
      sub: "LLM + tools",
      icon: "model",
      tone: RAG_TONE.answer,
      accent: true,
      x: 370,
      y: 205,
      w: W,
    },
    {
      id: "chat",
      label: "Chat window",
      sub: "shows markdown",
      icon: "chat",
      tone: RAG_TONE.infra,
      x: 600,
      y: 90,
      w: W,
    },
    {
      id: "email",
      label: "send_email",
      sub: "email tool",
      icon: "wrench",
      tone: "teal",
      fill: "pastel",
      x: 600,
      y: 320,
      w: W,
    },
    {
      id: "attacker",
      label: "Attacker",
      sub: "server",
      icon: "server",
      tone: RAG_TONE.failure,
      x: 800,
      y: 205,
      w: 130,
    },
  ],
  edges: [
    // Step 1: the three legs.
    { from: "page", to: "assistant", label: "instructions", tone: RAG_TONE.failure, dashed: true, packet: true },
    { from: "account", to: "assistant", label: "reads", packet: true },
    { from: "assistant", to: "chat", label: "reply", until: 1 },
    { from: "assistant", to: "email", label: "tool call", until: 2 },
    // Step 2: path A.
    {
      from: "assistant",
      to: "chat",
      label: "image URL + data",
      tone: RAG_TONE.failure,
      packet: true,
      step: 2,
      until: 3,
    },
    {
      from: "chat",
      to: "attacker",
      label: "fetch",
      tone: RAG_TONE.failure,
      packet: true,
      delay: 0.8,
      step: 2,
      until: 3,
    },
    // Step 3: path B.
    {
      from: "assistant",
      to: "email",
      label: "data to attacker",
      tone: RAG_TONE.failure,
      packet: true,
      step: 3,
      until: 3,
    },
    {
      from: "email",
      to: "attacker",
      label: "sent",
      tone: RAG_TONE.failure,
      packet: true,
      delay: 0.8,
      step: 3,
      until: 3,
    },
    // Step 4: both exits closed.
    { from: "assistant", to: "chat", label: "own images only", step: 4 },
    { from: "chat", to: "attacker", label: "blocked", tone: RAG_TONE.failure, dashed: true, step: 4 },
    { from: "assistant", to: "email", label: "customer only", step: 4 },
    { from: "email", to: "attacker", label: "blocked", tone: RAG_TONE.failure, dashed: true, step: 4 },
  ],
};

export default spec;
