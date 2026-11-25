import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY, QUICK_COST, RESEARCH, TRAFFIC } from "@/components/diagrams/presets/gcase-answer";
import { fmt } from "@/components/diagrams/presets/rag";

// Deep dive 3 of the answer-engine case study (design sheet §15.3, §5, §12): which signal sends a question down which
// route, and what each route costs. Numbers from presets/gcase-answer.ts:
//   quick: TRAFFIC.mix.quick = 80% of questions, QUICK_COST.total ≈ 0.0063 USD, LATENCY.ownP50 ≈ 1.35 s to the first
//   verified sentence (own-index path);
//   multi-hop: TRAFFIC.mix.multiHop = 5%, QUICK_COST.multiHop ≈ 0.026 USD, LATENCY.hopP50 ≈ 5.4 s (2 retrieval rounds);
//   research: RESEARCH.runShare ≈ 1.39% of questions (1% direct + 0.39% accepted offers after a low-confidence end);
//   tiers S (comparison, 2 subagents × 5 calls): 0.20 USD, 46 s, 10 searches; M (multi-part, 4 × 8): 0.56 USD, 71 s,
//   32 searches; L (report, 6 × 10): 1.04 USD, 101 s, 60 searches; caps per tier 150K / 600K / 1.2M tokens and
//   0.5 / 1 / 2 USD (RESEARCH.tiers) are backstops; average RESEARCH.avgCost ≈ 0.45 USD, RESEARCH.avgMs ≈ 63 s;
//   at doubled model prices the M tier hits its 1 USD cap (RESEARCH.doubled.M).
// Steps: 1 quick and multi-hop · 2 research tiers · 3 the offer path and the caps.
// Layout (880 wide): signals x 20 (250 wide), routes x 320 (230 wide), research tiers x 600 (260 wide); rows: quick
// 44, multi-hop 120, research lead 274 (between the tiers at 204 / 274 / 344); arrows signal → route → tier; footer.
// Tones (GENAI_TONE): signals orange (the question and the user's button), the planner's routes lime (a router
// decision), quick and multi-hop green (one model pass), the research lead and tiers green, caps red.

const H = 52;
const SIG = { x: 20, w: 250 } as const;
const ROUTE = { x: 320, w: 230 } as const;
const TIER = { x: 600, w: 260 } as const;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number
): LayoutShape => ({ id, type: "box", x, y, w, h: H, label, sub, tone, fill: "pastel", step });
const arrow = (id: string, from: string, to: string, step: number, dashed?: boolean): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  dashed,
});
const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 840,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const usd = (v: number, d = 2) => `${v.toFixed(d)} USD`;
const sec = (ms: number) => `${(ms / 1_000).toFixed(ms < 2_000 ? 2 : ms < 10_000 ? 1 : 0)} s`;
const k = (tokens: number) => (tokens >= 1_000_000 ? `${tokens / 1_000_000}M` : `${tokens / 1_000}K`);
const tiers = (["S", "M", "L"] as const).map((t) => ({ t, tier: RESEARCH.tiers[t], run: RESEARCH[t] }));
const TIER_Y = [204, 274, 344];
const LEAD_Y = 274;
const FOOT_Y = 420;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Escalate only when it pays: quick, multi-hop and three research tiers, each with its cost and time",
  width: 880,
  height: FOOT_Y + 66,
  steps: [
    { title: "One pass for most questions; two rounds for dependent hops" },
    { title: "Research in three tiers, set by the planner's label" },
    { title: "Offers after a low-confidence end; caps as backstops" },
  ],
  shapes: [
    { ...text("h-sig", 14, "Signal", 1), x: SIG.x, w: SIG.w },
    { ...text("h-route", 14, "Route", 1), x: ROUTE.x, w: ROUTE.w },
    { ...text("h-tier", 14, "Research tier", 2), x: TIER.x, w: TIER.w },

    box("s-quick", SIG.x, 44, SIG.w, "One fact, strong span agreement", "planner label", GENAI_TONE.user, 1),
    box(
      "r-quick",
      ROUTE.x,
      44,
      ROUTE.w,
      `Quick: ${pct(TRAFFIC.mix.quick)}`,
      `${usd(QUICK_COST.total, 4)} · ${sec(LATENCY.ownP50)}`,
      GENAI_TONE.model,
      1
    ),
    box("s-hop", SIG.x, 120, SIG.w, "Dependent hops", "the CEO of the company that bought X", GENAI_TONE.user, 1),
    box(
      "r-hop",
      ROUTE.x,
      120,
      ROUTE.w,
      `Multi-hop: ${pct(TRAFFIC.mix.multiHop)}`,
      `${usd(QUICK_COST.multiHop, 3)} · ${sec(LATENCY.hopP50)}`,
      GENAI_TONE.model,
      1
    ),
    arrow("a-quick", "s-quick", "r-quick", 1),
    arrow("a-hop", "s-hop", "r-hop", 1),

    box(
      "s-research",
      SIG.x,
      236,
      SIG.w,
      "≥ 3 parts, ≥ 3 entities, a report",
      "planner label, confident",
      GENAI_TONE.user,
      2
    ),
    box(
      "lead",
      ROUTE.x,
      LEAD_Y,
      ROUTE.w,
      `Research: ${pct(RESEARCH.runShare, 1)}`,
      `lead picks the tier · avg ${usd(RESEARCH.avgCost)}`,
      GENAI_TONE.model,
      2
    ),
    arrow("a-research", "s-research", "lead", 2),
    ...tiers.map(({ t, tier, run }, i) =>
      box(
        `tier-${t}`,
        TIER.x,
        TIER_Y[i],
        TIER.w,
        `${t}: ${tier.label.toLowerCase()}, ${tier.subagents} × ${tier.calls}`,
        `${usd(run.total)} · ${sec(run.ms)} · ${run.searches} searches`,
        GENAI_TONE.model,
        2
      )
    ),
    ...tiers.map(({ t }) => arrow(`a-tier-${t}`, "lead", `tier-${t}`, 2)),

    box("s-low", SIG.x, 312, SIG.w, "Low-confidence end, or the button", "an offer, within quota", GENAI_TONE.user, 3),
    arrow("a-low", "s-low", "lead", 3, true),
    text(
      "foot-1",
      FOOT_Y,
      `Caps per tier, backstops not targets: ${tiers.map(({ t, tier }) => `${t} ${k(tier.tokenCap)} tokens, ${tier.usdCap} USD`).join(" · ")}.`,
      3
    ),
    text(
      "foot-2",
      FOOT_Y + 22,
      `Same ranker and sentence checks on every route. At doubled model prices the M tier hits its ${fmt(RESEARCH.tiers.M.usdCap)} USD cap.`,
      3
    ),
  ],
};

export default spec;
