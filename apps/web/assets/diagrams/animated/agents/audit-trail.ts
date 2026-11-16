import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";
import { RUN_STATE } from "@/components/diagrams/presets/agents-state";
import { APPROVAL } from "@/components/diagrams/presets/agents-hitl";

// The audit record for one approval (human-in-the-loop-and-approvals, Technical mechanics "Audit trails for agent
// actions"): what the harness writes when the £42 refund is held, decided and run. Four groups, left to right, filled
// in as the run moves: the request (which run, which call, which key), what the approver was shown (the evidence and
// the rule that held the call), the decision (who, when, what), and the outcome (the checkpoint, the refund). Run ids
// and the key come from presets/agents-state; the approver id and the 10:14 request time are illustrative (APPROVAL
// in presets/agents-hitl); 10:20 is BRIGHTPOST.approvedAt.
//
// Four steps: 1 the request · 2 what the support agent was shown · 3 the decision (the highlight: who and when) · 4
// the outcome.
//
// Layout: four groups 200 wide at x 16, 228, 440, 652, y 20–282; each holds four (three) cells 180 wide, 46 tall, at
// y 52, 108, 164, 220: the value as the label, the field as the sub-line. A note under the groups.
//
// Colour (agents legend, four tones plus neutral): the request teal (an action), what was shown blue (results), the
// decision orange (the approver), the outcome violet (state). One highlight: the approver and the time.

const GX = [16, 228, 440, 652] as const;
const GW = 200;
const CELL_Y = [52, 108, 164, 220] as const;

interface Field {
  value: string;
  field: string;
  highlight?: boolean;
}

const cells = (group: number, fields: Field[], tone: LayoutTone, step: number): LayoutShape[] =>
  fields.map((f, i) => ({
    id: `g${group}-${i}`,
    type: "cell",
    x: GX[group] + 10,
    y: CELL_Y[i],
    w: GW - 20,
    h: 46,
    label: f.value,
    sub: f.field,
    tone,
    fill: "soft",
    step,
    highlight: f.highlight,
    quiet: i > 0 ? true : undefined,
  }));

const spec: LayoutSpec = {
  kind: "layout",
  title: "The audit record for one approval",
  width: 868,
  height: 318,
  steps: [
    { title: "The request: which run, which call" },
    { title: "What the support agent was shown" },
    { title: "The decision: who, when, what" },
    { title: "The outcome: what actually happened" },
  ],
  groups: [
    { id: "request", title: "Request", tone: AGENT_TONE.action, x: GX[0], y: 20, w: GW, h: 262 },
    { id: "shown", title: "Evidence shown", tone: AGENT_TONE.result, x: GX[1], y: 20, w: GW, h: 262 },
    { id: "decision", title: "Decision", tone: AGENT_TONE.task, x: GX[2], y: 20, w: GW, h: 262 },
    { id: "outcome", title: "Outcome", tone: AGENT_TONE.memory, x: GX[3], y: 20, w: GW, h: 262 },
  ],
  shapes: [
    ...cells(
      0,
      [
        { value: RUN_STATE.runId, field: `run, thread ${RUN_STATE.threadId}` },
        { value: RUN_STATE.toolCallId, field: "tool call" },
        { value: TOOLS.createRefund.name, field: `order ${BRIGHTPOST.orderId}, £${BRIGHTPOST.price.toFixed(2)}` },
        { value: RUN_STATE.refundKey, field: "idempotency key" },
      ],
      AGENT_TONE.action,
      1
    ),
    ...cells(
      1,
      [
        { value: `Kettle, £${BRIGHTPOST.price}, ${BRIGHTPOST.delivered}`, field: `order ${BRIGHTPOST.orderId}` },
        { value: BRIGHTPOST.helpArticle, field: "help rule found" },
        { value: "cracked: full refund", field: "the model's reason" },
        { value: APPROVAL.rule, field: `rule ${APPROVAL.ruleId}` },
      ],
      AGENT_TONE.result,
      2
    ),
    ...cells(
      2,
      [
        { value: APPROVAL.approverId, field: BRIGHTPOST.approver, highlight: true },
        {
          value: `${APPROVAL.requestedAt} → ${BRIGHTPOST.approvedAt}`,
          field: `asked → decided, ${APPROVAL.waitMin} min`,
        },
        { value: "approve", field: "decision" },
        { value: "none", field: "edits to the call" },
      ],
      AGENT_TONE.task,
      3
    ),
    ...cells(
      3,
      [
        { value: APPROVAL.resumedAt, field: "checkpoint saved" },
        { value: BRIGHTPOST.refundId, field: `${TOOLS.createRefund.name} result` },
        { value: "ran once", field: "same key on any retry" },
      ],
      AGENT_TONE.memory,
      4
    ),
    {
      id: "note",
      type: "text",
      x: 16,
      y: 290,
      w: 836,
      h: 20,
      label: `Append-only, one record per decision. ${APPROVAL.requestedAt} and ${APPROVAL.approverId} are illustrative.`,
      tone: AGENT_TONE.infra,
      step: 1,
    },
  ],
};

export default spec;
