// Constants and arithmetic for the "Design a Content Moderation System" case study (/genai-system-design/case-studies/
// content-moderation-system; design sheet SYSTEM-DESIGN/plans/genai-design/design/content-moderation-system.md v1,
// dossier research/content-moderation-system.md, cited as "dossier F12"). Specs in assets/diagrams/animated/moderation/
// import from here, so the page, the figures and the tests share one set of numbers.
//
// This page is NOT Brightpost. It defines its own illustrative platform, KESTREL: a public community app with posts,
// comments and images, 40M daily users in five markets. Every volume, base rate, score separation, error rate, cost of
// an error, handle time and latency below is ILLUSTRATIVE unless a comment names a source. No platform publishes the
// share of traffic per tier or per-stage latency (dossier §11), so those are illustrative by necessity.
//
// Prices: model list prices as of November 2026 are imported from gcase-answer.ts `PRICES` (one price, one value across
// the site): small (Claude Haiku 5.5 class) 0.10 input / 0.01 cache read / 0.125 cache write / 0.50 output USD per
// million tokens; mid (Claude Sonnet 5.5 class) 2.00 / 0.10 / 2.50 / 10.00; minimum cacheable prefix 512 tokens. Image
// tokens = ceil(w ÷ 28) × ceil(h ÷ 28) (dossier F45). gpt-oss-safeguard-20b 0.07 / 0.20 (Bedrock) and 0.075 / 0.30
// (Groq) USD per million, read 22 November 2026 (F41), used only for the rejected alternative.
//
// Statistics: intervals, never p-values. Binomial intervals are Wilson 95% (F28). Every "≈" in the sheet is a rounded
// value of a number computed here.

import { PRICES as MODEL } from "./gcase-answer";

