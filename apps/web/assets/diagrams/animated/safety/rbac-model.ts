import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import { arr, blk, note } from "@/components/diagrams/presets/production-safety";

// The role model (access-control-rbac, Architecture): a user holds a role, and the role decides three things: which
// models may be called, which tools may run, and which data the tools may touch. Anything not in the table is
// refused (default deny). The roles and limits are ILLUSTRATIVE; the refund limit of £30 is the Brightpost rule
// (REFUND_CASE.approvalLimit) and 1847 is the signed-in customer (BRIGHTPOST.customerId).
// Steps: 1 users and their roles · 2 which models · 3 which tools · 4 which data.
// Grid (width 880): users x 10 (w 130) | roles x 170 (w 130) | models x 330 (w 170) | tools x 520 (w 190) |
// data x 730 (w 140). Column headings y 14; rows (h 70) at y 50, 150, 250; footer note y 340.
// Colours (PROD_TONE): users orange (traffic), roles neutral (control), models green, tools teal, data blue.
// Four tones plus neutral; the customer's refund tool cell is the one highlight.

const ROW_Y = [50, 150, 250] as const;
const H = 70;

const rows = [
  {
    user: `Customer ${BRIGHTPOST.customerId}`,
    userSub: "signed in, chat",
    role: "customer",
    models: "assistant\n(small model)",
    tools: `get_order, search_help\ncreate_refund up to £${REFUND_CASE.approvalLimit}`,
    data: "own orders only",
  },
  {
    user: "Support agent",
    userSub: "staff",
    role: "agent",
    models: "assistant +\nlarge model",
    tools: `all four tools\napproves refunds over £${REFUND_CASE.approvalLimit}`,
    data: "orders in the\nticket queue",
  },
  {
    user: "Support lead",
    userSub: "staff",
    role: "lead",
    models: "all models,\nincl. the judge",
    tools: "approves any amount\nchanges the limits",
    data: "all orders,\naudit log (read)",
  },
] as const;

const shapes: LayoutShape[] = [
  note("h-user", 10, 14, "User", 1),
  note("h-role", 170, 14, "Role", 1),
  note("h-models", 330, 14, "Models it may call", 2),
  note("h-tools", 520, 14, "Tools it may run", 3),
  note("h-data", 730, 14, "Data it may touch", 4),
];

rows.forEach((r, i) => {
  const y = ROW_Y[i];
  shapes.push(
    blk(`u${i}`, 10, y, 130, H, r.user, r.userSub, PROD_TONE.traffic, 1),
    blk(`r${i}`, 170, y, 130, H, r.role, "role", PROD_TONE.infra, 1),
    arr(`ur${i}`, `u${i}`, `r${i}`, 1),
    blk(`m${i}`, 330, y, 170, H, r.models, undefined, PROD_TONE.model, 2),
    blk(`t${i}`, 520, y, 190, H, r.tools, undefined, PROD_TONE.compute, 3, i === 0),
    blk(`d${i}`, 730, y, 140, H, r.data, undefined, PROD_TONE.data, 4)
  );
});

shapes.push(
  note("deny", 10, 340, "Default deny: a model, tool or data scope that is not in the role's row is refused.", 4),
  note(
    "limit",
    10,
    364,
    "The model gets the tools of the user's role, never more. Roles and limits are illustrative.",
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A role decides which models, tools and data a user may reach",
  width: 880,
  height: 396,
  steps: [
    { title: "A user holds a role" },
    { title: "The role limits the models" },
    { title: "The role limits the tools" },
    { title: "The role limits the data" },
  ],
  shapes,
};

export default spec;
