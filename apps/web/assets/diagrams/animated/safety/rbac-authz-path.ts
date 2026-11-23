import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, REFUND_CASE } from "@/components/diagrams/presets/production";

// The authorisation path (access-control-rbac, Architecture): the user's identity is fixed by the chat service from the
// session token and travels to retrieval and to every tool call. The model proposes calls; it never holds authority.
// Steps: 1 the service checks the token and passes the user's groups to retrieval · 2 the model sees only the tools of
// the role and proposes a refund · 3 the tool gateway checks owner and limit · 4 a call for another customer's order
// (BRIGHTPOST.injectedOrder) is refused although the model asked for it.
// Lanes (short labels so the six boxes do not touch): Customer, Chat app, Retriever, LLM, Tool gateway, Orders. Width 880.
// Tones (sequence lanes take section tones only): customer orange, service neutral, retriever violet, model green,
// gateway and orders teal.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "The user's identity travels to retrieval and tools; the model never holds it",
  width: 880,
  lanes: [
    { id: "customer", label: "Customer", icon: "users", tone: "orange" },
    { id: "chat", label: "Chat app", icon: "pipeline", tone: "neutral" },
    { id: "retriever", label: "Retriever", icon: "vector-index", tone: "violet" },
    { id: "llm", label: "LLM", icon: "model", tone: "green" },
    { id: "gateway", label: "Tool gateway", icon: "gateway", tone: "teal" },
    { id: "orders", label: "Orders", icon: "database", tone: "teal" },
  ],
  steps: [
    { title: "The service decides who is asking" },
    { title: "The model sees only this role's tools" },
    { title: "The gateway checks owner and limit" },
    { title: "A call for someone else's order is refused" },
  ],
  messages: [
    // Step 1
    { from: "customer", to: "chat", label: "message + session token" },
    { from: "chat", to: "retriever", label: "search, filter: customers" },
    { from: "retriever", to: "chat", label: "top 5, public only", kind: "return" },
    // Step 2
    { from: "chat", to: "llm", label: "prompt + tools for role customer", step: 2 },
    {
      from: "llm",
      to: "chat",
      label: `create_refund(${REFUND_CASE.orderId}, ${REFUND_CASE.price}.00)`,
      kind: "return",
      step: 2,
    },
    // Step 3
    { from: "chat", to: "gateway", label: `call + user ${BRIGHTPOST.customerId}`, step: 3 },
    { from: "gateway", to: "orders", label: `owner of ${REFUND_CASE.orderId}?`, step: 3 },
    { from: "orders", to: "gateway", label: `${BRIGHTPOST.customerId}: match`, kind: "return", step: 3 },
    {
      from: "gateway",
      to: "chat",
      label: `£${REFUND_CASE.price} > £${REFUND_CASE.approvalLimit}: held for approval`,
      kind: "return",
      step: 3,
    },
    // Step 4
    {
      from: "llm",
      to: "chat",
      label: `create_refund(${BRIGHTPOST.injectedOrder}, ${REFUND_CASE.price}.00)`,
      kind: "return",
      step: 4,
    },
    { from: "chat", to: "gateway", label: `call + user ${BRIGHTPOST.customerId}`, step: 4 },
    { from: "gateway", to: "orders", label: `owner of ${BRIGHTPOST.injectedOrder}?`, step: 4 },
    { from: "orders", to: "gateway", label: "someone else", kind: "return", step: 4 },
    { from: "gateway", to: "chat", label: "403: not this user's order", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "chat", text: `Token checked: user ${BRIGHTPOST.customerId}, role customer`, step: 1, at: 0.5 },
    { lane: "gateway", text: "The model's words cannot change who the user is", step: 4, at: 13.5 },
  ],
};

export default spec;