const usd = (tokens: number, perMillion: number) => (tokens * perMillion) / 1_000_000;
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const prod = (xs: readonly number[]) => xs.reduce((p, x) => p * x, 1);
const logit = (p: number) => Math.log(p / (1 - p));

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error < 1.5e-7). */
function phi(z: number) {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
/** Find x in [lo, hi] where an increasing f(x) reaches target. */
function bisect(f: (x: number) => number, target: number, lo: number, hi: number) {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const Z95 = bisect(phi, 0.95, -8, 8); // 1.645 (one-sided)
const Z975 = bisect(phi, 0.975, -8, 8); // 1.960 (two-sided 95%)

/** Wilson 95% interval for k successes in n. */
export function wilson(k: number, n: number) {
  const p = k / n;
  const z = Z975;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return { p, lo: centre - half, hi: centre + half };
}

/** A stage's latency (ms), fitted as a log-normal to its p50 and p95. */
type Stage = { p50: number; p95: number };
const lnCdf = (s: Stage) => (t: number) =>
  t <= 0 ? 0 : phi((Math.log(t) - Math.log(s.p50)) / ((Math.log(s.p95) - Math.log(s.p50)) / Z95));
/** Quantile q of the maximum of independent parallel stages: solve Π F_i(t) = q. */
export function maxOf(stages: readonly Stage[], q: number) {
  return bisect((t) => prod(stages.map((s) => lnCdf(s)(t))), q, 0.01, 10_000_000);
}
const par = (xs: Stage[]): Stage => ({ p50: maxOf(xs, 0.5), p95: maxOf(xs, 0.95) });
/** A serial path: p50s add; the p95 is the sum of stage p95s, a conservative estimate (quantiles do not add). */
const path = (stages: Stage[]) => ({
  p50: sum(stages.map((s) => s.p50)),
  p95: sum(stages.map((s) => s.p95)),
});

// ── The platform (illustrative) ──────────────────────────────────────────────────────────────────────────────────

/**
 * Kestrel, a day. Text units: 20M posts + 100M comments + 5M edits (an edit is re-checked) = 125M. Image units: 40% of
 * posts carry images, 1.5 on average (12M), and 3% of comments carry one (3M) = 15M. Views: 40M daily users × 150 item
 * views = 6.0B a day, ≈ 48 views per text unit on average. Peak = 2.5 × the daily mean rate.
 */
export const PLATFORM = (() => {
  const dau = 40_000_000;
  const posts = 20_000_000;
  const comments = 100_000_000;
  const edits = 5_000_000;
  const text = posts + comments + edits; // 125M
  const images = posts * 0.4 * 1.5 + comments * 0.03; // 12M + 3M = 15M
  const views = dau * 150; // 6.0B
  const peakFactor = 2.5;
  const reports = 2_000_000; // user reports a day
  const reportedItems = 1_200_000; // distinct items reported (≈ 1.7 reports each)
  const trustedFlaggerNotices = 2_000; // EU (DSA Art. 22) and UK equivalents
  return {
    dau,
    posts,
    comments,
    edits,
    text,
    images,
    views,
    viewsPerUnit: views / text, // 48
    peakFactor,
    textPerSecond: text / 86_400, // ≈ 1,447
    textPeakPerSecond: (text / 86_400) * peakFactor, // ≈ 3,617
    imagesPerSecond: images / 86_400, // ≈ 174
    imagesPeakPerSecond: (images / 86_400) * peakFactor, // ≈ 434
    reports,
    reportedItems,
    trustedFlaggerNotices,
  };
})();

/** Markets: share of units, and multipliers on the cost of each error where local law or audience changes it. */
export const MARKETS = [
  { id: "EU", share: 0.3 },
  { id: "UK", share: 0.08 },
  { id: "US", share: 0.25 },
  { id: "IN", share: 0.22 },
  { id: "ROW", share: 0.15 },
] as const;
export type MarketId = (typeof MARKETS)[number]["id"];

// ── Harm families and the cascade (sheet §5, §13, deep dive 1) ───────────────────────────────────────────────────

/**
 * Six harm families, in severity order. For each stream (text, image):
 *   rate  share of units that violate the family's policy (illustrative; spam dominates, as on Reddit, F33);
 *   d     the small classifier's separation: scores of fine units ~ N(0, 1), of violating units ~ N(d, 1) (binormal
 *         ROC; AUC = Φ(d ÷ √2)); the classifier is calibrated, so a score s maps to a probability
 *         logit p(s) = logit(rate) + d·s − d²/2;
 *   hash  share of violating units caught first by hash match or exact rules (known images, banned URLs, exact text).
 * Costs of an error, in illustrative USD-equivalent "harm units" (no platform publishes them; dossier §11): cfp = a
 * wrong action on fine content (the user's loss, an appeal, trust); cfn = a missed violation over the views it gets.
 * Market multipliers change them where local law or audience does: hate is illegal in more cases in the EU (×2 on a
 * miss) and is a priority offence area in the UK and India (×1.5); a wrong hate removal costs more in the US (×1.5,
 * speech norms); graphic content in the UK carries the children's codes (×1.5 on a miss).
 * Severity 0–1 families never take a final automated action: the automated step is a reversible hold, and a person
 * decides (hold = out of view until decided). Severity 2–3 families take final automated actions, with appeal.
 * CSEA never goes to the external model (dossier F35; the image is evidence and must stay in the vault): its band goes
 * straight to specialists.
 * llm: the policy-reading model's errors on band units (measured on the gold set; illustrative): fpr on fine units,
 * fnr on violating ones, and the share it sends to a person (low confidence, or the policy says escalate).
 */
export const FAMILIES = [
  {
    id: "csea",
    name: "Child sexual exploitation",
    sev: 0,
    text: null,
    image: { rate: 5e-6, d: 4.5, hash: 0.6 },
    cfp: 50,
    cfn: 20_000,
    llm: null,
    pLo: 0.002, // = tau: for CSEA the specialists are staffed to the cost rule, so nothing the rule says to act on is allowed
    pHi: 0.5, // above: removed from view at once (hold) and reviewed first
  },
  {
    id: "terror",
    name: "Terrorism and violent extremism",
    sev: 0,
    text: { rate: 2e-5, d: 4.0, hash: 0.2 },
    image: { rate: 2e-5, d: 4.0, hash: 0.4 },
    cfp: 20,
    cfn: 2_000,
    llm: { fpr: 0.02, fnr: 0.06, escalate: 0.03, model: "small" as const },
    pLo: 0.003,
    pHi: 0.5,
  },
  {
    id: "safety",
    name: "Threats and self-harm",
    sev: 1,
    text: { rate: 2e-4, d: 3.6, hash: 0 },
    image: { rate: 2e-5, d: 3.0, hash: 0 },
    cfp: 5,
    cfn: 400,
    llm: { fpr: 0.02, fnr: 0.06, escalate: 0.02, model: "mid" as const },
    pLo: 0.005, // capacity-set (SAFETY_CURVE): hiring and training, not the cost rule, stop it lower
    pHi: 0.5,
  },
  {
    id: "hate",
    name: "Hate and harassment",
    sev: 2,
    text: { rate: 2e-3, d: 3.3, hash: 0.02 },
    image: { rate: 5e-4, d: 3.0, hash: 0.05 },
    cfp: 8,
    cfn: 6,
    llm: { fpr: 0.03, fnr: 0.08, escalate: 0.03, model: "small" as const },
    pLo: null,
    pHi: null,
  },
  {
    id: "graphic",
    name: "Adult nudity and graphic violence",
    sev: 2,
    text: null,
    image: { rate: 6e-3, d: 3.6, hash: 0.15 },
    cfp: 3,
    cfn: 4,
    llm: { fpr: 0.02, fnr: 0.05, escalate: 0.03, model: "small" as const },
    pLo: null,
    pHi: null,
  },
  {
    id: "spam",
    name: "Spam and scams",
    sev: 3,
    text: { rate: 8e-3, d: 3.6, hash: 0.5 },
    image: { rate: 2e-3, d: 3.6, hash: 0.4 },
    cfp: 1,
    cfn: 0.5,
    llm: { fpr: 0.03, fnr: 0.06, escalate: 0.01, model: "small" as const },
    pLo: null,
    pHi: null,
  },
] as const;
export type FamilyId = (typeof FAMILIES)[number]["id"];
type Stream = { readonly rate: number; readonly d: number; readonly hash: number } | null;
type Family = {
  readonly id: FamilyId;
  readonly name: string;
  readonly sev: number;
  readonly text: Stream;
  readonly image: Stream;
  readonly cfp: number;
  readonly cfn: number;
  readonly llm: {
    readonly fpr: number;
    readonly fnr: number;
    readonly escalate: number;
    readonly model: "small" | "mid";
  } | null;
  readonly pLo: number | null;
  readonly pHi: number | null;
};

const CFN_BY: Partial<Record<FamilyId, Partial<Record<MarketId, number>>>> = {
  hate: { EU: 2, UK: 1.5, IN: 1.5 },
  graphic: { UK: 1.5 },
};
const CFP_BY: Partial<Record<FamilyId, Partial<Record<MarketId, number>>>> = {
  hate: { US: 1.5 },
};

/** People's errors on what they decide (illustrative, measured by double review): general reviewers, specialists, and
 * CSEA, where a second specialist confirms every report (two-person rule), so a wrong report is rare (0.02%). */
export const HUMAN = { fpr: 0.02, fnr: 0.04, specialistFpr: 0.01, specialistFnr: 0.02, cseaFpr: 0.0002 } as const;
/** Share of a unit's views seen before the action, by who acted (illustrative). Band units stay out of
 * recommendations and search until decided, so few views happen while they wait. */
export const EXPOSURE = { prePublish: 0, model: 0.01, person: 0.05, missed: 1 } as const;
/** Of hash hits on CSEA, the share that are exact matches of a vetted list (removed at once; a specialist signs off the
 * report on the match record without opening the image, seconds each, not counted in hours; the report says "not
 * viewed"); the rest are perceptual matches a specialist views and confirms. Illustrative. */
export const CSEA_EXACT_SHARE = 0.5;

/**
 * Thresholds per family and market (sheet §13, deep dive 1). All in calibrated probability.
 *   tau = cfp ÷ (cfp + cfn): the decider's threshold. Act when P(violates) ≥ tau. The model and people apply it to
 *         their own judgement; the classifier applies it only outside the band.
 *   For severity 2–3 (final automated actions), the band is where a check pays for itself, given that the checker
 *   also errs. Allow blind below pLo, where p·cfn·(1 − fnr) = (1 − p)·fpr·cfp + c; act blind above pHi, where
 *   (1 − p)·cfp·(1 − fpr) = p·fnr·cfn + c; c = one model call (≈ 0.0001 USD, negligible next to the harm units).
 *   For severity 0–1 the cost rule would send nearly everything (a miss costs 80–400× a false alarm), so the lower edge
 *   is set by reviewer capacity (pLo in FAMILIES) and the upper edge is the hold line.
 */
function edges(f: Family, m: MarketId, c = 0.0001) {
  const cfn = f.cfn * (CFN_BY[f.id]?.[m] ?? 1);
  const cfp = f.cfp * (CFP_BY[f.id]?.[m] ?? 1);
  const tau = cfp / (cfp + cfn);
  if (f.pLo !== null && f.pHi !== null) return { cfp, cfn, tau, pLo: f.pLo, pHi: f.pHi };
  const { fpr, fnr } = f.llm!;
  const pLo = (fpr * cfp + c) / (cfn * (1 - fnr) + fpr * cfp);
  const pHi = (cfp * (1 - fpr) - c) / (cfp * (1 - fpr) + fnr * cfn);
  return { cfp, cfn, tau, pLo, pHi };
}
/** The score at which the calibrated probability reaches p. */
const scoreAt = (p: number, rate: number, d: number) => (logit(p) - logit(rate) + (d * d) / 2) / d;

type Flow = {
  units: number;
  violating: number;
  hash: number;
  hashExact: number;
  autoAct: { tp: number; fp: number }; // final removal (sev 2–3) or hold (sev 0–1)
  band: { tp: number; fp: number; total: number };
  toModel: number;
  modelDecided: { tp: number; fp: number; fn: number };
  toPeople: number;
  peopleDecided: { tp: number; fp: number; fn: number };
  allowedViolating: number; // missed at the classifier (below pLo)
  actionedTp: number;
  actionedFp: number;
  missed: number;
  missedViews: number;
  actionedViews: number; // views of violating units before they were actioned
};

function flow(f: Family, stream: "text" | "image", m: MarketId, share: number): Flow | null {
  const s = f[stream];
  if (!s) return null;
  const units = (stream === "text" ? PLATFORM.text : PLATFORM.images) * share;
  const v = units * s.rate;
  const g = units - v;
  const hash = v * s.hash;
  const v1 = v - hash;
  const e = edges(f, m);
  const sLo = scoreAt(e.pLo, s.rate, s.d);
  const sHi = scoreAt(e.pHi, s.rate, s.d);
  const allowV = v1 * phi(sLo - s.d);
  const actV = v1 * (1 - phi(sHi - s.d));
  const actG = g * (1 - phi(sHi));
  const bandV = v1 - allowV - actV;
  const bandG = g - g * phi(sLo) - actG;
  const specialist = f.sev === 0;
  const hFpr = f.id === "csea" ? HUMAN.cseaFpr : specialist ? HUMAN.specialistFpr : HUMAN.fpr;
  const hFnr = specialist ? HUMAN.specialistFnr : HUMAN.fnr;
  const V = PLATFORM.viewsPerUnit;
  let toModel = 0;
  const model = { tp: 0, fp: 0, fn: 0 };
  let toPeopleV = 0;
  let toPeopleG = 0;
  let autoTp = 0;
  let autoFp = 0;
  if (f.sev >= 2) {
    // Final automated action above pHi; the band goes to the model; the model escalates a share to people.
    const { fpr, fnr, escalate } = f.llm!;
    autoTp = actV;
    autoFp = actG;
    toModel = bandV + bandG;
    model.tp = bandV * (1 - escalate) * (1 - fnr);
    model.fn = bandV * (1 - escalate) * fnr;
    model.fp = bandG * (1 - escalate) * fpr;
    toPeopleV = bandV * escalate;
    toPeopleG = bandG * escalate;
  } else {
    // Hold above pHi and a person decides; the band goes to the model (not CSEA) and every model positive or
    // escalation goes to a person; the model's negatives are allowed.
    toPeopleV += actV;
    toPeopleG += actG;
    if (f.llm) {
      const { fpr, fnr, escalate } = f.llm;
      toModel = bandV + bandG;
      model.fn = bandV * (1 - escalate) * fnr;
      toPeopleV += bandV * ((1 - escalate) * (1 - fnr) + escalate);
      toPeopleG += bandG * ((1 - escalate) * fpr + escalate);
    } else {
      toPeopleV += bandV;
      toPeopleG += bandG;
    }
  }
  const hashExact = f.id === "csea" ? hash * CSEA_EXACT_SHARE : f.sev === 0 ? 0 : hash;
  // Hash hits that are not exact vetted matches go to specialists (CSEA perceptual matches; every terrorism match).
  const hashToPeople = hash - hashExact;
  const people = {
    tp: (toPeopleV + hashToPeople) * (1 - hFnr),
    fn: (toPeopleV + hashToPeople) * hFnr,
    fp: toPeopleG * hFpr,
  };
  const actionedTp = hashExact + autoTp + model.tp + people.tp;
  const actionedFp = autoFp + model.fp + people.fp;
  const missed = allowV + model.fn + people.fn;
  const actionedViews =
    (hashExact + autoTp + (f.sev < 2 ? actV : 0)) * V * EXPOSURE.prePublish +
    model.tp * V * EXPOSURE.model +
    (people.tp - (f.sev < 2 ? actV * (1 - hFnr) : 0)) * V * EXPOSURE.person;
  return {
    units,
    violating: v,
    hash,
    hashExact,
    autoAct: { tp: f.sev >= 2 ? actV : actV, fp: actG },
    band: { tp: bandV, fp: bandG, total: bandV + bandG },
    toModel,
    modelDecided: model,
    toPeople: toPeopleV + toPeopleG + hashToPeople,
    peopleDecided: people,
    allowedViolating: allowV,
    actionedTp,
    actionedFp,
    missed,
    missedViews: missed * V * EXPOSURE.missed,
    actionedViews,
  };
}

const addFlows = (xs: (Flow | null)[]) => {
  const fs = xs.filter((x): x is Flow => x !== null);
  const k = <K extends keyof Flow>(key: K) => sum(fs.map((x) => x[key] as number));
  return {
    units: k("units"),
    violating: k("violating"),
    hash: k("hash"),
    hashExact: k("hashExact"),
    autoActTp: sum(fs.map((x) => x.autoAct.tp)),
    autoActFp: sum(fs.map((x) => x.autoAct.fp)),
    band: sum(fs.map((x) => x.band.total)),
    toModel: k("toModel"),
    toPeople: k("toPeople"),
    modelTp: sum(fs.map((x) => x.modelDecided.tp)),
    modelFp: sum(fs.map((x) => x.modelDecided.fp)),
    modelFn: sum(fs.map((x) => x.modelDecided.fn)),
    peopleTp: sum(fs.map((x) => x.peopleDecided.tp)),
    peopleFp: sum(fs.map((x) => x.peopleDecided.fp)),
    actionedTp: k("actionedTp"),
    actionedFp: k("actionedFp"),
    missed: k("missed"),
    missedViews: k("missedViews"),
    actionedViews: k("actionedViews"),
  };
};

const escalateOf = (id: FamilyId) => FAMILIES.find((f) => f.id === id)!.llm?.escalate ?? 0;

/** Thresholds table: every family × market (figure moderation/thresholds). */
export const THRESHOLDS = FAMILIES.map((f) => ({
  id: f.id,
  markets: MARKETS.map((m) => ({ market: m.id, ...edges(f, m.id) })),
}));

/** The cascade per family and stream, summed over markets (a day). */
export const CASCADE = (() => {
  const per = FAMILIES.map((f) => {
    const byStream = (stream: "text" | "image") => addFlows(MARKETS.map((m) => flow(f, stream, m.id, m.share)));
    const text = byStream("text");
    const image = byStream("image");
    const all = addFlows(MARKETS.flatMap((m) => [flow(f, "text", m.id, m.share), flow(f, "image", m.id, m.share)]));
    return {
      id: f.id,
      sev: f.sev,
      model: f.llm?.model ?? null,
      text,
      image,
      all,
      precision: all.actionedTp / (all.actionedTp + all.actionedFp),
      recall: all.actionedTp / all.violating,
      modelActions: all.modelTp + all.modelFp,
      prevalence: (all.missedViews + all.actionedViews) / PLATFORM.views,
    };
  });
  const tot = (pick: (x: (typeof per)[number]) => number) => sum(per.map(pick));
  return {
    per,
    toModelText: tot((x) => x.text.toModel),
    toModelImage: tot((x) => x.image.toModel),
    toModel: tot((x) => x.all.toModel),
    toPeople: tot((x) => x.all.toPeople),
    actionedTp: tot((x) => x.all.actionedTp),
    actionedFp: tot((x) => x.all.actionedFp),
    hash: tot((x) => x.all.hash),
    autoAct: tot((x) => x.all.autoActTp + x.all.autoActFp),
  };
})();

// ── User reports, trusted flaggers and appeals (sheet §5, §14) ───────────────────────────────────────────────────

/**
 * Reports: 1.2M distinct reported units a day, 12% violating (illustrative). A reported unit already actioned is closed
 * at once (20%); the rest go to the policy model with the report as context (a DSA Art. 16 notice when the reporter is in
 * the EU), and 2% are escalated to a person. Trusted-flagger notices (2,000 a day) always go to a person, first in line.
 * Appeals: 25% of wrong actions are appealed, 2% of right ones (0.5% for spam); every appeal is decided by a person who
 * did not make the first decision (DSA Art. 20(6): not solely automated, F10). An appeal overturns when the person
 * finds the content fine: appealed wrong actions are overturned (1 − fpr) of the time and appealed right ones fnr.
 */
export const REPORTS = (() => {
  const items = PLATFORM.reportedItems;
  const alreadyActioned = 0.2;
  const toModel = items * (1 - alreadyActioned); // 960,000
  const escalate = 0.02;
  const toPeople = toModel * escalate + PLATFORM.trustedFlaggerNotices; // 19,200 + 2,000
  return { items, violatingShare: 0.12, alreadyActioned, toModel, escalate, toPeople };
})();

export const APPEALS = (() => {
  const appealWrong = 0.25;
  const appealRight = (id: FamilyId) => (id === "spam" ? 0.005 : 0.02);
  const per = CASCADE.per.map((p) => {
    const wrong = p.all.actionedFp * appealWrong;
    const right = p.all.actionedTp * appealRight(p.id);
    const overturned = wrong * (1 - HUMAN.fpr) + right * HUMAN.fnr;
    return { id: p.id, appeals: wrong + right, overturned, overturnRate: overturned / (wrong + right) };
  });
  const appeals = sum(per.map((x) => x.appeals));
  const overturned = sum(per.map((x) => x.overturned));
  return { appealWrong, per, appeals, overturned, overturnRate: overturned / appeals };
})();

// ── The policy-reading model's prompt and its price (sheet §11) ──────────────────────────────────────────────────

/**
 * One call reads ONE family's policy (multi-policy accuracy is below 53% for every model OpenAI tested, F17; adding
 * policies costs accuracy, F19). The stable prefix (instructions, the family's policy, the market's addendum, boundary
 * examples) is cached per (family, market, model): 1,100 tokens ≥ the 512 minimum. Everything about the unit comes
 * after it. Output is a fixed JSON object, no free-text essay; no extended thinking, so no hidden reasoning tokens.
 */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions and output schema", tokens: 200, stable: true },
    {
      id: "policy",
      label: "The family's policy: definitions, criteria, precedence, escalation",
      tokens: 550,
      stable: true,
    },
    { id: "market", label: "Market addendum (legal grounds, local terms)", tokens: 100, stable: true },
    { id: "examples", label: "Five boundary examples with labels", tokens: 250, stable: true },
    { id: "content", label: "The unit: normalised and original text", tokens: 120, stable: false },
    { id: "thread", label: "Thread: parent post and two previous comments, truncated", tokens: 150, stable: false },
    {
      id: "signals",
      label: "Signals: classifier scores, account age, strikes, report reason",
      tokens: 80,
      stable: false,
    },
    { id: "reminder", label: "Output reminder", tokens: 30, stable: false },
  ] as const;
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 1,100
  const changing = sum(blocks.filter((b) => !b.stable).map((b) => b.tokens)); // 380
  const image = Math.ceil(768 / 28) * Math.ceil(768 / 28); // 28 × 28 = 784 (a 768 × 768 copy)
  const output = 90; // { violates, rule_id, severity, confidence, rationale ≤ 2 sentences }
  return {
    blocks,
    stable,
    changing,
    image,
    output,
    total: stable + changing,
    totalWithImage: stable + changing + image,
  };
})();

