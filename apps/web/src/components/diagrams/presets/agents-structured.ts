// Constants for the structured-output-generation figures (agents/constrained-decoding, agents/validate-and-repair).
// One extraction task on the Brightpost kettle message: turn "My kettle arrived cracked. It's order 4471. Can I get my
// money back?" into a record {order_id, item, issue, wants} that the refunds workflow can read. The order number and
// the item come from BRIGHTPOST; the enums and the failure cases below are this page's own (illustrative).

import { BRIGHTPOST, LATENCY_S } from "./agents";

/** The two enums in the extraction schema. "cracked" and "money back" are the customer's words, not enum values. */
export const ISSUES = ["damaged", "missing", "late", "wrong_item"] as const;
export const WANTS = ["refund", "replacement", "information"] as const;

/** The record the model should return for the kettle message. */
export const EXTRACTION = {
  order_id: BRIGHTPOST.orderId,
  item: BRIGHTPOST.item,
  issue: "damaged",
  wants: "refund",
} as const;

/** The customer's own words the enums turn away (the unmasked model's likely picks, illustrative). */
export const CUSTOMER_WORDS = { issue: "cracked", wants: "money back" } as const;

/** The order-id rule: four digits, as a JSON Schema `pattern`. */
export const ORDER_PATTERN = "^[0-9]{4}$";

/**
 * The repair loop on a provider without strict mode (prompt-only JSON): attempt 1 copies the customer's words into
 * `wants`, the validator names the field and the allowed values, attempt 2 is valid, then the business rule
 * (get_order: does the order exist and belong to the signed-in customer?) passes. A cap of 2 retries allows 3
 * attempts; at LATENCY_S.modelCall = 1.5 s each (illustrative) the worst case is 3 × 1.5 = 4.5 s before the fallback.
 */
export const REPAIR = {
  badValue: CUSTOMER_WORDS.wants,
  error: `wants: "${CUSTOMER_WORDS.wants}" is not one of ${WANTS.join(", ")}`,
  maxRetries: 2,
  attempts: 3,
  worstCaseS: Math.round(3 * LATENCY_S.modelCall * 10) / 10,
  /** Two attempts in the figure's happy repair: 2 × 1.5 = 3.0 s, plus the get_order check (0.3 s) = 3.3 s. */
  repairedS: Math.round((2 * LATENCY_S.modelCall + LATENCY_S.toolCall) * 10) / 10,
} as const;
