import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { ROUTING } from "@/components/diagrams/presets/production-routing";

// The cost-saving request path of Brightpost's assistant (cost-latency-optimization, Architecture figure). A question
// meets a response cache first; a miss goes to a router that sends the easy 70 % to a small model and the hard 30 % to
// a large one; a verifier checks the small model's draft and sends a failure to the large model; the answer streams
// back to the customer and is stored if it is reusable.
// Seven steps: 1 the question reaches the cache · 2 a hit returns the stored answer · 3 a miss goes to the router ·
// 4 the router splits easy and hard (two models appear) · 5 the small model's draft goes to the verifier · 6 a failed
// check escalates to the large model · 7 the answer streams back and is stored. Nodes never move.
//
// Numbers: 70 % easy and 30 % hard come from ROUTING (presets/production-routing.ts, illustrative); no cache hit rate
// is drawn because Brightpost has not measured one.
//
// Fact checks: cascades with a scoring function that decides whether to accept a cheap model's answer (FrugalGPT,
// Chen, Zaharia and Zou, arXiv 2305.05176: up to 98 % lower cost at the accuracy of the best single model); routers
// that choose between a strong and a weak model (RouteLLM, Ong et al., arXiv 2406.18665: over 2x lower cost in some
// cases without losing quality). Both checked November 2026.
//
// Layout (880 x 470): main row y 190: customers (glyph, x 40), cache (x 215), router (x 405). Models at x 600: small
// y 100, large y 300. Verifier (x 790, y 100) right of small; answer (x 790, y 300) right of large. The cache hit edge
// runs over the top (y 45); the store edge runs under the models (y 365) back into the cache; the stream edge leaves
// the answer on the right and runs under everything (y 430) to the customers.
// Colour (four tones plus neutral): customers orange (traffic); cache violet (a store); models and answer green; the
// verifier lime (a check); the router is neutral (control) and the one accent.

const ROW = { top: 100, mid: 190, low: 300 } as const;
const COL = { client: 40, cache: 215, router: 405, model: 600, end: 790 } as const;

const spec: DiagramSpec = {
  title: "The cost-saving request path: cache, router, small or large model, verifier",
  width: 880,
  height: 470,
  steps: [
    { title: "A question reaches the response cache" },
    { title: "A hit returns the stored answer" },
    { title: "A miss goes to the router" },
    { title: "The router splits easy from hard" },
    { title: "The verifier checks the small model's draft" },
    { title: "A failed check escalates to the large model" },
    { title: "The answer streams back and is stored" },
  ],
  zones: [],
  nodes: [
    {
      id: "customers",
      label: "Customers",
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: COL.client,
      y: ROW.mid,
    },
    {
      id: "cache",
      label: "Cache",
      sub: "exact + semantic",
      icon: "cache",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: COL.cache,
      y: ROW.mid,
      w: 150,
    },
    {
      id: "router",
      label: "Router",
      sub: "easy or hard?",
      icon: "router",
      tone: PROD_TONE.infra,
      accent: true,
      step: 3,
      x: COL.router,
      y: ROW.mid,
      w: 130,
    },
    {
      id: "small",
      label: "Small model",
      sub: "a tenth the price",
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 4,
      x: COL.model,
      y: ROW.top,
      w: 150,
    },
    {
      id: "large",
      label: "Large model",
      sub: "full price",
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 4,
      x: COL.model,
      y: ROW.low,
      w: 150,
    },
    {
      id: "verifier",
      label: "Verifier",
      sub: "good enough?",
      icon: "shield",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 5,
      x: COL.end,
      y: ROW.top,
      w: 136,
    },
    {
      id: "answer",
      label: "Answer",
      sub: "streamed",
      icon: "chat",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 7,
      x: COL.end,
      y: ROW.low,
      w: 130,
    },
  ],
  edges: [
    // Step 1: the question.
    { from: "customers", to: "cache", label: "ask", packet: true },

    // Step 2: a hit goes straight back over the top.
    {
      from: "cache",
      to: "customers",
      label: "hit: stored answer",
      dashed: true,
      flow: true,
      via: [
        [COL.cache, 45],
        [COL.client, 45],
      ],
      step: 2,
    },

    // Step 3: a miss goes to the router.
    { from: "cache", to: "router", label: "miss", packet: true, step: 3 },

    // Step 4: the router sends 70 % to the small model and 30 % to the large one.
    {
      from: "router",
      to: "small",
      label: `easy ${Math.round(ROUTING.easyShare * 100)} %`,
      packet: true,
      via: [[497, ROW.top]],
      labelAt: 0.8,
      step: 4,
    },
    {
      from: "router",
      to: "large",
      label: `hard ${Math.round((1 - ROUTING.easyShare) * 100)} %`,
      packet: true,
      via: [[497, ROW.low]],
      labelAt: 0.8,
      step: 4,
    },

    // Step 5: the small model's draft goes to the verifier.
    { from: "small", to: "verifier", label: "draft", packet: true, step: 5 },

    // Step 6: a draft that fails the check goes to the large model.
    {
      from: "verifier",
      to: "large",
      label: "fails: escalate",
      dashed: true,
      flow: true,
      via: [
        [705, 200],
        [COL.model, 200],
      ],
      labelAt: 0.45,
      step: 6,
    },

    // Step 7: a draft that passes, or the large model's answer, streams back; reusable answers are stored.
    { from: "verifier", to: "answer", label: "passes", packet: true, step: 7 },
    { from: "large", to: "answer", label: "answer", packet: true, step: 7 },
    {
      from: "answer",
      to: "cache",
      label: "store if reusable",
      dashed: true,
      flow: true,
      via: [
        [COL.end, 365],
        [COL.cache, 365],
      ],
      labelAt: 0.5,
      step: 7,
    },
    {
      from: "answer",
      to: "customers",
      label: "stream",
      packet: true,
      via: [
        [872, ROW.low],
        [872, 430],
        [COL.client, 430],
      ],
      labelAt: 0.62,
      step: 7,
    },
  ],
};

export default spec;