const callCost = (p: { input: number; cached: number; output: number }, image: boolean) =>
  usd(CONTEXT.stable, p.cached) +
  usd(CONTEXT.changing + (image ? CONTEXT.image : 0), p.input) +
  usd(CONTEXT.output, p.output);

/** USD per call: small text ≈ 0.000094, small image ≈ 0.000172, mid text ≈ 0.00177, mid image ≈ 0.00334. */
export const UNIT = {
  smallText: callCost(MODEL.small, false), // 0.000011 + 0.000038 + 0.000045
  smallImage: callCost(MODEL.small, true), // + 784 × 0.10 per million
  midText: callCost(MODEL.mid, false), // 0.00011 + 0.00076 + 0.0009
  midImage: callCost(MODEL.mid, true),
  // gpt-oss-safeguard-20b on Bedrock (F41): no cache discount assumed, ≈ 200 reasoning tokens at low effort.
  safeguardText: usd(CONTEXT.total, 0.07) + usd(CONTEXT.output + 200, 0.2),
  // Prefixes: 6 families × 5 markets, ≤ 2 models, rewritten once per 5-minute TTL at most: 288 writes a day each.
  cacheWritesPerDay: 6 * 5 * 2 * 288 * usd(CONTEXT.stable, MODEL.mid.cacheWrite - MODEL.mid.cached),
};

