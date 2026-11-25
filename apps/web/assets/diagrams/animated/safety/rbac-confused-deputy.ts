import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, PROD_TONE } from "@/components/diagrams/presets/production";
import { arr, blk, note } from "@/components/diagrams/presets/production-safety";

// The confused deputy (access-control-rbac, Deep dive): the assistant's service holds one broad credential, so when a
// pasted note makes the model ask for a refund on order 5122 (BRIGHTPOST.injectedOrder, a stranger's order), the order
// system sees a trusted caller and pays. The fix is to call the tools with a token for the user (here customer 1847),
// so the same request fails the ownership check. Illustrative: the service's credential name and scope.
// Steps: 1 the customer's message carries a pasted note naming order 5122 · 2 the model asks for the refund · 3 the
// service calls with its own key and the order system pays (red) · 4 the fix: a token for user 1847 only, and the same
// call is refused.
// Grid (width 880): top row y 60 (h 64): customer x 10 | model x 250 | service x 490 | orders x 730, all w 140.
// Red outcome x 730 y 170 (w 140, h 56). Row label y 252. Fix row y 286 (h 64): user token x 490 | refused x 730.
// Colours (PROD_TONE): customer orange, model green, service and token teal, orders and refused neutral, harm red.
// Four tones plus neutral; the service box is the highlight.

const R = BRIGHTPOST.injectedOrder;

const shapes: LayoutShape[] = [
  blk("cust", 10, 60, 140, 64, `Customer ${BRIGHTPOST.customerId}`, `note names order ${R}`, PROD_TONE.traffic, 1),
  blk("model", 250, 60, 140, 64, "Model", "reads the note", PROD_TONE.model, 2),
  arr("c-m", "cust", "model", 2, "message + note"),
  blk("svc", 490, 60, 140, 64, "Chat service", "own key: any order", PROD_TONE.compute, 3, true),
  arr("m-s", "model", "svc", 3, `refund ${R}`),
  blk("ord", 730, 60, 140, 64, "Order system", "trusts the key", PROD_TONE.infra, 3),
  arr("s-o", "svc", "ord", 3, "own key", { tone: PROD_TONE.failure }),
  blk("paid", 730, 170, 140, 56, `Order ${R} refunded`, "to the wrong person", PROD_TONE.failure, 3),
  arr("o-p", "ord", "paid", 3),
  note("fix-h", 10, 252, "The fix: act as the user, not as the service", 4, PROD_TONE.infra),
  blk("tok", 490, 286, 140, 64, `Token: user ${BRIGHTPOST.customerId}`, "only their orders", PROD_TONE.compute, 4),
  arr("s-t", "svc", "tok", 4, "call as the user"),
  blk("deny", 730, 286, 140, 64, "403: refused", `order ${R} is not theirs`, PROD_TONE.infra, 4, true),
  arr("t-d", "tok", "deny", 4, `owner of ${R}?`),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A confused deputy: the service's own key pays a stranger's order",
  width: 880,
  height: 376,
  steps: [
    { title: "A note names someone else's order" },
    { title: "The model asks for the refund" },
    { title: "The service uses its own key and the order is paid" },
    { title: "The fix: call as the user, and the same request is refused" },
  ],
  shapes,
};

export default spec;
