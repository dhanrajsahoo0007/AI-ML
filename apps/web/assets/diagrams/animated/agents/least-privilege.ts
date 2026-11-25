import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";
import { BROAD_KEY, SCOPED_TOKENS, TOKEN_TTL_MIN } from "@/components/diagrams/presets/agents-security";

// Least privilege for the Brightpost agent (agent-security-and-sandboxing, Core concepts "Least privilege and scoped
// credentials"). Left: one broad service key that every tool shares; it reaches every customer, every action and
// never expires. Right: one scoped, short-lived token per tool, each limited to the signed-in customer (1847), one
// action and 15 minutes (illustrative); search_help reads public articles and holds no secret at all. Bottom: the same
// injected call, create_refund(5122, …), against both. The broad key lets it run; the scoped token refuses it,
// because order 5122 is not customer 1847's.
//
// Three steps: 1 one key for everything · 2 one scoped token per tool · 3 the same injected call against both.
//
// Layout: two panels (groups) x 20–430 and x 450–860, y 40–340. Left: the key (x 40, w 190, centred on y 199) with
// arrows fanning to four tool boxes (x 280, w 130) at rows y 80, 145, 210, 275. Right: each row is a token box
// (x 465, w 245) and an arrow to its tool box (x 730, w 115), on the same rows. Bottom: a line of text naming the
// injected call (y 360) and one outcome box under each panel (y 400).
//
// Colour (agents legend, three tones plus neutral): tools teal, scoped tokens lime (each one is a check), the broad
// key and the token-free row neutral, the outcome the broad key allows red. Arrows neutral.

const ROWS = [80, 145, 210, 275] as const;
const ROW_H = 48;
const TOOL_ORDER = [TOOLS.getOrder.name, TOOLS.createRefund.name, TOOLS.sendEmail.name, TOOLS.searchHelp.name];

const toolBox = (id: string, x: number, w: number, y: number, name: string, step: number): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h: ROW_H,
  label: name,
  tone: AGENT_TONE.action,
  fill: "pastel",
  step,
});

const left: LayoutShape[] = [
  {
    id: "key",
    type: "box",
    x: 40,
    y: 161,
    w: 190,
    h: 76,
    label: `${BROAD_KEY.label}\nnever expires`,
    sub: "all customers, all actions",
    tone: AGENT_TONE.infra,
    fill: "soft",
  },
  ...TOOL_ORDER.flatMap((name, i): LayoutShape[] => [
    toolBox(`l-tool-${i}`, 280, 130, ROWS[i], name, 1),
    { id: `l-arrow-${i}`, type: "arrow", x: 0, y: 0, from: "key", to: `l-tool-${i}` },
  ]),
];

const right: LayoutShape[] = SCOPED_TOKENS.flatMap((t, i): LayoutShape[] => [
  {
    id: `token-${i}`,
    type: "box",
    x: 465,
    y: ROWS[i],
    w: 245,
    h: ROW_H,
    label: t.scope,
    sub: t.limit,
    tone: t.scope === "no secret" ? AGENT_TONE.infra : AGENT_TONE.check,
    fill: t.scope === "no secret" ? "soft" : "pastel",
    step: 2,
  },
  toolBox(`r-tool-${i}`, 730, 115, ROWS[i], t.tool, 2),
  { id: `r-arrow-${i}`, type: "arrow", x: 0, y: 0, from: `token-${i}`, to: `r-tool-${i}`, step: 2 },
]);

const outcome: LayoutShape[] = [
  {
    id: "injected",
    type: "text",
    x: 20,
    y: 356,
    w: 840,
    h: 28,
    label: `A fooled model asks for ${TOOLS.createRefund.name}(${BRIGHTPOST.injectedOrder}, …)`,
    step: 3,
    quiet: true,
  },
  {
    id: "broad-result",
    type: "box",
    x: 20,
    y: 396,
    w: 410,
    h: 56,
    label: `Runs: the key reaches order ${BRIGHTPOST.injectedOrder}`,
    sub: "and every customer's address",
    tone: AGENT_TONE.failure,
    fill: "pastel",
    step: 3,
  },
  {
    id: "scoped-result",
    type: "box",
    x: 450,
    y: 396,
    w: 410,
    h: 56,
    label: `Refused: ${BRIGHTPOST.injectedOrder} is not ${BRIGHTPOST.customerId}'s order`,
    sub: `and the token expires in ${TOKEN_TTL_MIN} minutes`,
    tone: AGENT_TONE.check,
    fill: "pastel",
    step: 3,
    highlight: true,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Least privilege: one broad key against one scoped token per tool",
  width: 880,
  height: 470,
  steps: [
    { title: "One key for everything" },
    { title: "One scoped, short-lived token per tool" },
    { title: "The same injected call against both" },
  ],
  groups: [
    { id: "g-broad", title: "One broad credential", tone: AGENT_TONE.infra, x: 20, y: 40, w: 410, h: 300 },
    { id: "g-scoped", title: "A scoped token per tool", tone: AGENT_TONE.check, x: 450, y: 40, w: 410, h: 300 },
  ],
  shapes: [...left, ...right, ...outcome],
};

export default spec;