/** Model calls a day and their cost (the cascade's band + reports; safety goes to the mid model). */
export const LLM = (() => {
  const calls = CASCADE.per.map((p) => {
    const mid = p.model === "mid";
    const text = p.text.toModel;
    const image = p.image.toModel;
    const cost = mid ? text * UNIT.midText + image * UNIT.midImage : text * UNIT.smallText + image * UNIT.smallImage;
    return { id: p.id, model: p.model, text, image, cost };
  });
  const reports = REPORTS.toModel * (0.85 * UNIT.smallText + 0.15 * UNIT.smallImage); // 15% of reported units have images
  const perDay = sum(calls.map((c) => c.cost)) + reports + UNIT.cacheWritesPerDay;
  const callsPerDay = sum(calls.map((c) => c.text + c.image)) + REPORTS.toModel;
  return {
    calls,
    reports,
    callsPerDay, // ≈ 4.24M
    shareOfUnits: callsPerDay / (PLATFORM.text + PLATFORM.images),
    perDay,
    perMonth: perDay * 30,
    peakCallsPerSecond: (callsPerDay / 86_400) * PLATFORM.peakFactor,
  };
})();

// ── Classifiers and hashing on our own GPUs (sheet §5, §10) ──────────────────────────────────────────────────────

/**
 * Text: one multilingual encoder (≈ 300M parameters) with a head per family, on every text unit, 80 tokens on average,
 * at 200,000 tokens a second per GPU (gcase-answer PRICES.smallEncoderTokensPerSecond). Images: a multi-head vision
 * classifier at 500 images a second per GPU, the vendor CSEA classifier self-hosted at 500 a second, OCR for text in
 * images at 200 a second. PDQ and MD5 on CPU. Fleet sized for peak × 1.3 headroom, in two regions (× 2), rounded up.
 */
export const CLASSIFIERS = (() => {
  const textTokensPerSecondPeak = PLATFORM.textPeakPerSecond * 80; // ≈ 289,000
  const textGpus = textTokensPerSecondPeak / MODEL.smallEncoderTokensPerSecond; // ≈ 1.45
  const imageGpus =
    PLATFORM.imagesPeakPerSecond / 500 + PLATFORM.imagesPeakPerSecond / 500 + PLATFORM.imagesPeakPerSecond / 200;
  const gpus = Math.ceil((textGpus + imageGpus) * MODEL.gpuHeadroom) * 2; // per region, two regions
  const perMonth = gpus * 24 * 30 * MODEL.gpuHour;
  // Buy instead: Rekognition image moderation at its tiers (F43), 450M images a month.
  const monthImages = PLATFORM.images * 30;
  const tiers = [
    [1_000_000, 0.001],
    [4_000_000, 0.0008],
    [30_000_000, 0.0006],
    [Infinity, 0.00025],
  ] as const;
  let left = monthImages;
  let rekognition = 0;
  for (const [size, price] of tiers) {
    const n = Math.min(left, size);
    rekognition += n * price;
    left -= n;
  }
  return { textTokensPerSecondPeak, textGpus, imageGpus, gpus, perMonth, rekognitionPerMonth: rekognition };
})();

// ── Measuring what was missed: prevalence (sheet §13, deep dive 3) ───────────────────────────────────────────────

