import type { DiagramSpec } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Direct injection and jailbreaks" / "Indirect injection" (prompt-injection-and-jailbreaks). Brightpost's support
// assistant can call create_refund (the agents running example: refunds over £30 wait for a person once the defences
// of cloud/ai-guardrail-path are in place; here they are not yet).
// Step 1, direct: the person typing is the attacker and writes the attack into the chat.
// Step 2, indirect: an innocent customer asks a question; to answer, the assistant reads a help article, a customer
//   email and a web page. The attacker has hidden instructions in the web page, never talking to the assistant; the
//   assistant obeys them and calls create_refund.
//
// Layout: attacker 110,80; the content column at x 340 (rows 80 / 205 / 330, cards 160 wide); the assistant 570,205
// with the customer straight below it at 570,345, so the question runs straight up and crosses no content edge; the
// refund tool 790,205. The direct attack edge runs from the attacker to the assistant between the content rows.
// Tones (four plus neutral): the attack path red (attacker, poisoned page, red edges), content blue, the assistant
// green (the accent), the tool teal; the customer neutral. Red appears only on the attack path.

const W = 150;

const spec: DiagramSpec = {
  title: "Direct injection comes from the user; indirect injection hides in content the assistant reads",
  width: 880,
  height: 410,
  steps: [{ title: "Direct: the user is the attacker" }, { title: "Indirect: the attack hides in content" }],
  zones: [{ id: "content", title: "Content it reads", tone: RAG_TONE.text, x: 250, y: 30, w: 180, h: 360 }],
  nodes: [
    {
      id: "attacker",
      label: "Attacker",
      sub: "outside",
      icon: "users",
      tone: RAG_TONE.failure,
      x: 110,
      y: 80,
      w: W,
    },
    {
      id: "assistant",
      label: "Support assistant",
      sub: "LLM + tools",
      icon: "model",
      tone: RAG_TONE.answer,
      accent: true,
      x: 570,
      y: 205,
      w: 176,
    },
    {
      id: "refund",
      label: "create_refund",
      sub: "any order",
      icon: "wrench",
      tone: "teal",
      fill: "pastel",
      x: 790,
      y: 205,
      w: 150,
    },
    {
      id: "customer",
      label: "Customer",
      sub: "honest question",
      icon: "users",
      tone: RAG_TONE.infra,
      step: 2,
      x: 570,
      y: 345,
      w: W,
    },
    {
      id: "page",
      label: "Web page",
      sub: "hidden text",
      icon: "browser",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 2,
      x: 340,
      y: 80,
      w: 160,
    },
    {
      id: "email",
      label: "Customer email",
      sub: "attached",
      icon: "file",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 2,
      x: 340,
      y: 205,
      w: 160,
    },
    {
      id: "article",
      label: "Help article",
      sub: "retrieved",
      icon: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 2,
      x: 340,
      y: 330,
      w: 160,
    },
  ],
  edges: [
    // Step 1: direct injection, typed into the chat.
    {
      from: "attacker",
      to: "assistant",
      label: "types the attack",
      tone: RAG_TONE.failure,
      packet: true,
      labelAt: 0.62,
      until: 1,
    },
    {
      from: "assistant",
      to: "refund",
      tone: RAG_TONE.failure,
      packet: true,
      delay: 1.2,
    },
    // Step 2: indirect injection; the attacker only edits the page.
    { from: "attacker", to: "page", label: "plants", tone: RAG_TONE.failure, dashed: true, step: 2 },
    { from: "customer", to: "assistant", label: "question", packet: true, step: 2 },
    { from: "page", to: "assistant", label: "obeyed", tone: RAG_TONE.failure, packet: true, delay: 0.6, step: 2 },
    { from: "email", to: "assistant", step: 2 },
    { from: "article", to: "assistant", step: 2 },
  ],
};

export default spec;
