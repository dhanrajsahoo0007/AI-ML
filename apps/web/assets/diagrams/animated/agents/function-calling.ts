import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, SEQUENCE_TONE, TOOLS } from "@/components/diagrams/presets/agents";

// Function calling, one round trip (tool-use-and-mcp, Core concepts): the first loop of the Brightpost refund as
// messages between the model, the app (Brightpost's chat service) and the get_order tool. The model never runs the
// tool: it returns a structured call, the app runs it and sends the result back in the next request.
//
// Five steps (agents plan §8, Wave 2): 1 the app sends the customer's message and the four tool definitions · 2 the
// model returns a tool call (its stop_reason, tool_use, shows in the JSON, not here) · 3 the app checks the arguments,
// adds customer 1847 and runs get_order · 4 the app sends the whole conversation again with the tool result · 5 the
// model reads the result and picks its next step (here search_help; the loop ends on a reply with no tool call). Each
// step is followed on the page by its JSON in the Anthropic Messages API shape.
//
// Layout: three lanes, model | chat service | get_order, so every message joins neighbouring lanes (width 720, about
// 213 per lane). The customer's message is a note on the app lane rather than a fourth lane, which would make the
// app-to-tool arrows cross the model's lifeline.
//
// Colour (agents legend via SEQUENCE_TONE): model green, app neutral, tool teal. Calls are solid, replies dashed.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Function calling: one tool call, round trip",
  width: 720,
  steps: [
    { title: "The app sends the message and the tool definitions" },
    { title: "The model returns a tool call" },
    { title: "The app runs the tool" },
    { title: "The app sends the result back" },
    { title: "The model reads the result and picks the next step" },
  ],
  lanes: [
    { id: "model", label: "Model", icon: "model", tone: SEQUENCE_TONE.model },
    { id: "app", label: "Chat service", icon: "server", tone: SEQUENCE_TONE.harness },
    { id: "tool", label: TOOLS.getOrder.name, icon: "tool", tone: SEQUENCE_TONE.tool },
  ],
  messages: [
    // Step 1: one request carries the customer's message and all four tool definitions.
    { from: "app", to: "model", label: "message + 4 tool definitions", step: 1, at: 1 },

    // Step 2: the reply is a structured call, not words.
    { from: "model", to: "app", label: `tool_use: ${TOOLS.getOrder.call}`, kind: "return", step: 2, at: 3 },

    // Step 3: the app validates, adds the signed-in customer and runs the function.
    { from: "app", to: "app", label: `check, add customer ${BRIGHTPOST.customerId}`, step: 3, at: 5 },
    {
      from: "app",
      to: "tool",
      label: `${TOOLS.getOrder.name}(${BRIGHTPOST.orderId}, ${BRIGHTPOST.customerId})`,
      step: 3,
      at: 6,
    },
    {
      from: "tool",
      to: "app",
      label: `${BRIGHTPOST.item}, £${BRIGHTPOST.price}, ${BRIGHTPOST.delivered}`,
      kind: "return",
      step: 3,
      at: 7,
    },

    // Step 4: the next request resends everything so far, plus the result matched to the call's id.
    { from: "app", to: "model", label: "history + tool_result", step: 4, at: 8 },

    // Step 5: the model reads the order and asks for the refund rule.
    { from: "model", to: "app", label: `tool_use: ${TOOLS.searchHelp.name}`, kind: "return", step: 5, at: 9 },
  ],
  notes: [
    { lane: "app", text: `Customer: "kettle cracked, order ${BRIGHTPOST.orderId}"`, step: 1, at: 0 },
    { lane: "app", text: "Loops until a reply has no tool call", step: 5, at: 10 },
  ],
};

export default spec;