/**
 * Prevalence = violating views ÷ all views (Meta, YouTube, Pinterest define it on views, F25–F27). The cascade
 * predicts it per family (missed units × all their views + actioned units × the views before the action); the sample
 * measures it. Weekly per family: 30,000 sampled views, labelled by the policy model (Pinterest's design, F27), with
 * ML-assisted weights that over-sample risky views and keep the estimate unbiased. Pinterest reports that weighting
 * narrowed the interval ≈ 46% in simulation (F27), i.e. variance × 0.54² ≈ 0.29, so the effective sample is
 * 30,000 ÷ 0.29 ≈ 102,900 uniform views (an assumption to re-measure on our data). People confirm every model positive
 * (the sample's positive share rises ≈ 8× under the weights, F27 reports 6–11×) and audit 1% of its negatives; the
 * model's sensitivity on the gold set corrects the estimate (an under-count otherwise). Intervals: Wilson 95% on the
 * effective sample. A rise is acted on when the interval of the week-on-week difference clears zero AND the rise is
 * ≥ 25%: an interval, not a p-value.
 */
export const PREVALENCE = (() => {
  const labelsPerWeek = 30_000;
  const weightGain = 1 / 0.54 ** 2; // ≈ 3.43
  const nEff = labelsPerWeek * weightGain; // ≈ 102,900
  const enrichment = 8;
  const modelFprOnViews = 0.001;
  const negativeAudit = 0.01;
  const per = CASCADE.per.map((p) => {
    const prev = p.prevalence;
    const week = wilson(prev * nEff, nEff);
    const day = wilson((prev * nEff) / 7, nEff / 7);
    // Half-width of the week-on-week difference (normal approximation, two equal weeks).
    const diffHalf = Z975 * Math.sqrt((2 * prev * (1 - prev)) / nEff);
    // Effective views a week for a 25% rise to clear zero: 2·z²·p ÷ (0.25·p)².
    const nFor25 = (2 * Z975 * Z975 * prev * (1 - prev)) / (0.25 * prev) ** 2;
    const humanLabels = labelsPerWeek * (prev * enrichment + modelFprOnViews) + labelsPerWeek * negativeAudit;
    return {
      id: p.id,
      prevalence: prev,
      per10k: prev * 10_000,
      week,
      day,
      relHalfWidthWeek: (week.hi - week.lo) / 2 / prev,
      diffHalf,
      diffHalfRel: diffHalf / prev,
      labelsFor25: nFor25 / weightGain,
      humanLabelsPerWeek: humanLabels,
    };
  });
  const modelLabelsPerDay = (labelsPerWeek * FAMILIES.length) / 7;
  return {
    labelsPerWeek,
    weightGain,
    nEff,
    enrichment,
    per,
    modelLabelsPerDay, // ≈ 25,700
    modelCostPerDay: modelLabelsPerDay * UNIT.smallImage,
    humanLabelsPerDay: sum(per.map((x) => x.humanLabelsPerWeek)) / 7,
  };
})();

// ── People: queues in staff hours, with wellbeing limits (sheet §15.2, deep dive 2) ──────────────────────────────

/**
 * Handle times (illustrative; outsourced queues run at 15–20 s an item, F37, which this design does not ask for on
 * uncertain items): CSEA specialists 180 s (evidence and report); terrorism specialists 120 s; threats and self-harm 60 s
 * (context, outreach, an Art. 18 referral when life is at risk, F10); hate 35 s; graphic 25 s; spam 20 s; escalated
 * reports 45 s; trusted-flagger notices 60 s; appeals 40 s (the model drafts a summary; a person decides); QA double review of 0.5% of
 * automated final actions 30 s (it measures the error rate the DSA asks for, F11); prevalence labels 20 s.
 * A shift is 8 paid hours with 6 in queues (breaks, wellbeing time, training) at ≤ 85% utilisation: 5.1 hours of handling.
 * Wellbeing (a design rule, not a cited standard, F40): severe queues (CSEA, terrorism, graphic) at most 4 hours of
 * handling a shift, the rest on non-graphic work; blurred and greyscale by default with click to reveal (F38, F39).
 * FTE = shifts a day × 7 ÷ 5 (seven-day cover) × 1.15 (leave, training, wellbeing days). 25 USD an hour loaded,
 * blended across in-house and vendor sites, 173.3 paid hours a month (illustrative).
 */
export const PEOPLE = (() => {
  const seconds: Record<FamilyId, number> = { csea: 180, terror: 120, safety: 60, hate: 35, graphic: 25, spam: 20 };
  const severe: Record<FamilyId, boolean> = {
    csea: true,
    terror: true,
    safety: false,
    hate: false,
    graphic: true,
    spam: false,
  };
  const urgent: Record<FamilyId, boolean> = {
    csea: true,
    terror: true,
    safety: true,
    hate: false,
    graphic: false,
    spam: false,
  };
  const automatedFinal = sum(
    CASCADE.per
      .filter((p) => p.sev >= 2)
      .map((p) => p.all.autoActTp + p.all.autoActFp + p.all.toModel * (1 - escalateOf(p.id)))
  );
  const queues = [
    ...CASCADE.per.map((p) => ({
      id: p.id,
      items: p.all.toPeople,
      seconds: seconds[p.id],
      severe: severe[p.id],
      urgent: urgent[p.id],
    })),
    {
      id: "reports",
      items: REPORTS.toPeople - PLATFORM.trustedFlaggerNotices,
      seconds: 45,
      severe: false,
      urgent: false,
    },
    { id: "trusted", items: PLATFORM.trustedFlaggerNotices, seconds: 60, severe: false, urgent: true },
    { id: "appeals", items: APPEALS.appeals, seconds: 40, severe: false, urgent: false },
    { id: "qa", items: automatedFinal * 0.005, seconds: 30, severe: false, urgent: false },
    { id: "prevalence", items: PREVALENCE.humanLabelsPerDay, seconds: 20, severe: false, urgent: false },
  ].map((q) => ({ ...q, hours: (q.items * q.seconds) / 3_600 }));
  const hours = sum(queues.map((q) => q.hours));
  const severeHours = sum(queues.filter((q) => q.severe).map((q) => q.hours));
  const urgentHours = sum(queues.filter((q) => q.urgent).map((q) => q.hours));
  const handlingPerShift = 6 * 0.85; // 5.1
  const severeCap = 4;
  const severeShifts = severeHours / severeCap;
  const otherHours = hours - severeHours - severeShifts * (handlingPerShift - severeCap);
  const shifts = severeShifts + Math.max(0, otherHours) / handlingPerShift;
  const fte = ((shifts * 7) / 5) * 1.15;
  const costPerFteMonth = 25 * 173.3;
  // Urgent queues at the peak hour: arrivals 2.5 × the hourly mean; one reviewer on shift gives 0.85 × 6 ÷ 8 handle-
  // hours an hour.
  const urgentPeakOnShift = ((urgentHours / 24) * PLATFORM.peakFactor) / (0.85 * (6 / 8));
  return {
    queues,
    hours,
    severeHours,
    urgentHours,
    handlingPerShift,
    severeCap,
    severeShifts,
    shifts,
    fte,
    costPerFteMonth,
    perMonth: fte * costPerFteMonth,
    urgentPeakOnShift,
    itemsPerDay: sum(queues.map((q) => q.items)),
  };
})();

