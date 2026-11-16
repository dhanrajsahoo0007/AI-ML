import type { SequenceSpec } from "@/components/diagrams/types";
import { indirectInjectionSpec } from "@/components/diagrams/presets/agents-safety";
import { WEB_CARRIER, WEB_TOOLS_LABEL } from "@/components/diagrams/presets/agents-computer";

// Indirect prompt injection with a web page as the carrier (computer-use-and-browser-agents, Technical mechanics
// "Prompt injection from web content"). The same five steps as animated/agents/indirect-injection on
// guardrails-and-safety, built by the same builder (presets/agents-safety.ts) with a different carrier: Brightpost's
// support agent now has a browser so it can file the courier claim on Swiftline's portal. An outsider has posted a
// reply on Swiftline's public claims help page in white-on-white text: invisible to a person, plain text to a model
// that reads the page. The agent opens the page to learn how to claim; the hidden reply asks it to refund order 5122;
// the chat service checks the order's owner in code and refuses; the real refund for 4471 goes on to the approval
// step. Anthropic's computer use docs (checked 2026-11-16) warn that Claude may follow instructions found in web pages
// and images, even against the user's.
//
// Five steps: 1 the hidden reply is planted · 2 the customer's request and get_order · 3 the page comes back as a tool
// result · 4 the model asks to refund 5122 · 5 the harness check refuses it.
//
// Layout and colour: as indirect-injection (four lanes: attacker red, courier site teal with the browser glyph, chat
// service neutral, model green). One label differs: step 2 says the tool list now includes the browser.

const base = indirectInjectionSpec(WEB_CARRIER);

const spec: SequenceSpec = {
  ...base,
  title: "Indirect prompt injection from a web page, stopped by the harness",
  messages: base.messages.map((m) =>
    m.label === "message + 4 tool definitions" ? { ...m, label: WEB_TOOLS_LABEL } : m
  ),
};

export default spec;
