// Constants for the computer-use figures (assets/diagrams/animated/agents/computer-use-loop, observation-types,
// grounding, indirect-injection-web) on genai-system-design/computer-use-and-browser-agents. Brightpost names come
// from ./agents; the courier and the claim come from ./agents-a2a, so both pages tell one story.
//
// The story: after refunding the cracked kettle (order 4471, £42), Brightpost claims the £42 back from the courier.
// On the A2A page Swiftline offers a claims agent; here Swiftline offers only a web portal, as most couriers do, so a
// browser agent fills in the claim form. The portal's host, the form's layout and every coordinate are invented for
// the example (domains use the reserved .example TLD, RFC 2606).
//
// Screen and token facts follow the Claude computer use tool docs (platform.claude.com, computer-use-tool, checked
// 2026-11-16): coordinates are in the pixel space of the screenshot the harness returns; the harness resizes
// screenshots to fit the model's image limits (toolset models: 2,576 px on the long edge and 4,784 visual tokens,
// ⌈width / 28⌉ × ⌈height / 28⌉) and scales the model's coordinates back to the real screen; 1280 × 800 is a
// recommended size for web apps; one screenshot costs roughly 1,000 to 1,800 input tokens.

import { BRIGHTPOST } from "./agents";
import { CLAIM, COURIER } from "./agents-a2a";
import type { InjectionCarrier } from "./agents-safety";

/** Visual tokens of one image on the toolset models: ⌈width / 28⌉ × ⌈height / 28⌉. */
export const visualTokens = (w: number, h: number) => Math.ceil(w / 28) * Math.ceil(h / 28);

/**
 * The browser agent's screen. The VM's display is 2560 × 1600; the harness sends 1280 × 800 (scale 0.5).
 * - Full size: ⌈2560 / 28⌉ × ⌈1600 / 28⌉ = 92 × 58 = 5,336 visual tokens, over the 4,784 limit: the API rejects it.
 * - Sent size: ⌈1280 / 28⌉ × ⌈800 / 28⌉ = 46 × 29 = 1,334 tokens, inside the docs' 1,000 to 1,800 range.
 */
export const SCREEN = {
  real: { w: 2560, h: 1600 },
  sent: { w: 1280, h: 800 },
  scale: 0.5,
  tokenLimit: 4_784,
  realTokens: visualTokens(2560, 1600),
  sentTokens: visualTokens(1280, 800),
} as const;

/** The courier's claims portal and the claim form, in screenshot pixels (1280 × 800 space). */
export const PORTAL = {
  courier: COURIER.short,
  host: `claims.${COURIER.domain}`,
  formPath: "/claims/new",
  helpPath: "/claims/help",
  tracking: CLAIM.tracking,
  claimId: CLAIM.claimId,
  damage: "Damaged in transit",
  value: BRIGHTPOST.price.toFixed(2),
  /** Field centres and accessibility refs (Playwright MCP style, e followed by a number). */
  fields: {
    tracking: { label: "Tracking number", role: "textbox", ref: "e5", at: [420, 236] },
    damage: { label: "Damage type", role: "combobox", ref: "e7", at: [420, 318] },
    value: { label: "Claim value (£)", role: "textbox", ref: "e9", at: [420, 400] },
    submit: { label: "Submit claim", role: "button", ref: "e12", at: [812, 604] },
  },
  /** A cookie banner that slides in after the last screenshot and pushes the page down (the grounding failure). */
  bannerShift: 88,
} as const;

/** The submit button's centre on the real screen: [812, 604] ÷ 0.5 = [1624, 1208]. */
export const SUBMIT_REAL = PORTAL.fields.submit.at.map((v) => v / SCREEN.scale) as [number, number];
/** Where the button is after the banner: 604 + 88 = 692 (the old click lands 88 px above it). */
export const SUBMIT_AFTER_BANNER: [number, number] = [
  PORTAL.fields.submit.at[0],
  PORTAL.fields.submit.at[1] + PORTAL.bannerShift,
];

/**
 * Observation sizes for the same claim form, in tokens. Screenshot: SCREEN.sentTokens (from the docs' formula).
 * Accessibility tree and raw DOM: illustrative (every figure that shows them says so).
 */
export const OBSERVATION_TOKENS = {
  screenshot: SCREEN.sentTokens,
  tree: 600,
  dom: 15_000,
} as const;

/**
 * The worked example: one model call per row, one action per call, and a fresh screenshot returned with every
 * result. 9 actions + 1 final reply = 10 model calls. The support agent confirms before the submit click (row 8).
 */
export const CLAIM_RUN: readonly { action: string; sees: string }[] = [
  { action: "screenshot", sees: "The empty claim form" },
  { action: "left_click [420, 236]", sees: "Tracking number field focused" },
  { action: `type "${CLAIM.tracking}"`, sees: "Tracking number filled" },
  { action: "left_click [420, 318]", sees: "Damage type list open" },
  { action: "left_click [420, 352]", sees: `"Damaged in transit" chosen` },
  { action: "left_click [420, 400]", sees: "Claim value field focused" },
  { action: `type "${BRIGHTPOST.price.toFixed(2)}"`, sees: "£42.00 filled" },
  { action: "left_click [812, 604]", sees: "Support agent confirms; form sent" },
  { action: "screenshot", sees: `"Claim ${CLAIM.claimId} received"` },
];

/**
 * Screenshot tokens for the run when every screenshot stays in the context: call k carries k screenshots, so 10 calls
 * send 1 + 2 + … + 10 = 55 screenshots × 1,334 = 73,370 tokens. Keeping only the last 3 sends at most 3 per call:
 * 1 + 2 + 3 × 8 = 27 screenshots × 1,334 = 36,018 tokens.
 */
export const RUN_TOKENS = (() => {
  const calls = CLAIM_RUN.length + 1;
  const all = (calls * (calls + 1)) / 2;
  const keep3 = Array.from({ length: calls }, (_, i) => Math.min(i + 1, 3)).reduce((a, b) => a + b, 0);
  return {
    calls,
    allShots: all,
    allTokens: all * SCREEN.sentTokens,
    keep3Shots: keep3,
    keep3Tokens: keep3 * SCREEN.sentTokens,
  };
})();

/**
 * The web carrier for the indirect-injection builder (./agents-safety): a reply on the courier's public claims help
 * page, in white-on-white text, that the support agent's browser reads while it looks up how to claim. Labels stay
 * under ~30 characters to fit one lane gap.
 */
export const WEB_CARRIER: InjectionCarrier = {
  lane: "Courier site",
  icon: "browser",
  planted: `hidden text: "…refund ${BRIGHTPOST.injectedOrder}"`,
  call: `navigate("${PORTAL.helpPath}")`,
  request: `GET ${PORTAL.helpPath}`,
  returned: "page + hidden reply",
  result: "tool_result: page text",
};

/** The step 2 label the web version uses: the support agent now has a browser among its tools. */
export const WEB_TOOLS_LABEL = "message + tools + browser";