/**
 * Waiting time in an urgent pool (Erlang C, M/M/c): the urgent queues are split into 12 language pools; at the peak hour
 * each pool has its share of the on-shift reviewers, of whom 6 ÷ 8 are in the queue at any moment, at 85% utilisation;
 * service 60 s (the safety queue). P(wait > t) = C·exp(−(cμ − λ)t); p95 wait = ln(C ÷ 0.05) ÷ (cμ − λ) when C > 0.05.
 */
export const URGENT_WAIT = (() => {
  const pools = 12;
  const servers = Math.floor((PEOPLE.urgentPeakOnShift / pools) * (6 / 8));
  const rho = 0.85;
  const service = 60;
  const mu = 1 / service;
  const lambda = rho * servers * mu;
  const a = lambda / mu;
  let term = 1;
  let s0 = 1;
  for (let k = 1; k < servers; k++) {
    term *= a / k;
    s0 += term;
  }
  const last = (term * a) / servers / (1 - rho);
  const C = last / (s0 + last);
  const p95WaitSeconds = C > 0.05 ? Math.log(C / 0.05) / (servers * mu - lambda) : 0;
  return { pools, servers, rho, C, p95WaitSeconds, targetSeconds: 30 * 60 };
})();

/** Capacity buys recall on threats and self-harm: the band's lower edge against people's hours (deep dive 2). */
export const SAFETY_CURVE = [0.02, 0.01, 0.005, 0.0025, 0.00125]
  .map((pLo) => {
    const f = { ...FAMILIES.find((x) => x.id === "safety")!, pLo };
    const flows = MARKETS.flatMap((m) => [flow(f, "text", m.id, m.share), flow(f, "image", m.id, m.share)]);
    const a = addFlows(flows);
    return {
      pLo,
      recall: a.actionedTp / a.violating,
      missedPerDay: a.missed,
      toModel: a.toModel,
      toPeople: a.toPeople,
      peopleHours: (a.toPeople * 60) / 3_600,
      modelUsdPerDay: a.toModel * (0.9 * UNIT.midText + 0.1 * UNIT.midImage),
      // A handling hour costs 25 USD × 8 paid ÷ 5.1 handled hours ≈ 39.2 USD.
      usdPerDay:
        ((a.toPeople * 60) / 3_600) * ((25 * 8) / (6 * 0.85)) + a.toModel * (0.9 * UNIT.midText + 0.1 * UNIT.midImage),
    };
  })
  .map((x, i, xs) => ({
    ...x,
    // Marginal USD per extra violation caught, moving from the previous (higher) edge to this one.
    marginalUsdPerCatch:
      i === 0 ? null : (x.usdPerDay - xs[i - 1].usdPerDay) / (xs[i - 1].missedPerDay - x.missedPerDay),
  }));

// ── Latency per path (sheet §12) ─────────────────────────────────────────────────────────────────────────────────

/**
 * Stage fits are illustrative log-normals (no platform publishes them; dossier §11). Parallel branches are the maximum
 * of the draws (product of CDFs); a path's p95 is the sum of its stage p95s, a conservative estimate.
 * Pre-publish text runs inside the post request; pre-publish image runs after the upload lands and before the post is
 * visible. The model path runs after publish (the unit stays out of recommendations and search until decided).
 * Model calls: no extended thinking; first token 400 / 900 ms (text) and 600 / 1,300 ms (with an image), 90 output
 * tokens at 150 / 100 tokens a second (small) and 70 / 45 (mid).
 */
export const LATENCY = (() => {
  const hop: Stage = { p50: 5, p95: 15 };
  const normalise: Stage = { p50: 2, p95: 5 }; // Unicode NFKC, confusables, zero-width, leetspeak map, URL extract
  const rules: Stage = { p50: 4, p95: 12 }; // rules engine + exact text and URL lists (in-memory and Redis)
  const features: Stage = { p50: 6, p95: 20 }; // account and thread features from the feature store
  const textClassifier: Stage = { p50: 20, p95: 60 }; // incl. ≤ 10 ms batching wait on the GPU
  const decide: Stage = { p50: 2, p95: 5 }; // thresholds per family × market, write the decision record
  const textPre = path([hop, normalise, rules, par([features, textClassifier]), decide]);

  const fetch: Stage = { p50: 25, p95: 70 }; // read from object storage, decode, resize to 768 px
  const hashCompute: Stage = { p50: 8, p95: 20 }; // MD5 + PDQ (+ 8 dihedral variants for bank writes, async)
  const localBanks: Stage = { p50: 5, p95: 15 }; // own bank + GIFCT copy, binary index
  const photoDna: Stage = { p50: 150, p95: 400 }; // PhotoDNA Cloud call (vetted access, F3)
  const imageClassifiers: Stage = { p50: 30, p95: 80 }; // multi-head classifier ∥ vendor CSEA classifier, same GPU pool
  const ocr: Stage = { p50: 60, p95: 150 };
  const ocrText: Stage = { p50: 20, p95: 60 }; // the text classifier on the OCR text
  const hashBranch = path([hashCompute, par([localBanks, photoDna])]);
  const ocrBranch = path([ocr, ocrText]);
  const imagePre = path([fetch, par([hashBranch, imageClassifiers, ocrBranch]), decide]);

  const gen = (first: Stage, tps50: number, tps95: number): Stage => ({
    p50: first.p50 + (CONTEXT.output / tps50) * 1_000,
    p95: first.p95 + (CONTEXT.output / tps95) * 1_000,
  });
  const enqueue: Stage = { p50: 5, p95: 50 };
  const queueWait: Stage = { p50: 200, p95: 3_000 }; // provisioned for the peak (≈ 117 calls a second)
  const smallText = gen({ p50: 400, p95: 900 }, 150, 100);
  const smallImage = gen({ p50: 600, p95: 1_300 }, 150, 100);
  const midText = gen({ p50: 500, p95: 1_100 }, 70, 45);
  const act: Stage = { p50: 20, p95: 60 }; // decision record, action, statement of reasons queued
  const modelText = path([enqueue, queueWait, smallText, act]);
  const modelImage = path([enqueue, queueWait, smallImage, act]);
  const modelMid = path([enqueue, queueWait, midText, act]);
  // One retry after a timeout at 10 s, on the self-hosted fallback (text) — the worst case still inside N3.
  const modelRetry = { p50: modelText.p50, p95: 10_000 + modelText.p95 };
  return {
    stages: {
      hop,
      normalise,
      rules,
      features,
      textClassifier,
      decide,
      fetch,
      hashCompute,
      localBanks,
      photoDna,
      imageClassifiers,
      ocr,
      ocrText,
      enqueue,
      queueWait,
      smallText,
      smallImage,
      midText,
      act,
    },
    textPre,
    hashBranch,
    ocrBranch,
    imagePre,
    modelText,
    modelImage,
    modelMid,
    modelRetry,
  };
})();

/** N3 targets (sheet §4). Human decisions are hours, set by severity, from when the unit enters a person's queue. */
export const TARGETS = {
  textPreP50Ms: 50,
  textPreP95Ms: 150,
  imagePreP50Ms: 300,
  imagePreP95Ms: 800,
  modelP50Ms: 10_000,
  modelP95Ms: 60_000,
  humanP95Hours: { csea: 1, terror: 1, safety: 0.5, trusted: 24, hate: 24, graphic: 24, spam: 48, appeals: 72 },
  removalOrderMinutes: 60, // EU TCO Regulation Art. 3(3) (F51)
} as const;

// ── Shipping a policy change in a day (sheet §13, deep dive 4) ───────────────────────────────────────────────────

