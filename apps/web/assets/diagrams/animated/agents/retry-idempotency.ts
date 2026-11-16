import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, SEQUENCE_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { RUN_STATE } from "@/components/diagrams/presets/agents-state";

// Retries and idempotency (agent-reliability-and-error-recovery, Core concepts "Tool failures, retries and
// idempotency"). The Brightpost refund after approval: the model asks for create_refund(4471, 42.00), the harness
// sends it to the payments service, the payments service makes the refund and the reply is lost (a timeout). The
// harness retries the same tool call. Without a key the payments service cannot tell the retry from a new request
// and refunds again: £42 + £42 = £84 (RESUME_COST.doubleRefund on state-persistence-retrieval). Then the same run
// replayed with the idempotency key run_8f3a:toolu_03 (RUN_STATE.refundKey: run id + tool-call id, built and saved in
// cp_3 before the call, as on state-persistence-retrieval and its checkpoint-timeline figure): the retry carries the
// same key, the payments service returns the saved R-2291 and no second refund is made.
//
// Four steps: 1 the refund goes out, the reply is lost · 2 without a key the retry refunds again (£84) · 3 the same
// run with a key: the first call times out the same way · 4 the retry carries the same key: a no-op, R-2291 once.
//
// Lanes (SEQUENCE_TONE): the model green, the harness neutral, the payments service teal. What happens inside the
// payments service is drawn as notes on its lane (they flip to the left of the lifeline at the canvas edge). The
// timeout is the engine's red "timeout" message, the only red. Lane labels stay under 13 characters.

const twice = BRIGHTPOST.price * 2;
/** The second refund the keyless retry creates (illustrative id, the next after R-2291). */
const SECOND_REFUND = "R-2292";

const spec: SequenceSpec = {
  kind: "sequence",
  title: `${TOOLS.createRefund.name} times out and is retried, without and with an idempotency key`,
  width: 860,
  steps: [
    { title: "The refund goes out, but the reply is lost" },
    { title: `Without a key, the retry refunds again: £${twice}` },
    { title: "The same run with a key: the first call times out the same way" },
    { title: "The retry carries the same key: no second refund" },
  ],
  lanes: [
    { id: "model", label: "Model", icon: "model", tone: SEQUENCE_TONE.model },
    { id: "harness", label: "Harness", icon: "server", tone: SEQUENCE_TONE.harness },
    { id: "pay", label: "Payments", icon: "tool", tone: SEQUENCE_TONE.tool },
  ],
  messages: [
    // Step 1: one call, one refund, no reply.
    { from: "model", to: "harness", label: TOOLS.createRefund.call, at: 0 },
    { from: "harness", to: "pay", label: `refund £${BRIGHTPOST.price}, order ${BRIGHTPOST.orderId}`, at: 1 },
    { from: "pay", to: "harness", label: "reply lost", kind: "timeout", at: 3, delay: 0.4 },

    // Step 2: the keyless retry is a new request to the payments service.
    { from: "harness", to: "pay", label: `retry: refund £${BRIGHTPOST.price}`, step: 2, at: 4 },
    { from: "pay", to: "harness", label: SECOND_REFUND, kind: "return", step: 2, at: 6 },

    // Step 3: replay with the key, saved in cp_3 before the call.
    {
      from: "model",
      to: "pay",
      label: `Replay: the same run, key ${RUN_STATE.refundKey} saved in cp_3 first`,
      kind: "note",
      step: 3,
      at: 7,
    },
    { from: "harness", to: "pay", label: `refund £${BRIGHTPOST.price}, key ${RUN_STATE.refundKey}`, step: 3, at: 8 },
    { from: "pay", to: "harness", label: "reply lost", kind: "timeout", step: 3, at: 10, delay: 0.4 },

    // Step 4: the retry with the same key is answered from the saved result.
    { from: "harness", to: "pay", label: `retry, same key ${RUN_STATE.refundKey}`, step: 4, at: 11 },
    { from: "pay", to: "harness", label: `saved reply: ${BRIGHTPOST.refundId}`, kind: "return", step: 4, at: 13 },
    {
      from: "harness",
      to: "model",
      label: `refund ${BRIGHTPOST.refundId}, £${BRIGHTPOST.price} once`,
      kind: "return",
      step: 4,
      at: 14,
    },
  ],
  notes: [
    { lane: "pay", text: `${BRIGHTPOST.refundId} made: £${BRIGHTPOST.price} out`, at: 2 },
    { lane: "pay", text: `${SECOND_REFUND} made: £${twice} out in total`, step: 2, at: 5 },
    { lane: "pay", text: `${BRIGHTPOST.refundId} made; key and reply saved`, step: 3, at: 9 },
    { lane: "pay", text: "key seen: return the saved reply", step: 4, at: 12 },
  ],
};

export default spec;