/**
 * A new or changed rule in one family (worked on hate): write the rule and 5 boundary examples; policy experts label
 * 400 new gold items (200 that violate under the new rule, 200 near-misses that do not), 20% double-labelled, at 45 s
 * each; run old and new prompts on the family's 2,000 gold items + the 400; gate with Wilson intervals; shadow the new
 * prompt on live band traffic for 6 hours; experts read 300 sampled disagreements; canary one market for 4 hours; roll
 * out. The classifiers still score the old policy, so the family's band is widened (pLo × 0.5 → more units to the
 * model) for 3 weeks while new labels retrain them. All durations and rates illustrative.
 */
export const POLICY_CHANGE = (() => {
  const experts = 4;
  const newItems = 400;
  const labelHours = (newItems * 1.2 * 45) / 3_600 / experts; // 1.5 h
  const evalCalls = 2 * (2_000 + newItems); // old and new prompt
  const evalMinutes = ((evalCalls / 50) * 1.2) / 60; // 50 in parallel, ≈ 1.2 s a call → ≈ 1.9 min
  const hateBandPerDay = CASCADE.per.find((p) => p.id === "hate")!.all.toModel;
  const shadowHours = 6;
  const shadowCalls = (hateBandPerDay * shadowHours) / 24;
  const disagreement = 0.025;
  const disagreements = shadowCalls * disagreement;
  const sampled = 300;
  const reviewHours = (sampled * 60) / 3_600 / experts; // 1.25 h
  const steps = [
    { id: "write", label: "Write the rule and 5 boundary examples", hours: 2 },
    { id: "label", label: "Experts label 400 new gold items", hours: labelHours },
    { id: "eval", label: "Old and new prompt on 2,400 gold items", hours: evalMinutes / 60 },
    { id: "shadow", label: "Shadow on live band traffic", hours: shadowHours },
    { id: "review", label: "Experts read 300 sampled disagreements", hours: reviewHours },
    { id: "canary", label: "Canary in one market", hours: 4 },
    { id: "rollout", label: "All markets", hours: 1 },
  ];
  // Gates (illustrative results): recall on the 200 new-rule violations; agreement with the old labels on the 2,000
  // unchanged items (nothing else moved); share of sampled shadow disagreements the new rule explains.
  const gates = {
    newRuleRecall: { k: 186, n: 200, floor: 0.85, ...wilson(186, 200) },
    nearMissFine: { k: 190, n: 200, floor: 0.9, ...wilson(190, 200) },
    unchangedAgreement: { k: 1_972, n: 2_000, floor: 0.975, ...wilson(1_972, 2_000) },
    disagreementsExplained: { k: 282, n: sampled, floor: 0.85, ...wilson(282, sampled) },
  };
  // The band widened for 3 weeks: hate's model calls with pLo halved, priced.
  const hate = FAMILIES.find((x) => x.id === "hate")!;
  const widened = addFlows(
    MARKETS.flatMap((m) => {
      const e = edges(hate, m.id);
      const f = { ...hate, pLo: e.pLo * 0.5, pHi: e.pHi };
      return [flow(f, "text", m.id, m.share), flow(f, "image", m.id, m.share)];
    })
  );
  const extraCallsPerDay = widened.toModel - hateBandPerDay;
  return {
    experts,
    labelHours,
    evalCalls,
    evalCostUsd: evalCalls * UNIT.smallText,
    evalMinutes,
    shadowCalls,
    shadowCostUsd: shadowCalls * UNIT.smallText,
    disagreements,
    sampled,
    reviewHours,
    steps,
    totalHours: sum(steps.map((s) => s.hours)),
    gates,
    extraCallsPerDay,
    extraCostThreeWeeks: extraCallsPerDay * 21 * UNIT.smallText,
  };
})();

// ── Adversarial adaptation: the red-team loop (sheet §15, deep dive 5) ───────────────────────────────────────────

/**
 * Monthly: 9 attack families × 100 crafted units each, run through the full cascade (normaliser, hashes, classifiers,
 * model). Attack success rate per family with its Wilson interval: 100 per family is the least that gives an interval
 * narrow enough to rank families (15 of 100 → 9.3–23.3%). Worked example (illustrative): homoglyph and zero-width
 * slurs succeed 23 of 100 before the confusables fold is extended, 3 of 100 after.
 */
export const REDTEAM = {
  families: [
    "Homoglyphs, zero-width characters, leetspeak",
    "Words split across comments or lines",
    "Text inside an image",
    "Image edits against the hash: crop, rotate, border, mirror",
    "New coded terms and slurs",
    "Context flips: quoting to condemn vs to endorse",
    "Instructions aimed at the model in the post",
    "Code-switching between languages",
    "Account tactics: many fresh accounts, slow ramps",
  ],
  perFamily: 100,
  before: { k: 23, n: 100, ...wilson(23, 100) },
  after: { k: 3, n: 100, ...wilson(3, 100) },
  ci15: wilson(15, 100),
} as const;

// ── Legal duties, records and storage (sheet §7, §14) ────────────────────────────────────────────────────────────

/**
 * CSEA: confirmed units are reported to NCMEC (US 18 U.S.C. § 2258A, "as soon as reasonably possible", F7), which
 * passes UK-linked reports to the NCA (F14), so one report path, never two; related units from one upload event are
 * bundled into one report (F8), 1.5 units a report (illustrative); evidence preserved 1 year (F7) in a vault outside
 * every general queue and outside the external model. Terrorism removal orders from an EU authority: ≤ 1 hour (F51),
 * on-call specialist. Threat to life (DSA Art. 18, F10): 0.5% of confirmed threats and self-harm (illustrative) are
 * referred to police. EU statements of reasons: every restriction on an EU user, sent to the DSA database in 15-minute
 * batches (F9, F10).
 */
export const LEGAL = (() => {
  const csea = CASCADE.per.find((p) => p.id === "csea")!;
  const safety = CASCADE.per.find((p) => p.id === "safety")!;
  const actions = CASCADE.actionedTp + CASCADE.actionedFp;
  const euActions = actions * MARKETS.find((m) => m.id === "EU")!.share;
  return {
    cseaUnitsPerDay: csea.all.actionedTp,
    cseaReportsPerDay: csea.all.actionedTp / 1.5,
    preservationDays: 365,
    referralsPerDay: safety.all.actionedTp * 0.005,
    actionsPerDay: actions,
    euStatementsPerDay: euActions,
    euPerBatch: euActions / (24 * 4),
  };
})();

export const STORAGE = (() => {
  const units = PLATFORM.text + PLATFORM.images;
  const decisionGbDay = (units * 200) / 1e9; // scores per family, thresholds and policy versions, path taken
  const actionGbDay = (LEGAL.actionsPerDay * 2_000) / 1e9; // action + statement of reasons + who decided
  const modelLogGbDay = (LLM.callsPerDay * 1_000) / 1e9; // prompt version, input ids, output JSON (not the content)
  const bankImagesPerDay = sum(CASCADE.per.map((p) => p.image.actionedTp));
  const bankGbYear = (bankImagesPerDay * 365 * 9 * 32) / 1e9; // PDQ + 8 dihedral variants, 32 bytes each
  return {
    decisionGbDay,
    decisionHotTb: (decisionGbDay * 90) / 1_000, // 90 days hot for audits and prevalence
    actionGbDay,
    actionTwoYearsTb: (actionGbDay * 730) / 1_000,
    modelLogGbDay,
    bankImagesPerDay,
    bankGbYear,
  };
})();

// ── Totals and alternatives (sheet §5, §12) ──────────────────────────────────────────────────────────────────────

export const TIERS = (() => {
  const units = PLATFORM.text + PLATFORM.images;
  const modelCalls = LLM.callsPerDay;
  return {
    units,
    hash: CASCADE.hash,
    hashShare: CASCADE.hash / units,
    autoAct: CASCADE.autoAct,
    autoActShare: CASCADE.autoAct / units,
    modelCalls,
    modelShare: modelCalls / units,
    people: PEOPLE.itemsPerDay,
    peopleShare: PEOPLE.itemsPerDay / units,
    peopleFromCascade: CASCADE.toPeople,
    precision: CASCADE.actionedTp / (CASCADE.actionedTp + CASCADE.actionedFp),
    // Share of actions taken with no person (exact hash matches, automated removals, the model's own decisions):
    // the DSA statement of reasons says "fully automated" for these (F9).
    automatedShare:
      sum(
        CASCADE.per.map((p) =>
          p.sev >= 2 ? p.all.hashExact + p.all.autoActTp + p.all.autoActFp + p.modelActions : p.all.hashExact
        )
      ) /
      (CASCADE.actionedTp + CASCADE.actionedFp),
    recall: CASCADE.actionedTp / sum(CASCADE.per.map((p) => p.all.violating)),
    prevalence: sum(CASCADE.per.map((p) => p.prevalence)),
  };
})();

/** A month (30 days), USD, illustrative except model prices. */
export const COST = (() => {
  const model = LLM.perMonth + PREVALENCE.modelCostPerDay * 30;
  const classifiers = CLASSIFIERS.perMonth;
  const people = PEOPLE.perMonth;
  const engineering = 12 * 15_000; // 12 engineers (pipeline, models, tools, data)
  const policy = 8 * 10_000; // policy writers and experts, incl. gold-set labelling
  const infrastructure = 30_000; // queues, stores, feature store, review app hosting
  const total = model + classifiers + people + engineering + policy + infrastructure;
  // Alternatives: the model on every unit (small; images at the image price), and people on the whole band instead
  // of the model (30 s an item).
  const modelEverywhere = (PLATFORM.text * UNIT.smallText + PLATFORM.images * UNIT.smallImage) * 30;
  const peopleOnBandHoursDay = (CASCADE.toModel * 30) / 3_600;
  const peopleOnBandFte = (((peopleOnBandHoursDay / PEOPLE.handlingPerShift) * 7) / 5) * 1.15;
  return {
    model,
    classifiers,
    people,
    engineering,
    policy,
    infrastructure,
    total,
    perThousandUnits: total / (((PLATFORM.text + PLATFORM.images) * 30) / 1_000),
    shares: { people: people / total, model: model / total, classifiers: classifiers / total },
    modelEverywhere,
    peopleOnBandHoursDay,
    peopleOnBandFte,
    peopleOnBandPerMonth: peopleOnBandFte * PEOPLE.costPerFteMonth,
    safeguardSelfHostNote:
      "gpt-oss-safeguard-20b fits one 16 GB GPU (F16): the text fallback when the provider is down",
  };
})();

// ── The worked unit (sheet §9): a German comment in the hate band ────────────────────────────────────────────────

export const WALKTHROUGH = (() => {
  const hate = FAMILIES.find((x) => x.id === "hate")!;
  const e = edges(hate, "EU");
  const p = 0.3; // the classifier's calibrated probability after the confusables fold
  const score = scoreAt(p, hate.text!.rate, hate.text!.d);
  const rawP = 0.01; // below the band: without the fold it would have been allowed
  return {
    edges: e,
    p,
    score,
    rawP,
    inBand: p >= e.pLo && p < e.pHi,
    modelConfidence: 0.86,
    removes: 0.86 >= e.tau,
    prePublishMs: LATENCY.textPre.p50,
    modelMs: LATENCY.modelText.p50,
    usd: UNIT.smallText,
  };
})();

// ── Release gates and the live guard (sheet §13) ─────────────────────────────────────────────────────────────────

/**
 * Gold set per family: 2,000 items (1,000 violating, 1,000 fine near the boundary), stratified by market and language,
 * double-labelled by policy experts, refreshed quarterly with misses from prevalence, appeals and the red team. A change
 * to a classifier, threshold, prompt, policy or model passes when, per family, the Wilson lower bound of recall and of
 * precision on the gold set is ≥ the current version's point value − 3 points (non-inferiority, an interval); with
 * 1,000 per side a point value of 0.92 has a lower bound ≈ 0.90, so an equal release passes. Live guard: automated
 * actions per family per hour against the same hour last week; a doubling of false positives (Meta's Q4 2025 bug,
 * F29) on hate adds ≈ 12% of the hour's actions, so the guard is set at +10%, ≈ 9 standard deviations above
 * Poisson noise at hate's ≈ 9,000 actions an hour (√9,000 ≈ 95).
 */
export const GATES = (() => {
  const gold = 2_000;
  const perSide = 1_000;
  const eg = wilson(920, perSide);
  const hate = CASCADE.per.find((p) => p.id === "hate")!;
  const hateActionsPerHour = (hate.all.actionedTp + hate.all.actionedFp) / 24;
  const hateFpShare = hate.all.actionedFp / (hate.all.actionedTp + hate.all.actionedFp);
  const guard = 0.1;
  return {
    gold,
    perSide,
    example: eg,
    marginPoints: 3,
    // Market slices: ≥ 200 per side per market (1,000 per side across 5 markets); 184 of 200 → 0.874–0.950, so the
    // slice margin is 5 points (a 3-point margin would fail an equal release).
    marketPerSide: 200,
    marketExample: wilson(184, 200),
    marketMarginPoints: 5,
    // Prevalence: the extra model labels a week for hate to see a 25% rise (≈ 33,400 × the image-call price).
    extraLabelUsdWeek:
      (PREVALENCE.per.find((x) => x.id === "hate")!.labelsFor25 - PREVALENCE.labelsPerWeek) * UNIT.smallImage,
    hateActionsPerHour,
    hateFpShare, // a doubling of false positives adds this share of the hour's actions
    guard,
    guardSigmas: (guard * hateActionsPerHour) / Math.sqrt(hateActionsPerHour),
  };
})();

/**
 * QA double review (sheet §13): 0.5% of the units automation decided (automated removals and the model's removals and
 * allows in the band) go to a second, blind person. Per family a day: the removals in that sample estimate precision,
 * the allows estimate the model's miss rate in the band. Weekly Wilson half-width on precision at the design's value.
 */
export const QA = CASCADE.per
  .filter((p) => p.sev >= 2)
  .map((p) => {
    const a = p.all;
    const removals = a.autoActTp + a.autoActFp + a.modelTp + a.modelFp;
    const allows = a.toModel * (1 - escalateOf(p.id)) - (a.modelTp + a.modelFp); // band units the model allowed
    const sampledRemovalsWeek = removals * 0.005 * 7;
    const precision = (a.autoActTp + a.modelTp) / removals;
    const w = wilson(precision * sampledRemovalsWeek, sampledRemovalsWeek);
    return {
      id: p.id,
      removalsPerDay: removals,
      allowsPerDay: allows,
      sampledRemovalsWeek,
      precision,
      halfWidthPoints: ((w.hi - w.lo) / 2) * 100,
    };
  });
