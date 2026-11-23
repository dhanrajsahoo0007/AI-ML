// Constants and arithmetic for the "Design a Content Moderation System" case study (/genai-system-design/case-studies/
// content-moderation-system; design sheet SYSTEM-DESIGN/plans/genai-design/design/content-moderation-system.md v2, after
// design review round 1; dossier research/content-moderation-system.md, cited as "dossier F12"; review
// review/content-moderation-system-design.md). Specs in assets/diagrams/animated/moderation/ import from here, so the
// page, the figures and the tests share one set of numbers.
//
// This page is NOT Brightpost. It defines its own illustrative platform, KESTREL: a public community app with posts,
// comments and images, 40M daily users in five markets. Every volume, base rate, score separation, error rate, cost of
// an error, handle time and latency below is ILLUSTRATIVE unless a comment names a source. No platform publishes the
// share of traffic per tier or per-stage latency (dossier §11), so those are illustrative by necessity.
//
// Costs of an error are in HARM UNITS, a policy device (no platform publishes them). They are NOT US dollars: they set
// thresholds; staffing trade-offs are shown in USD and harm units side by side and signed by the policy lead (review 41).
//
// Prices: model list prices as of November 2026 are imported from gcase-answer.ts `PRICES` (one price, one value across
// the site): small (Claude Haiku 5.5 class) 0.10 input / 0.01 cache read / 0.125 cache write / 0.50 output USD per
// million tokens; mid (Claude Sonnet 5.5 class) 2.00 / 0.10 / 2.50 / 10.00; minimum cacheable prefix 512 tokens. Image
// tokens = ceil(w ÷ 28) × ceil(h ÷ 28) (dossier F45). The route is Amazon Bedrock with the EU cross-Region profile for
// EU users (zero operator access for these models as read 2026-11-23, dossier F52); regional prices are not verified.
// gpt-oss-safeguard-20b 0.07 / 0.20 (Bedrock) USD per million, read 22 November 2026 (F41).
//
// Statistics: intervals, never p-values. Binomial intervals are Wilson 95% (F28); rare counts use the exact Poisson
// bound. No design-effect gain from weighted sampling is assumed (the Pinterest × 3.43 was dropped, dossier F27
// correction). Every "≈" in the sheet is a rounded value of a number computed here.

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
const Z80 = bisect(phi, 0.8, -8, 8); // 0.842 (80% power)

/** Wilson 95% interval for k successes in n. */
export function wilson(k: number, n: number) {
  const p = k / n;
  const z = Z975;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return { p, lo: centre - half, hi: centre + half };
}
/** P(X ≤ k) for X ~ Poisson(λ). */
function poissonCdf(k: number, lambda: number) {
  let term = Math.exp(-lambda);
  let total = term;
  for (let i = 1; i <= k; i++) {
    term *= lambda / i;
    total += term;
  }
  return total;
}
/** One-sided 95% Poisson upper bound on the mean when k events were seen (k = 0 → 3.00). */
function poissonUpper95(k: number) {
  return bisect((l) => -poissonCdf(k, l), -0.05, 0, 100_000);
}
/** P(X ≥ k) for X ~ Poisson(λ). */
const poissonAtLeast = (k: number, lambda: number) => (k <= 0 ? 1 : 1 - poissonCdf(k - 1, lambda));

/** A stage's latency (ms), fitted as a log-normal to its p50 and p95. */
type Stage = { p50: number; p95: number };
const lnCdf = (s: Stage) => (t: number) =>
  t <= 0 ? 0 : phi((Math.log(t) - Math.log(s.p50)) / ((Math.log(s.p95) - Math.log(s.p50)) / Z95));
/** Quantile q of the maximum of independent parallel stages: solve Π F_i(t) = q. */
export function maxOf(stages: readonly Stage[], q: number) {
  return bisect((t) => prod(stages.map((s) => lnCdf(s)(t))), q, 0.01, 10_000_000);
}
const par = (xs: Stage[]): Stage => ({ p50: maxOf(xs, 0.5), p95: maxOf(xs, 0.95) });
/** A serial path: the p50 is the sum of stage p50s (approximate: slightly low for skewed stages, review 47); the p95 is
 * the sum of stage p95s, a conservative estimate. */
const path = (stages: Stage[]) => ({
  p50: sum(stages.map((s) => s.p50)),
  p95: sum(stages.map((s) => s.p95)),
});

/** Erlang C for an M/M/c queue: P(wait > 0) and the p95 wait (s), given servers c, arrivals λ a second, service s. */
function erlang(c: number, lambda: number, serviceSeconds: number) {
  const mu = 1 / serviceSeconds;
  const a = lambda / mu;
  if (a >= c) return { C: 1, p95: Infinity };
  let term = 1;
  let s0 = 1;
  for (let k = 1; k < c; k++) {
    term *= a / k;
    s0 += term;
  }
  const last = ((term * a) / c) * (1 / (1 - a / c));
  const C = last / (s0 + last);
  const p95 = C > 0.05 ? Math.log(C / 0.05) / (c * mu - lambda) : 0;
  return { C, p95 };
}

// ── The platform (illustrative) ──────────────────────────────────────────────────────────────────────────────────

/**
 * Kestrel, a day. Text units: 20M posts + 100M comments + 5M edits (an edit is re-checked) = 125M. Image units: 40% of
 * posts carry images, 1.5 on average (12M), and 3% of comments carry one (3M) = 15M. Views: 40M daily users × 150 item
 * views = 6.0B a day over the 125M text units, 48 each on average. An image is seen when its post or comment is seen, so
 * an image unit carries its parent's views; a view of a post whose caption AND image violate the same family counts
 * once (the overlap is ignored: rates are small, review 21). Views per unit are heavy-tailed: log-normal with σ = 2.0
 * and mean 48 (median ≈ 6.5): ≈ 0.59% of units pass 1,000 views and carry ≈ 30% of all views (used by RECHECK).
 * Peak = 2.5 × the daily mean rate a second; the hourly profile peaks at 1.75 × the mean (PEOPLE).
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
  const viewsSigma = 2.0;
  return {
    dau,
    posts,
    comments,
    edits,
    text,
    images,
    units: text + images, // 140M
    views,
    viewsPerUnit: views / text, // 48
    viewsSigma,
    peakFactor,
    textPerSecond: text / 86_400, // ≈ 1,447
    textPeakPerSecond: (text / 86_400) * peakFactor, // ≈ 3,617
    imagesPerSecond: images / 86_400, // ≈ 174
    imagesPeakPerSecond: (images / 86_400) * peakFactor, // ≈ 434
    unitsPerSecond: (text + images) / 86_400, // ≈ 1,620 (review 51)
    reports: 2_000_000, // user reports a day
    reportedItems: 1_200_000, // distinct units reported (≈ 1.7 reports each)
    trustedFlaggerNotices: 2_000, // EU (DSA Art. 22) and UK equivalents
    nciiRequests: 400, // victim removal requests a day (TAKE IT DOWN, India 24 h, StopNCII, F53, F57, F60)
    // Regulatory status (review 18): EU daily users 30% × 40M = 12M, ≈ 21.6M monthly at 1.8 MAU/DAU (illustrative),
    // below the DSA's 45M VLOP line (recital 76), so Arts. 34–37 and 42 do not apply; India ≈ 8.8M daily users > 5M
    // registered users: a significant social media intermediary (F57); established in the US with an EU legal
    // representative (DSA Art. 13). UK categorisation thresholds not verified: assumed not Category 1.
    euMonthlyUsers: dau * 0.3 * 1.8,
  };
})();

/** Markets: share of units. */
export const MARKETS = [
  { id: "EU", share: 0.3 },
  { id: "UK", share: 0.08 },
  { id: "US", share: 0.25 },
  { id: "IN", share: 0.22 },
  { id: "ROW", share: 0.15 },
] as const;
export type MarketId = (typeof MARKETS)[number]["id"];

/**
 * Language groups (review 42): share of units, illustrative. Each group is a reviewer pool for the urgent queues and a
 * calibration slice. `auto: false` = too few labels to calibrate (below CALIBRATION.minLabelsForAuto): no automated
 * final action in that group; units above the act line go to the model instead.
 */
export const LANGUAGES = [
  { id: "EN", share: 0.4, auto: true }, // EU 6, UK 8, US 22, IN 4
  { id: "ES", share: 0.1, auto: true }, // EU 3, US 3, LatAm 4
  { id: "HI+Hinglish", share: 0.11, auto: true }, // romanised Hinglish is the weakest for multilingual encoders
  { id: "PT", share: 0.05, auto: true },
  { id: "DE", share: 0.05, auto: true },
  { id: "FR", share: 0.04, auto: true },
  { id: "IT", share: 0.03, auto: true },
  { id: "AR", share: 0.03, auto: true },
  { id: "TA+TE", share: 0.03, auto: true },
  { id: "PL", share: 0.02, auto: true },
  { id: "BN", share: 0.02, auto: true },
  { id: "NL", share: 0.015, auto: true },
  { id: "RO", share: 0.01, auto: true },
  { id: "MR+UR", share: 0.02, auto: false },
  { id: "EU long tail (15 languages)", share: 0.035, auto: false },
  { id: "ID and other", share: 0.04, auto: false },
] as const;
const NO_AUTO_SHARE = sum(LANGUAGES.filter((l) => !l.auto).map((l) => l.share)); // 0.095

// ── Harm families, global thresholds and the cascade (sheet §5, §13, deep dive 1) ────────────────────────────────

/**
 * Seven harm families, in severity order. For each stream (text, image):
 *   rate    share of units that violate the family's policy (illustrative; spam dominates, as on Reddit, F33);
 *   d       the small classifier's separation: scores of fine units ~ N(0, 1), of violating units ~ N(d, 1) (binormal;
 *           AUC = Φ(d ÷ √2)); calibrated, so logit p(s) = logit(rate) + d·s − d²/2 (calibration is measured in the
 *           tails by CALIBRATION, review 3);
 *   vetted  share caught first by a vetted list: CSEA by PhotoDNA, NCMEC and IWF lists (F3, F59); NCII by StopNCII (F60);
 *           terrorism by GIFCT (F5). A vetted EXACT match acts at once only for CSEA; every other vetted match goes to a
 *           specialist who views it (StopNCII asks partners to review, F60; perceptual matches can be crafted, F6);
 *   own     share caught by our own banks. Banks hold ONLY person-confirmed removals (review 9), and a bank match is
 *           wrong `1 − ownPrecision` of the time (templates, memes, news photos); entries are unbanked on overturn.
 * Costs of an error (harm units, global: one terms-of-service standard everywhere, review 2): cfp = a wrong action on
 * fine content; cfn = a missed violation over the views it gets (the average unit's 48; reach enters through RECHECK).
 * Local law is a separate, geo-scoped decision (LOCAL_LAW), never a lower global threshold.
 * Severity 0–1: the whole band is HELD (visible to the author only, "pending") before anyone else sees it (review 1);
 * holding costs a delay, cfpHold = 0.05 harm units, so the hold line cfpHold ÷ (cfpHold + cfn) sits below every pLo.
 * Severity 2–3: band units publish with limited distribution while the model decides (≈ 1.2 / 4.9 s), and an action is
 * final, with appeal. CSEA and NCII never go to the external model: their bands go to specialists (N5).
 * llm: the policy-reading model's errors on band units (measured per classifier-score bin on held-out labels; constants
 * here), the share it escalates (+ 0.5% refusals or malformed replies, counted as escalations, review 12), and the model.
 */
type Stream = { readonly rate: number; readonly d: number; readonly vetted: number; readonly own: number } | null;
type Llm = { readonly fpr: number; readonly fnr: number; readonly escalate: number; readonly model: "small" | "mid" };
type Family = {
  readonly id: FamilyId;
  readonly name: string;
  readonly sev: number;
  readonly text: Stream;
  readonly image: Stream;
  readonly cfp: number;
  readonly cfn: number;
  readonly llm: Llm | null;
  readonly pLo: number | null; // capacity-set lower edge (severity 0–1)
  readonly ownPrecision: number;
  readonly accountShare: number; // share of the band decided by account-integrity rules without a model call
  readonly disagreementToPeople: number; // share of high-score model negatives sent to a person (detector hits + sample)
  readonly llmText?: Llm; // a model for the text stream only (CSEA grooming text: no imagery leaves the vault)
};
export type FamilyId = "csea" | "ncii" | "terror" | "safety" | "hate" | "graphic" | "spam";

export const FAMILIES: readonly Family[] = [
  {
    id: "csea",
    name: "Child sexual exploitation (images; grooming and solicitation text)",
    sev: 0,
    text: { rate: 2e-6, d: 4.2, vetted: 0, own: 0 }, // grooming classifier with conversation features
    image: { rate: 5e-6, d: 4.5, vetted: 0.6, own: 0 },
    cfp: 50,
    cfn: 20_000,
    llm: null,
    llmText: { fpr: 0.02, fnr: 0.06, escalate: 0.05, model: "mid" }, // grooming and solicitation text only
    pLo: 0.002,
    ownPrecision: 1,
    accountShare: 0,
    disagreementToPeople: 0,
  },
  {
    id: "ncii",
    name: "Non-consensual intimate imagery",
    sev: 0,
    text: null,
    image: { rate: 1e-5, d: 3.2, vetted: 0.3, own: 0 },
    cfp: 10,
    cfn: 2_000,
    llm: null,
    pLo: 0.01, // proactive NCII detection is weak; victim requests and StopNCII hashes are the main path
    ownPrecision: 1,
    accountShare: 0,
    disagreementToPeople: 0,
  },
  {
    id: "terror",
    name: "Terrorism and violent extremism",
    sev: 0,
    text: { rate: 2e-5, d: 4.0, vetted: 0.2, own: 0 },
    image: { rate: 2e-5, d: 4.0, vetted: 0.4, own: 0 },
    cfp: 20,
    cfn: 2_000,
    llm: { fpr: 0.02, fnr: 0.06, escalate: 0.03, model: "mid" }, // mid: praise vs reporting vs condemnation (review 23)
    pLo: 0.003,
    ownPrecision: 1,
    accountShare: 0,
    disagreementToPeople: 0,
  },
  {
    id: "safety",
    name: "Threats and self-harm",
    sev: 1,
    text: { rate: 2e-4, d: 3.6, vetted: 0, own: 0 },
    image: { rate: 2e-5, d: 3.0, vetted: 0, own: 0 },
    cfp: 5,
    cfn: 400,
    llm: { fpr: 0.02, fnr: 0.06, escalate: 0.02, model: "mid" },
    pLo: 0.005, // capacity-set (SAFETY_CURVE); the cost rule alone would put it at ≈ 0.00027
    ownPrecision: 1,
    accountShare: 0,
    disagreementToPeople: 0,
  },
  {
    id: "hate",
    name: "Hate and harassment",
    sev: 2,
    text: { rate: 2e-3, d: 3.3, vetted: 0, own: 0.02 },
    image: { rate: 5e-4, d: 3.0, vetted: 0, own: 0.05 },
    cfp: 8,
    cfn: 6,
    llm: { fpr: 0.03, fnr: 0.08, escalate: 0.03, model: "small" },
    pLo: null,
    ownPrecision: 0.98,
    accountShare: 0,
    disagreementToPeople: 0.15,
  },
  {
    id: "graphic",
    name: "Adult nudity and graphic violence (two policies, one classifier pair)",
    sev: 2,
    text: null,
    image: { rate: 6e-3, d: 3.6, vetted: 0, own: 0.15 },
    cfp: 3,
    cfn: 4,
    llm: { fpr: 0.02, fnr: 0.05, escalate: 0.03, model: "small" },
    pLo: null,
    ownPrecision: 0.95,
    accountShare: 0,
    disagreementToPeople: 0.15,
  },
  {
    id: "spam",
    name: "Spam and scams",
    sev: 3,
    text: { rate: 8e-3, d: 3.6, vetted: 0, own: 0.5 }, // exact text and URL lists
    image: { rate: 2e-3, d: 3.6, vetted: 0, own: 0.4 },
    cfp: 1,
    cfn: 0.5,
    llm: { fpr: 0.03, fnr: 0.06, escalate: 0.01, model: "small" },
    pLo: null,
    ownPrecision: 0.97,
    accountShare: 0.4, // account risk (age, velocity, links, ban-evasion matches) decides 40% of the spam band (review 32)
    disagreementToPeople: 0.05,
  },
];
export const familyById = (id: FamilyId) => FAMILIES.find((f) => f.id === id)!;

/** People's errors (illustrative, measured by double review): general reviewers; specialists (terrorism, NCII);
 * CSEA, where a second specialist confirms every viewed report (two-person rule), so a wrong report is rare. */
export const HUMAN = {
  fpr: 0.02,
  fnr: 0.04,
  specialistFpr: 0.01,
  specialistFnr: 0.02,
  cseaFpr: 0.0002,
  nciiFpr: 0.005, // consent cannot be seen in an image: NCII specialists act on matches and context, not looks
} as const;
/** Share of a unit's views before the action (illustrative). Held units (severity 0–1 band) have none. */
export const EXPOSURE = { model: 0.01, person: 0.05, held: 0 } as const;
/** CSEA vetted hits that are exact matches (removed at once; a specialist signs off the report on the match record). */
export const CSEA_EXACT_SHARE = 0.5;
export const HOLD = { cfpHold: 0.05, refusalShare: 0.005, possibleMinorShare: 0.005 } as const;
const CALL_PRICE = 0.0001; // one model call, harm units (≈ its USD price; negligible next to cfp and cfn)

/**
 * Thresholds (global; review 2). tau = cfp ÷ (cfp + cfn). For severity 2–3, the band is exactly where the model's
 * verdict can change the Bayes decision: pLo is where a positive verdict lifts the posterior to tau
 * (p·cfn·(1 − fnr) = (1 − p)·fpr·cfp + c), pHi where a negative verdict drops it to tau
 * ((1 − p)·cfp·(1 − fpr) = p·fnr·cfn + c). So the action rule is the binary verdict alone; no model "confidence" enters
 * it (review 3). For severity 0–1 with a model: pLo is capacity-set; pHi is the line above which a negative verdict
 * still leaves the posterior ≥ tau, p·fnr ÷ (p·fnr + (1 − p)(1 − fpr)) = tau, so those units go straight to a person.
 * Without a model (CSEA, NCII) every band unit goes to a specialist (pHi = pLo).
 */
export function edges(f: Family, llm: Llm | null = f.llm, cfnScale = 1) {
  const cfp = f.cfp;
  const cfn = f.cfn * cfnScale;
  const tau = cfp / (cfp + cfn);
  const holdLine = HOLD.cfpHold / (HOLD.cfpHold + cfn);
  if (f.sev >= 2 && llm) {
    const { fpr, fnr } = llm;
    const pLo = (fpr * cfp + CALL_PRICE) / (cfn * (1 - fnr) + fpr * cfp);
    const pHi = (cfp * (1 - fpr) - CALL_PRICE) / (cfp * (1 - fpr) + fnr * cfn);
    return { cfp, cfn, tau, pLo, pHi, holdLine };
  }
  const pLo = (f.pLo ?? 0.01) / cfnScale;
  if (!llm) return { cfp, cfn, tau, pLo, pHi: pLo, holdLine };
  const pHi = (tau * (1 - llm.fpr)) / (llm.fnr * (1 - tau) + tau * (1 - llm.fpr));
  return { cfp, cfn, tau, pLo, pHi, holdLine };
}
/** The score at which the calibrated probability reaches p. */
const scoreAt = (p: number, rate: number, d: number) => (logit(p) - logit(rate) + (d * d) / 2) / d;

/** People's error rates for a family's decisions. */
const humanRates = (f: Family) =>
  f.id === "csea"
    ? { fpr: HUMAN.cseaFpr, fnr: HUMAN.specialistFnr }
    : f.id === "ncii"
      ? { fpr: HUMAN.nciiFpr, fnr: HUMAN.specialistFnr }
      : f.sev === 0
        ? { fpr: HUMAN.specialistFpr, fnr: HUMAN.specialistFnr }
        : { fpr: HUMAN.fpr, fnr: HUMAN.fnr };

export type Flow = {
  units: number;
  violating: number;
  vettedExact: number; // acted on at once (CSEA exact vetted)
  vettedToPeople: number; // vetted matches a specialist views
  ownTp: number;
  ownFp: number; // own-bank matches: automated, precision ownPrecision
  autoTp: number; // classifier above pHi, severity 2–3 (final)
  autoFp: number;
  toModel: number; // model calls from the cascade
  modelTp: number;
  modelFp: number;
  modelFn: number; // the model's negatives on violating units, released or allowed
  accountTp: number;
  accountFp: number;
  accountFn: number;
  toPeople: number; // items a person decides (holds, positives, escalations, disagreements, vetted matches)
  peopleTp: number;
  peopleFp: number;
  peopleFn: number;
  disagreement: number; // severity 2–3 band units with p ≥ 0.5 that the model allowed, sent to a person (review 24)
  possibleMinor: number; // graphic band images with a possible-minor signal, sent to CSEA specialists (review 12)
  allowedViolating: number; // below pLo
  bandLoV: number; // violating units between the re-check edge and pLo (RECHECK)
  bandLoG: number;
  actionedTp: number;
  actionedFp: number;
  missed: number;
  exposedViews: number; // views of violating units before their action, plus all views of missed ones
};

/**
 * One family, one stream, a day. `override` changes the edges (curves, the fallback, policy-change scenarios).
 * Severity 2–3: below pLo allowed; above pHi removed (or to the model in no-auto languages); the band: account rules
 * (spam), else the model; escalations and disagreements (p ≥ 0.5, model says no) to a person. Severity 0–1: the band
 * is held; [pLo, pHi) to the model (if any) and every positive or escalation to a person, negatives released; ≥ pHi
 * straight to a person.
 */
export function flow(
  f: Family,
  stream: "text" | "image",
  override: { pLo?: number; pHi?: number; llm?: Llm } = {}
): Flow | null {
  const s = f[stream];
  if (!s) return null;
  const llm = override.llm ?? (stream === "text" && f.llmText ? f.llmText : f.llm);
  const e = edges(f, llm);
  const pLo = override.pLo ?? e.pLo;
  const pHi = override.pHi ?? e.pHi;
  const units = stream === "text" ? PLATFORM.text : PLATFORM.images;
  const v = units * s.rate;
  const g = units - v;
  const h = humanRates(f);
  const vetted = v * s.vetted;
  const vettedExact = f.id === "csea" ? vetted * CSEA_EXACT_SHARE : 0;
  const vettedToPeople = vetted - vettedExact;
  const ownTp = v * s.own;
  const ownFp = (ownTp / f.ownPrecision) * (1 - f.ownPrecision);
  const v1 = v - vetted - ownTp;
  const g1 = g - ownFp;
  const sLo = scoreAt(pLo, s.rate, s.d);
  const sHi = scoreAt(pHi, s.rate, s.d);
  const s50 = scoreAt(0.5, s.rate, s.d);
  const allowV = v1 * phi(sLo - s.d);
  const highV = v1 * (1 - phi(sHi - s.d));
  const highG = g1 * (1 - phi(sHi));
  const bandV = v1 - allowV - highV;
  const bandG = g1 - g1 * phi(sLo) - highG;
  const r: Flow = {
    units,
    violating: v,
    vettedExact,
    vettedToPeople,
    ownTp,
    ownFp,
    autoTp: 0,
    autoFp: 0,
    toModel: 0,
    modelTp: 0,
    modelFp: 0,
    modelFn: 0,
    accountTp: 0,
    accountFp: 0,
    accountFn: 0,
    toPeople: vettedToPeople,
    peopleTp: 0,
    peopleFp: 0,
    peopleFn: 0,
    disagreement: 0,
    possibleMinor: 0,
    allowedViolating: allowV,
    bandLoV: 0,
    bandLoG: 0,
    actionedTp: 0,
    actionedFp: 0,
    missed: 0,
    exposedViews: 0,
  };
  let peopleV = vettedToPeople;
  let peopleG = 0;
  const V = PLATFORM.viewsPerUnit;
  let personViews = 0; // views of violating units a person decides, before the decision
  if (f.sev >= 2 && llm) {
    const esc = llm.escalate + HOLD.refusalShare;
    // Above pHi: automated final removal, except in languages without enough calibration labels (to the model).
    r.autoTp = highV * (1 - NO_AUTO_SHARE);
    r.autoFp = highG * (1 - NO_AUTO_SHARE);
    let mV = bandV + highV * NO_AUTO_SHARE;
    let mG = bandG + highG * NO_AUTO_SHARE;
    // Possible-minor signal on graphic band images: to CSEA specialists, never to the model.
    if (f.id === "graphic") {
      r.possibleMinor = (bandV + bandG) * HOLD.possibleMinorShare;
      peopleV += bandV * HOLD.possibleMinorShare;
      peopleG += bandG * HOLD.possibleMinorShare;
      mV -= bandV * HOLD.possibleMinorShare;
      mG -= bandG * HOLD.possibleMinorShare;
    }
    // Account-integrity rules decide a share of the band without a model call (spam): fpr 1%, fnr 10%.
    r.accountTp = mV * f.accountShare * 0.9;
    r.accountFn = mV * f.accountShare * 0.1;
    r.accountFp = mG * f.accountShare * 0.01;
    mV *= 1 - f.accountShare;
    mG *= 1 - f.accountShare;
    r.toModel = mV + mG;
    // Disagreement: band units with p ≥ 0.5 the model allows go to a person, not out.
    const hiShareV = bandV > 0 ? (v1 * (phi(sHi - s.d) - phi(s50 - s.d))) / bandV : 0;
    const hiShareG = bandG > 0 ? (g1 * (phi(sHi) - phi(s50))) / bandG : 0;
    const decidedV = mV * (1 - esc);
    const decidedG = mG * (1 - esc);
    r.modelTp = decidedV * (1 - llm.fnr);
    r.modelFp = decidedG * llm.fpr;
    const negV = decidedV * llm.fnr;
    const negG = decidedG * (1 - llm.fpr);
    const disV = negV * hiShareV * f.disagreementToPeople;
    const disG = negG * hiShareG * f.disagreementToPeople;
    r.disagreement = disV + disG;
    r.modelFn = negV - disV;
    peopleV += mV * esc + disV;
    peopleG += mG * esc + disG;
    personViews = (mV * esc + disV) * V * EXPOSURE.person;
    r.exposedViews += r.modelTp * V * EXPOSURE.model;
  } else {
    // Severity 0–1: held. ≥ pHi to a person; [pLo, pHi) to the model if any.
    peopleV += highV;
    peopleG += highG;
    if (llm) {
      const esc = llm.escalate + HOLD.refusalShare;
      r.toModel = bandV + bandG;
      r.modelFn = bandV * (1 - esc) * llm.fnr; // released: the model said no
      peopleV += bandV * ((1 - esc) * (1 - llm.fnr) + esc);
      peopleG += bandG * ((1 - esc) * llm.fpr + esc);
    } else {
      peopleV += bandV;
      peopleG += bandG;
    }
  }
  r.toPeople = peopleV + peopleG;
  r.peopleTp = peopleV * (1 - h.fnr);
  r.peopleFn = peopleV * h.fnr;
  r.peopleFp = peopleG * h.fpr;
  r.actionedTp = r.vettedExact + r.ownTp + r.autoTp + r.modelTp + r.accountTp + r.peopleTp;
  r.actionedFp = r.ownFp + r.autoFp + r.modelFp + r.accountFp + r.peopleFp;
  r.missed = allowV + r.modelFn + r.accountFn + r.peopleFn;
  r.exposedViews += r.missed * V + (f.sev >= 2 ? personViews * (1 - h.fnr) : 0);
  // For RECHECK: violating and fine units between the re-check edge and pLo.
  const reach = RECHECK_REACH;
  const eRe = edges(f, llm, reach.factor);
  const sRe = scoreAt(Math.min(eRe.pLo, pLo), s.rate, s.d);
  r.bandLoV = v1 * (phi(sLo - s.d) - phi(sRe - s.d));
  r.bandLoG = g1 * (phi(sLo) - phi(sRe));
  return r;
}

/** Heavy-tailed reach: log-normal views (mean 48, σ = 2). Units past 1,000 views are re-checked with the miss cost
 * scaled by their expected views ÷ 48 (review 20). */
export const RECHECK_REACH = (() => {
  const sigma = PLATFORM.viewsSigma;
  const mu = Math.log(PLATFORM.viewsPerUnit) - (sigma * sigma) / 2; // ≈ 1.871
  const at = 1_000;
  const zUnits = (Math.log(at) - mu) / sigma;
  const shareUnits = 1 - phi(zUnits); // ≈ 0.0059
  const shareViews = 1 - phi(zUnits - sigma); // ≈ 0.302
  const meanAbove = (PLATFORM.viewsPerUnit * shareViews) / shareUnits; // ≈ 2,457
  return { at, shareUnits, shareViews, meanAbove, factor: meanAbove / PLATFORM.viewsPerUnit };
})();

const addFlows = (xs: (Flow | null)[]) => {
  const fs = xs.filter((x): x is Flow => x !== null);
  const out = {} as Flow;
  for (const k of Object.keys(fs[0]) as (keyof Flow)[]) out[k] = sum(fs.map((x) => x[k]));
  return out;
};

/** The cascade per family, a day, with the reach re-check (sheet §13). */
export const CASCADE = (() => {
  const R = RECHECK_REACH;
  const per = FAMILIES.map((f) => {
    const text = flow(f, "text");
    const image = flow(f, "image");
    const all = addFlows([text, image]);
    // Reach re-check: units below pLo that pass 1,000 views are re-scored with cfn × ≈ 51; those above the lowered
    // edge get a model call (families with a model). Caught violating units stop being seen after ≈ 1,000 views.
    let recheck = { calls: 0, caught: 0, wrongActions: 0, toPeople: 0, viewsSaved: 0 };
    if (f.llm) {
      const h = humanRates(f);
      const calls = (all.bandLoV + all.bandLoG) * R.shareUnits;
      const hitV = all.bandLoV * R.shareUnits * (1 - f.llm.fnr);
      const caught = f.sev >= 2 ? hitV : hitV * (1 - h.fnr);
      const fpModel = all.bandLoG * R.shareUnits * f.llm.fpr;
      recheck = {
        calls,
        caught,
        wrongActions: f.sev >= 2 ? fpModel : fpModel * h.fpr,
        toPeople: f.sev >= 2 ? 0 : hitV + fpModel,
        viewsSaved: caught * (R.meanAbove - R.at),
      };
    }
    const actionedTp = all.actionedTp + recheck.caught;
    const actionedFp = all.actionedFp + recheck.wrongActions;
    const missed = all.missed - recheck.caught;
    const exposedViews = all.exposedViews - recheck.viewsSaved;
    return {
      id: f.id,
      sev: f.sev,
      model: f.llm?.model ?? null,
      edges: edges(f),
      text,
      image,
      all,
      recheck,
      actionedTp,
      actionedFp,
      missed,
      precision: actionedTp / (actionedTp + actionedFp),
      recall: actionedTp / all.violating,
      prevalence: exposedViews / PLATFORM.views,
      prevalenceBeforeRecheck: all.exposedViews / PLATFORM.views,
      toModel: all.toModel + recheck.calls,
      toPeople: all.toPeople + recheck.toPeople,
    };
  });
  const tot = (pick: (x: (typeof per)[number]) => number) => sum(per.map(pick));
  return {
    per,
    violating: tot((x) => x.all.violating),
    toModel: tot((x) => x.toModel),
    band: tot((x) => x.all.toModel),
    recheckCalls: tot((x) => x.recheck.calls),
    toPeople: tot((x) => x.toPeople),
    actionedTp: tot((x) => x.actionedTp),
    actionedFp: tot((x) => x.actionedFp),
    missed: tot((x) => x.missed),
    vetted: tot((x) => x.all.vettedExact + x.all.vettedToPeople),
    own: tot((x) => x.all.ownTp + x.all.ownFp),
    autoAct: tot((x) => x.all.autoTp + x.all.autoFp),
    held: tot((x) => (x.sev < 2 ? x.all.toModel + x.all.toPeople - x.all.vettedToPeople : 0)),
    prevalence: tot((x) => x.prevalence),
  };
})();
export const cascadeOf = (id: FamilyId) => CASCADE.per.find((p) => p.id === id)!;

/**
 * Local law (review 2): a geo-scoped decision, separate from the global terms of service. Content that Kestrel's
 * terms allow but a market's law forbids (illustrative: hate-adjacent text illegal under national law in EU states,
 * the UK and India: 0.01%, 0.003%, 0.005% of that market's text units) is WITHHELD in that market only, with the legal
 * ground in the statement. The hate head scores it (d = 3.2); a withhold is still a speech restriction (cfp 6) and
 * a miss costs the market's legal exposure (cfn 12 EU, 9 UK and India). The same model call carries the market
 * addendum, so a unit already in the hate band needs no extra call; 50% of the local band is outside it (assumption).
 */
export const LOCAL_LAW = (() => {
  const hate = familyById("hate");
  const markets = [
    { id: "EU" as const, rate: 1e-4, cfn: 12 },
    { id: "UK" as const, rate: 3e-5, cfn: 9 },
    { id: "IN" as const, rate: 5e-5, cfn: 9 },
  ];
  const rows = markets.map((m) => {
    const share = MARKETS.find((x) => x.id === m.id)!.share;
    const f: Family = { ...hate, text: { rate: m.rate, d: 3.2, vetted: 0, own: 0 }, image: null, cfp: 6, cfn: m.cfn };
    const e = edges(f);
    const fl = flow(f, "text")!;
    const k = share; // the flow ran on all text units; scale to the market
    return {
      market: m.id,
      tau: e.tau,
      pLo: e.pLo,
      pHi: e.pHi,
      violating: fl.violating * k,
      withheldTp: fl.actionedTp * k,
      withheldFp: fl.actionedFp * k,
      missed: fl.missed * k,
      extraCalls: fl.toModel * k * 0.5,
      toPeople: fl.toPeople * k,
    };
  });
  // Art. 16 notices that claim illegality: 5% of EU reports; the model with the market addendum screens them, and the
  // 20% it finds plausible go to the legal queue (jurisdiction grounds, 90 s).
  const euNotices = PLATFORM.reportedItems * 0.3 * 0.05;
  return {
    rows,
    withheld: sum(rows.map((r) => r.withheldTp + r.withheldFp)),
    extraCalls: sum(rows.map((r) => r.extraCalls)),
    toPeople: sum(rows.map((r) => r.toPeople)),
    euNotices,
    legalQueue: euNotices * 0.2,
  };
})();

// ── User reports, notices, NCII requests and appeals (sheet §5, §14; review 10, 25, 26) ──────────────────────────

/**
 * Reports: 1.2M distinct reported units a day, 12% violating (illustrative). 20% are already actioned and closed at
 * once. The rest are ROUTED BY REASON before any model call (review 10): CSEA and NCII reasons → the CSEA or NCII
 * classifier first (never the model); the 10% / 20% it scores above a lowered edge → specialists; threats and self-harm
 * → the mid model, positives and escalations to the urgent pool; everything else → the family's small-model path.
 * The report reason is NOT put in the policy prompt (it anchors toward "violates", review 25); it is a routing and
 * priority signal. A unit a person decided under the current policy version is not re-queued by new reports (sticky).
 * Outcomes are counted: actions, wrong actions, a notice to every notifier (DSA Art. 16(5)), and notifier appeals of
 * "no action" (DSA Art. 20(1)) at 1% of those decisions.
 */
export const REPORTS = (() => {
  const items = PLATFORM.reportedItems;
  const open = items * (1 - 0.2); // 960,000
  const reasons = {
    spam: 0.4,
    hate: 0.3,
    graphic: 0.12,
    safety: 0.08,
    csea: 0.01,
    ncii: 0.01,
    terror: 0.01,
    other: 0.07,
  };
  const violating = 0.12;
  const toSpecialists = open * reasons.csea * 0.1 + open * reasons.ncii * 0.2; // 960 + 1,920
  const toMid = open * (reasons.safety + reasons.terror); // 86,400
  const toSmall = open * (reasons.spam + reasons.hate + reasons.graphic + reasons.other); // 854,400
  const midEsc = 0.02 + HOLD.refusalShare;
  const smallEsc = 0.02 + HOLD.refusalShare;
  // Blended model errors on reported units (illustrative): mid 2% / 6%, small 2.5% / 7%.
  const decided = (n: number, fpr: number, fnr: number, esc: number) => {
    const v = n * violating;
    const g = n - v;
    return { tp: v * (1 - esc) * (1 - fnr), fp: g * (1 - esc) * fpr, fn: v * (1 - esc) * fnr, people: n * esc };
  };
  const mid = decided(toMid, 0.02, 0.06, midEsc);
  const small = decided(toSmall, 0.025, 0.07, smallEsc);
  // Threat reports: every model positive goes to the urgent pool too (severity 1 is decided by a person).
  const urgentPeople = mid.tp + mid.fp + mid.people;
  const peopleGeneral = small.people;
  const actionsTp = small.tp + mid.tp * (1 - HUMAN.fnr) + toSpecialists * 0.5 * (1 - HUMAN.specialistFnr);
  const actionsFp = small.fp + mid.fp * HUMAN.fpr + toSpecialists * 0.5 * HUMAN.specialistFpr;
  const noAction = open - actionsTp - actionsFp;
  return {
    items,
    open,
    reasons,
    violating,
    toModel: toMid + toSmall, // 940,800
    toMid,
    toSmall,
    toSpecialists,
    urgentPeople,
    peopleGeneral,
    actionsTp,
    actionsFp,
    notifierNotices: items,
    notifierNoticesEu: items * 0.3,
    notifierAppeals: noAction * 0.01,
    trusted: PLATFORM.trustedFlaggerNotices,
  };
})();

/**
 * Appeals (review 26): 25% of wrong actions and 8% of right ones are appealed (2% for spam, and accounts with ≥ 3 spam
 * strikes get one appeal a week, halving spam appeals); every appeal goes to a person who did not decide first (DSA Art.
 * 20(6), F10), who sees the content, the rule and the user's statement first and the original rationale only on
 * request. Overturned: wrong actions (1 − fpr), right ones fnr. Appeals are ordered by severity and account standing.
 * Wrong actions = the cascade's + the reports path's.
 */
export const APPEALS = (() => {
  const rows = CASCADE.per.map((p) => {
    const rightRate = p.id === "spam" ? 0.02 * 0.5 : 0.08;
    const wrongRate = p.id === "spam" ? 0.25 * 0.5 : 0.25;
    const wrong = p.actionedFp * wrongRate;
    const right = p.actionedTp * rightRate;
    return { id: p.id, appeals: wrong + right, overturned: wrong * (1 - HUMAN.fpr) + right * HUMAN.fnr };
  });
  const fromReports = REPORTS.actionsFp * 0.25 + REPORTS.actionsTp * 0.05;
  const fromReportsOverturned = REPORTS.actionsFp * 0.25 * (1 - HUMAN.fpr) + REPORTS.actionsTp * 0.05 * HUMAN.fnr;
  const appeals = sum(rows.map((r) => r.appeals)) + fromReports;
  const overturned = sum(rows.map((r) => r.overturned)) + fromReportsOverturned;
  return {
    rows: rows.map((r) => ({ ...r, overturnRate: r.overturned / r.appeals })),
    fromReports,
    appeals,
    overturned,
    overturnRate: overturned / appeals,
    notifierAppeals: REPORTS.notifierAppeals,
  };
})();

// ── The policy-reading model's prompt and its price (sheet §11) ──────────────────────────────────────────────────

/**
 * One call reads ONE family's policy (adding policies costs "small but meaningful" accuracy, F19; F17's multi-policy
 * figure is an all-policies-correct metric, not this). The stable prefix (instructions, the family's global policy, the
 * market's local-law addendum, boundary examples in the unit's language group) is cached per (family, market, model):
 * 1,100 tokens ≥ the 512 minimum. The changing part: the unit, its thread, numeric signals (no report reason). Output: a
 * fixed JSON verdict (`violates`, `rule_id`, `local_illegal[]`, `escalate`, a short rationale): ≈ 90 tokens. No extended
 * thinking, so no hidden reasoning tokens (a gate compares low-effort reasoning on one family, review 34).
 */
export const CONTEXT = (() => {
  const blocks = [
    { id: "instructions", label: "Instructions and output schema", tokens: 200, stable: true },
    {
      id: "policy",
      label: "The family's global policy: definitions, criteria, precedence, escalation",
      tokens: 550,
      stable: true,
    },
    { id: "market", label: "Market addendum: local-law grounds for a geo-withhold", tokens: 100, stable: true },
    { id: "examples", label: "Five boundary examples in the unit's language group", tokens: 250, stable: true },
    {
      id: "content",
      label: "The unit: normalised and original text (OCR text for an image)",
      tokens: 120,
      stable: false,
    },
    { id: "thread", label: "Thread: parent post and two previous comments, truncated", tokens: 150, stable: false },
    {
      id: "signals",
      label: "Signals: classifier score bin, account age, strikes, injection flag",
      tokens: 80,
      stable: false,
    },
    { id: "reminder", label: "Output reminder", tokens: 30, stable: false },
  ] as const;
  const stable = sum(blocks.filter((b) => b.stable).map((b) => b.tokens)); // 1,100
  const changing = sum(blocks.filter((b) => !b.stable).map((b) => b.tokens)); // 380
  const image = Math.ceil(768 / 28) * Math.ceil(768 / 28); // 28 × 28 = 784 (a 768 × 768 copy)
  const output = 90;
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
  smallImage: callCost(MODEL.small, true),
  midText: callCost(MODEL.mid, false), // 0.00011 + 0.00076 + 0.0009
  midImage: callCost(MODEL.mid, true),
  // gpt-oss-safeguard-20b on Bedrock (F41): no cache discount assumed, ≈ 200 reasoning tokens at low effort.
  safeguardText: usd(CONTEXT.total, 0.07) + usd(CONTEXT.output + 200, 0.2),
  // Cache writes (review 50): prefixes per (family, market) for each model that calls them, rewritten at most once per
  // 5-minute TTL (288 a day): mid for terrorism, threats and CSEA text (3 × 5); small for hate, graphic, spam (3 × 5);
  // the prevalence labeller (mid, 5 families, one prefix each).
  cacheWritesPerDay:
    3 * 5 * 288 * usd(CONTEXT.stable, MODEL.mid.cacheWrite - MODEL.mid.cached) +
    3 * 5 * 288 * usd(CONTEXT.stable, MODEL.small.cacheWrite - MODEL.small.cached) +
    5 * 288 * usd(CONTEXT.stable, MODEL.mid.cacheWrite - MODEL.mid.cached),
};

/** Model calls a day and their cost: the cascade (by family and stream, at its model's price), the reach re-check,
 * local-law calls outside the hate band, reports, and the prevalence labeller (PREVALENCE, added below). */
export const LLM = (() => {
  const priceOf = (model: "small" | "mid", image: boolean) =>
    model === "mid" ? (image ? UNIT.midImage : UNIT.midText) : image ? UNIT.smallImage : UNIT.smallText;
  const rows = CASCADE.per.map((p) => {
    const f = familyById(p.id);
    const textModel = (f.llmText ?? f.llm)?.model ?? "small";
    const imageModel = f.llm?.model ?? "small";
    const text = p.text?.toModel ?? 0;
    const image = p.image?.toModel ?? 0;
    const recheck = p.recheck.calls; // priced as text (most re-checked units are text)
    const cost =
      text * priceOf(textModel, false) + image * priceOf(imageModel, true) + recheck * priceOf(textModel, false);
    return { id: p.id, model: textModel, text, image, recheck, cost };
  });
  const reports =
    REPORTS.toMid * UNIT.midText * 0.85 +
    REPORTS.toMid * UNIT.midImage * 0.15 +
    REPORTS.toSmall * (0.85 * UNIT.smallText + 0.15 * UNIT.smallImage);
  const local = LOCAL_LAW.extraCalls * UNIT.smallText;
  const enforcementCalls = sum(rows.map((r) => r.text + r.image + r.recheck)) + REPORTS.toModel + LOCAL_LAW.extraCalls;
  const enforcementPerDay = sum(rows.map((r) => r.cost)) + reports + local + UNIT.cacheWritesPerDay;
  return {
    rows,
    reports,
    local,
    enforcementCalls, // ≈ 3.7M
    shareOfUnits: enforcementCalls / PLATFORM.units,
    enforcementPerDay,
    peakCallsPerSecond: (enforcementCalls / 86_400) * PLATFORM.peakFactor,
    peakInputTokensPerSecond: (enforcementCalls / 86_400) * PLATFORM.peakFactor * CONTEXT.total,
  };
})();

// ── Classifiers, the fallback model and the buy option (sheet §5, §10; review 15, 16) ───────────────────────────

/**
 * Text: one multilingual encoder (≈ 300M parameters) with a head per family, 80 tokens a unit, 200,000 tokens a second
 * per GPU (gcase-answer PRICES.smallEncoderTokensPerSecond). Images: a multi-head classifier and the vendor CSEA
 * classifier at 500 images a second each, OCR at 200, an age-estimation head on the multi-head GPU. Peak × 1.3
 * headroom, two regions. Buy option, like for like (review 15): Rekognition replaces only the multi-head image
 * classifier (≈ 2.26 GPUs incl. headroom and regions ≈ 4,100 USD a month) at ≈ 126,000 USD a month.
 */
export const CLASSIFIERS = (() => {
  const textGpus = (PLATFORM.textPeakPerSecond * 80) / MODEL.smallEncoderTokensPerSecond; // ≈ 1.45
  const imageHeadGpus = PLATFORM.imagesPeakPerSecond / 500; // ≈ 0.87
  const imageGpus = imageHeadGpus + PLATFORM.imagesPeakPerSecond / 500 + PLATFORM.imagesPeakPerSecond / 200; // ≈ 3.91
  const gpus = Math.ceil((textGpus + imageGpus) * MODEL.gpuHeadroom) * 2;
  const perMonth = gpus * 24 * 30 * MODEL.gpuHour;
  const imageHeadPerMonth = imageHeadGpus * MODEL.gpuHeadroom * 2 * 24 * 30 * MODEL.gpuHour; // ≈ 4,100
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
  return {
    textGpus,
    imageGpus,
    gpus,
    perMonth,
    imageHeadPerMonth,
    rekognitionPerMonth: rekognition,
    perUnit: perMonth / 30 / PLATFORM.units,
  };
})();

/**
 * The fallback (review 16): self-hosted gpt-oss-safeguard-20b for text when the provider is down, sized for 30% of the
 * peak text call rate (the band is narrowed to its upper half during failover), kept warm in two regions. Throughput
 * per GPU (illustrative): 20,000 prefill and 2,500 decode tokens a second; a call = 1,480 in + 290 out (90 + ≈ 200
 * reasoning). Its own measured errors (illustrative): fpr 4%, fnr 9%, so its band edges differ.
 */
export const FALLBACK = (() => {
  const textShare =
    sum(LLM.rows.map((r) => r.text + r.recheck)) / Math.max(1, sum(LLM.rows.map((r) => r.text + r.image + r.recheck)));
  const peakText = LLM.peakCallsPerSecond * textShare;
  const covered = peakText * 0.3;
  const prefill = covered * CONTEXT.total;
  const decode = covered * (CONTEXT.output + 200);
  const gpusPerRegion = Math.ceil(Math.max(prefill / 20_000, decode / 2_500));
  const gpus = gpusPerRegion * 2;
  const llm: Llm = { fpr: 0.04, fnr: 0.09, escalate: 0.05, model: "small" };
  const hateEdges = edges(familyById("hate"), llm);
  return {
    peakText,
    covered,
    prefill,
    decode,
    gpus,
    perMonth: gpus * 24 * 30 * MODEL.gpuHour,
    llm,
    hateEdges,
    latency: { p50: 300 + (290 / 250) * 1_000, p95: 800 + (290 / 150) * 1_000 }, // first token + 290 tokens
  };
})();

// ── Calibration in the tails (sheet §13; review 3) ───────────────────────────────────────────────────────────────

/**
 * Calibration sample: live traffic, stratified by classifier-score bin, so the bins at each operating edge (pLo, tau,
 * pHi) get labels at live base rates. To estimate P ≈ 0.02 within ± 50% (relative) at 95% a bin needs
 * z²(1 − p) ÷ (p · 0.5²) ≈ 753 labels. Per quarter: 3 edges × 753 × 7 families × 13 calibrated language groups,
 * labelled by experts at 30 s, inverse-inclusion weighted. The model's confusion (fpr, fnr) is measured per score bin
 * on the same labels, so the band edges use measured values per bin, not constants. Drift monitors: score PSI per
 * family × language daily, band volume, model–classifier disagreement rate. A language group needs ≥ 753 labels at
 * each edge before automated final actions are allowed in it (LANGUAGES.auto).
 */
export const CALIBRATION = (() => {
  const perBin = Math.ceil((Z975 * Z975 * (1 - 0.02)) / (0.02 * 0.5 * 0.5)); // 753
  const groups = LANGUAGES.filter((l) => l.auto).length; // 13
  const perQuarter = 3 * perBin * FAMILIES.length * groups;
  const perDay = perQuarter / 91;
  return { perBin, groups, perQuarter, perDay, hoursPerDay: (perDay * 30) / 3_600, minLabelsForAuto: perBin };
})();

// ── Measuring what was missed: prevalence (sheet §13, deep dive 4; review 4, 29) ─────────────────────────────────

/**
 * Prevalence = violating views ÷ all views (F25–F27), for five families (CSEA and NCII are not sampled into any model
 * or general labeller: CSEA is measured by re-scanning sampled public images against updated hash lists, NCII by
 * StopNCII and request re-scans). Views are sampled uniformly from the impression log, the content is snapshotted at
 * sample time and stamped with the policy version in force, and every sampled image passes the hash and CSEA classifier
 * first (a hit goes to a specialist, never on).
 * Labeller: the MID model with a measurement prompt (the family's policy text, no classifier scores, no account
 * signals), so it is not the model that made the decisions for hate, graphic and spam (small). For terrorism and threats
 * (enforced by the mid model) independence is partial: a different prompt and inputs, and a doubled human audit.
 * People confirm every labeller positive (so the labeller's false positives are removed) and audit 1% of its
 * negatives (2% for terrorism and threats). Sensitivity is measured each week on live positives found by OTHER routes
 * (confirmed reports, trusted flaggers, upheld appeals; 1,000 a week per family, 200 for terrorism), not on the
 * balanced gold set (review 4b): point 0.90 (illustrative), times the confirmer's (1 − fnr) = 0.864.
 * Estimate: p̂ = (confirmed positives ÷ n) ÷ detection (Rogan–Gladen with specificity ≈ 1 after confirmation); the
 * interval uses the exact Poisson bound on the count divided by the detection's lower bound, and in production a
 * bootstrap over strata. No design-effect gain is claimed (dossier F27 correction).
 * N1 is judged on a rolling 4-week window. Labels a week per family are the fewest (on a 5,000 grid) that pass N1 in
 * ≥ 95% of windows at the design's true rate. Change detection: a rise between consecutive 4-week windows, at 80%
 * power, is reported as the minimum detectable relative rise (MDE).
 */
export const PREVALENCE = (() => {
  const families = ["terror", "safety", "hate", "graphic", "spam"] as const;
  const targets: Record<(typeof families)[number], number> = {
    terror: 1.5e-4,
    safety: 1.5e-4,
    hate: 8e-4,
    graphic: 1.5e-4,
    spam: 9e-4,
  };
  const panel: Record<(typeof families)[number], number> = {
    terror: 200,
    safety: 1_000,
    hate: 1_000,
    graphic: 1_000,
    spam: 1_000,
  };
  const sensPoint = 0.9;
  const det = sensPoint * (1 - HUMAN.fnr); // 0.864
  const rows = families.map((id) => {
    const p = cascadeOf(id).prevalence;
    const target = targets[id];
    const panel4 = panel[id] * 4;
    const sensLo = wilson(sensPoint * panel4, panel4).lo;
    const detLo = sensLo * (1 - HUMAN.fnr);
    const passProb = (nWeek: number) => {
      const n4 = nWeek * 4;
      let kMax = -1;
      while (poissonUpper95(kMax + 1) / (n4 * detLo) <= target) kMax++;
      return kMax < 0 ? 0 : poissonCdf(kMax, p * det * n4);
    };
    let nWeek = 5_000;
    while (passProb(nWeek) < 0.95 && nWeek < 400_000) nWeek += 5_000;
    const n4 = nWeek * 4;
    const expected = p * det * n4; // confirmed positives expected in a window
    const ub = poissonUpper95(Math.round(expected)) / (n4 * detLo);
    const lo =
      Math.round(expected) > 0 ? bisect((l) => poissonAtLeast(Math.round(expected), l), 0.025, 0, 1e6) / (n4 * det) : 0;
    const mde = (Z975 + Z80) * Math.sqrt(2 / Math.max(1e-9, expected)); // relative, between two windows
    const nFor25 = nWeek * (mde / 0.25) ** 2; // labels a week for a 25% rise at 80% power
    const audit = id === "terror" || id === "safety" ? 0.02 : 0.01;
    const humanPerWeek = nWeek * (p * sensPoint + 0.001) + nWeek * audit;
    return {
      id,
      prevalence: p,
      per10k: p * 1e4,
      target,
      nWeek,
      passProb: passProb(nWeek),
      expectedPositives4w: expected,
      ub4w: ub,
      lo4w: lo,
      mde,
      nFor25,
      sensLo,
      humanPerWeek,
    };
  });
  const labelsPerWeek = sum(rows.map((r) => r.nWeek));
  const labelsPerDay = labelsPerWeek / 7;
  const priceMid = 0.85 * UNIT.midText + 0.15 * UNIT.midImage;
  return {
    rows,
    det,
    labelsPerWeek,
    labelsPerDay,
    modelCostPerDay: labelsPerDay * priceMid,
    humanLabelsPerDay: sum(rows.map((r) => r.humanPerWeek)) / 7,
  };
})();
export const prevalenceOf = (id: string) => PREVALENCE.rows.find((r) => r.id === id)!;

// ── People: an hourly roster with skills, languages and wellbeing limits (sheet §15.2; review 11, 17, 30) ───────

/**
 * Queues (items a day × handle seconds, illustrative; model escalations are the hardest units, so 45 s for hate, not
 * the outsourced 15–20 s pace, F37):
 *   specialists (urgent, severe; 3 regional hubs: EU+UK 38%, India 22%, US+rest 40%): CSEA 180 s, NCII 120 s,
 *     terrorism 120 s, possible-minor graphic images 90 s, CSEA/NCII-reason reports 150 s, NCII victim requests 120 s;
 *   threats and self-harm (urgent, SEVERE, 16 language pools): cascade 60 s, threat reports 60 s;
 *   general (24 h, by language): hate 45 s, graphic 30 s (severe), spam 25 s, escalated reports 45 s, trusted
 *     flaggers 60 s, legal-ground notices 90 s, local-law decisions 45 s, appeals 60 s, notifier appeals 45 s, QA 30 s
 *     (+ 10% adjudicated by an expert at 60 s, review 37), prevalence labels 20 s, calibration labels 30 s.
 * Roster: hourly arrivals follow w(h) = 1 + 0.75·cos(2π(h − 20) ÷ 24) (peak 1.75 × the mean at 20:00). Urgent pools:
 * the fewest in-queue reviewers c each hour with an Erlang C p95 wait ≤ 15 min (specialists) or ≤ 10 min (threats),
 * and at least 1 per pool per hour (2 per specialist hub); on shift = c ÷ in-queue share. Severe work (specialists,
 * threats, graphic) is at most 4 of 8 hours (in-queue share 0.5); the other 2 productive hours go to non-severe work.
 * General work is staffed at its daily mean ÷ 0.85 (the evening backlog drains overnight; worst wait computed).
 * FTE = on-shift hours a day ÷ 8 × 7 ÷ 5 × 1.15. Support roles (team leads 1:15, QA analysts, trainers, workforce
 * planning, counsellors 1:50, managers) add 18%. 25 USD an hour loaded (agents), × 1.3 for support roles.
 */
function roster(severeInQueue: number) {
  const c = (id: FamilyId) => cascadeOf(id);
  const minor = c("graphic").all.possibleMinor;
  const qaItems =
    0.005 *
    sum(
      CASCADE.per
        .filter((p) => p.sev >= 2)
        .map(
          (p) => p.all.ownTp + p.all.ownFp + p.all.autoTp + p.all.autoFp + p.all.modelTp + p.all.modelFp + p.all.modelFn
        )
    );
  const specialist = [
    { id: "csea", items: c("csea").toPeople, s: 180 },
    { id: "ncii", items: c("ncii").toPeople, s: 120 },
    { id: "terror", items: c("terror").toPeople, s: 120 },
    { id: "possible minor", items: minor, s: 90 },
    { id: "CSEA/NCII reports", items: REPORTS.toSpecialists, s: 150 },
    { id: "NCII requests", items: PLATFORM.nciiRequests, s: 120 },
  ];
  const threats = [
    { id: "threats and self-harm", items: c("safety").toPeople, s: 60 },
    { id: "threat reports", items: REPORTS.urgentPeople, s: 60 },
  ];
  const general = [
    { id: "hate", items: c("hate").toPeople, s: 45, severe: false },
    { id: "graphic", items: c("graphic").toPeople - minor, s: 30, severe: true },
    { id: "spam", items: c("spam").toPeople, s: 25, severe: false },
    { id: "reports (escalated)", items: REPORTS.peopleGeneral, s: 45, severe: false },
    { id: "trusted flaggers", items: PLATFORM.trustedFlaggerNotices, s: 60, severe: false },
    { id: "legal-ground notices", items: LOCAL_LAW.legalQueue, s: 90, severe: false },
    { id: "local law", items: LOCAL_LAW.toPeople, s: 45, severe: false },
    { id: "appeals", items: APPEALS.appeals, s: 60, severe: false },
    { id: "notifier appeals", items: APPEALS.notifierAppeals, s: 45, severe: false },
    { id: "QA", items: qaItems * 1.2, s: 30 + (0.1 * 60) / 1.2, severe: false }, // 10% of QA adjudicated (60 s)
    { id: "prevalence", items: PREVALENCE.humanLabelsPerDay, s: 20, severe: false },
    { id: "calibration", items: CALIBRATION.perDay, s: 30, severe: false },
  ];
  const hours = (q: { items: number; s: number }) => (q.items * q.s) / 3_600;
  const w = (h: number) => 1 + 0.75 * Math.cos((2 * Math.PI * (h - 20)) / 24);
  // An urgent pool's on-shift person-hours a day.
  const poolHours = (itemsPerDay: number, service: number, targetWait: number, minC: number, inQueue: number) => {
    let total = 0;
    let peak = 0;
    for (let h = 0; h < 24; h++) {
      const lambda = (itemsPerDay * w(h)) / 86_400; // per second
      let servers = minC;
      while (erlang(servers, lambda, service).p95 > targetWait) servers++;
      total += servers / inQueue;
      peak = Math.max(peak, servers);
    }
    return { total, peak };
  };
  const specItems = sum(specialist.map((q) => q.items));
  const specService = sum(specialist.map((q) => q.items * q.s)) / specItems;
  const hubs = [0.38, 0.22, 0.4].map((share) => poolHours(specItems * share, specService, 900, 2, severeInQueue));
  const thrItems = sum(threats.map((q) => q.items));
  const langPools = LANGUAGES.map((l) => poolHours(thrItems * l.share, 60, 600, 1, severeInQueue));
  const urgentOnShift = sum(hubs.map((x) => x.total)) + sum(langPools.map((x) => x.total));
  // Severe pools spend severeInQueue of on-shift time in severe queues and the rest of the 0.75 on non-severe work.
  const spareFromSevere = urgentOnShift * (0.75 - severeInQueue) * 0.85;
  const severeGeneralHours = sum(general.filter((q) => q.severe).map(hours));
  const otherGeneralHours = sum(general.filter((q) => !q.severe).map(hours));
  const severeGeneralOnShift = severeGeneralHours / (0.85 * severeInQueue);
  const spareFromGraphic = severeGeneralOnShift * (0.75 - severeInQueue) * 0.85;
  const generalOnShift = Math.max(0, otherGeneralHours - spareFromSevere - spareFromGraphic) / (0.85 * 0.75);
  const onShift = urgentOnShift + severeGeneralOnShift + generalOnShift;
  const toFte = (personHours: number) => (personHours / 8) * (7 / 5) * 1.15;
  const agents = toFte(onShift);
  const support = agents * 0.18;
  const fte = agents + support;
  const perFteMonth = 25 * 173.3;
  const perMonth = agents * perFteMonth + support * perFteMonth * 1.3;
  // General backlog: staffed flat at mean ÷ 0.85; worst backlog over a day (hours of work) and its wait.
  const genHours = severeGeneralHours + otherGeneralHours;
  const rate = genHours / 24 / 0.85;
  let backlog = 0;
  let worst = 0;
  for (let h = 0; h < 48; h++) {
    backlog = Math.max(0, backlog + (genHours * w(h % 24)) / 24 - rate);
    worst = Math.max(worst, backlog);
  }
  // Handle-time sensitivity: non-urgent handle times × 1.5 and × 2 (review 11c).
  const sens = (k: number) => {
    const extra = (otherGeneralHours + severeGeneralHours) * (k - 1);
    return toFte(onShift + extra / (0.85 * 0.75)) * 1.18;
  };
  const queues = [
    ...specialist.map((q) => ({ ...q, pool: "specialists", hours: hours(q) })),
    ...threats.map((q) => ({ ...q, pool: "threats", hours: hours(q) })),
    ...general.map((q) => ({
      id: q.id,
      items: q.items,
      s: q.s,
      pool: q.severe ? "general (severe)" : "general",
      hours: hours(q),
    })),
  ];
  return {
    queues,
    items: sum(queues.map((q) => q.items)),
    hours: sum(queues.map((q) => q.hours)),
    severeHours: sum(specialist.map(hours)) + sum(threats.map(hours)) + severeGeneralHours,
    specialistPeak: hubs.map((x) => x.peak),
    threatPeakTotal: sum(langPools.map((x) => x.peak)),
    urgentOnShift,
    severeGeneralOnShift,
    generalOnShift,
    onShift,
    agents,
    support,
    fte,
    perMonth,
    // Non-severe work left after severe reviewers' spare hours: > 0 means the 4-hour cap costs no extra staff.
    capSlackHours: otherGeneralHours - spareFromSevere - spareFromGraphic,
    spareHours: spareFromSevere + spareFromGraphic,
    worstBacklogHours: worst,
    worstWaitHours: worst / rate,
    fteAt15: sens(1.5),
    fteAt2: sens(2),
    perMonthAt2: sens(2) * perFteMonth * 1.05,
  };
}
export const PEOPLE = roster(0.5);
/** Without the 4-hour severe cap (severe work could fill the 6 productive hours): what the cap costs. */
export const PEOPLE_NO_CAP = (() => {
  const r = roster(0.75);
  return { fte: r.fte, perMonth: r.perMonth, capFte: PEOPLE.fte - r.fte, capPerMonth: PEOPLE.perMonth - r.perMonth };
})();

/**
 * Capacity buys recall on threats and self-harm (review 41). Harm units are not USD: the curve shows both, and the
 * policy lead signs the operating point. A handling hour costs 25 USD × 8 paid ÷ 5.1 handled ≈ 39.2 USD (before the
 * severe cap and roster effects, which add ≈ 2× here). Harm avoided per step = fewer misses × cfn − extra wrong
 * actions × cfp.
 */
export const SAFETY_CURVE = [0.02, 0.01, 0.005, 0.0025, 0.00125]
  .map((pLo) => {
    const f = familyById("safety");
    const a = addFlows([flow(f, "text", { pLo }), flow(f, "image", { pLo })]);
    const hours = (a.toPeople * 60) / 3_600;
    const usdPerDay = hours * ((25 * 8) / (6 * 0.85)) + a.toModel * (0.9 * UNIT.midText + 0.1 * UNIT.midImage);
    return {
      pLo,
      recall: a.actionedTp / a.violating,
      missed: a.missed,
      wrong: a.actionedFp,
      toModel: a.toModel,
      toPeople: a.toPeople,
      hours,
      usdPerDay,
    };
  })
  .map((x, i, xs) => ({
    ...x,
    harmAvoided:
      i === 0
        ? null
        : (xs[i - 1].missed - x.missed) * familyById("safety").cfn -
          (x.wrong - xs[i - 1].wrong) * familyById("safety").cfp,
    extraUsd: i === 0 ? null : x.usdPerDay - xs[i - 1].usdPerDay,
  }));

// ── Latency per path (sheet §12) ─────────────────────────────────────────────────────────────────────────────────

/**
 * Stage fits are illustrative log-normals. Parallel branches: the maximum of the draws; serial paths: p50 sum
 * (approximate) and p95 sum (conservative). Images: local exact hashes (MD5, SHA-1 against the NCMEC and IWF lists,
 * F59) and PDQ against GIFCT, StopNCII and own banks run in-process; PhotoDNA Cloud is called with a 600 ms timeout:
 * on timeout or outage the image publishes on the local checks with limited distribution and is re-checked within an
 * hour (the stated degraded mode); if the CSEA classifier is down, image posts FAIL CLOSED (pending, author only).
 * Severity 0–1 band units are held: their time to visible (if released) is the model path; the author sees "pending".
 */
export const LATENCY = (() => {
  const hop: Stage = { p50: 5, p95: 15 };
  const normalise: Stage = { p50: 2, p95: 5 };
  const rules: Stage = { p50: 4, p95: 12 };
  const features: Stage = { p50: 6, p95: 20 };
  const textClassifier: Stage = { p50: 20, p95: 60 };
  const decide: Stage = { p50: 2, p95: 5 };
  const textPre = path([hop, normalise, rules, par([features, textClassifier]), decide]);
  const fetch: Stage = { p50: 25, p95: 70 };
  const hashCompute: Stage = { p50: 8, p95: 20 };
  const localBanks: Stage = { p50: 5, p95: 15 };
  const photoDna: Stage = { p50: 150, p95: 400 }; // capped by the 600 ms timeout
  const imageClassifiers: Stage = { p50: 30, p95: 80 };
  const ocr: Stage = { p50: 60, p95: 150 };
  const ocrText: Stage = { p50: 20, p95: 60 };
  const hashBranch = path([hashCompute, par([localBanks, photoDna])]);
  const ocrBranch = path([ocr, ocrText]);
  const imagePre = path([fetch, par([hashBranch, imageClassifiers, ocrBranch]), decide]);
  const imagePreDegraded = path([fetch, par([path([hashCompute, localBanks]), imageClassifiers, ocrBranch]), decide]);
  const gen = (first: Stage, tps50: number, tps95: number): Stage => ({
    p50: first.p50 + (CONTEXT.output / tps50) * 1_000,
    p95: first.p95 + (CONTEXT.output / tps95) * 1_000,
  });
  const enqueue: Stage = { p50: 5, p95: 50 };
  const queueWait: Stage = { p50: 200, p95: 3_000 }; // provisioned for the peak (≈ 106 calls a second)
  const smallText = gen({ p50: 400, p95: 900 }, 150, 100);
  const smallImage = gen({ p50: 600, p95: 1_300 }, 150, 100);
  const midText = gen({ p50: 500, p95: 1_100 }, 70, 45);
  const act: Stage = { p50: 20, p95: 60 };
  const modelText = path([enqueue, queueWait, smallText, act]);
  const modelImage = path([enqueue, queueWait, smallImage, act]);
  const modelMid = path([enqueue, queueWait, midText, act]);
  const fallback = path([enqueue, queueWait, FALLBACK.latency, act]);
  const retry = { p50: modelText.p50, p95: 10_000 + fallback.p95 }; // timeout at 10 s, then the fallback
  // A held threats unit released by the model: visible to others after the pre-publish check + the mid model.
  const heldRelease = { p50: textPre.p50 + modelMid.p50, p95: textPre.p95 + modelMid.p95 };
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
    imagePreDegraded,
    modelText,
    modelImage,
    modelMid,
    fallback,
    retry,
    heldRelease,
  };
})();

/** N3 targets. Human decisions are hours from entering a person's queue. */
export const TARGETS = {
  textPreP50Ms: 50,
  textPreP95Ms: 150,
  imagePreP50Ms: 300,
  imagePreP95Ms: 800,
  modelP50Ms: 10_000,
  modelP95Ms: 60_000,
  heldReleaseP95Ms: 10_000, // a held unit the model clears is visible within 10 s p95
  humanP95Hours: {
    csea: 1,
    ncii: 1,
    terror: 1,
    safety: 0.5,
    trusted: 24,
    hate: 24,
    graphic: 24,
    spam: 48,
    appeals: 72,
  },
  nciiRequestHours: 48, // TAKE IT DOWN (F53); India 24 h for the depicted person's complaint (F57)
  removalOrderMinutes: 60, // EU TCO Regulation Art. 3(3) (F51)
} as const;

// ── Shipping a policy change in a day (sheet §13, deep dive 3; review 6, 46) ─────────────────────────────────────

/**
 * Worked on a new coded slur in hate (illustrative). A new term scores near zero on the classifier (that is why it is
 * new), so a lower band edge cannot catch it (review 6). Day-0 mechanism: a TERM RULE in the rules engine (regex over
 * normalised text and OCR text, deployed without a release, F31) routes every match to the model with the new policy
 * version, whatever the score; a BACKFILL runs the rule over the last 30 days of published content; reviewers get the
 * guideline the same day with a short quiz; appeals are judged under the version in force at the action, which the
 * statement names. Examples are translated into the 13 calibrated language groups; the gold set gets 400 new items
 * (200 violating, 200 near-miss) found by searching the normalised index and the report queue, double-labelled with
 * adjudication. Canary: one market for 4 hours with a boosted QA sample (5% of its hate actions) and shadow disagreement.
 */
export const POLICY_CHANGE = (() => {
  const experts = 4;
  const newItems = 400;
  const findHours = 1; // search the index and reports, pick 400
  const labelHours = (newItems * 1.2 * 45) / 3_600 / experts + 0.25; // 1.5 h + 15 min adjudication
  const translateHours = 2; // in parallel with labelling
  const evalCalls = 2 * (1_000 + newItems); // old and new prompt on the locked hold-out + the new items
  const evalMinutes = ((evalCalls / 50) * 1.2) / 60;
  const ruleMatchesPerDay = 20_000; // live units matching the term rule
  const backfillMatches = 400_000; // 30 days of published content
  const hateBandPerDay = cascadeOf("hate").all.toModel;
  const shadowHours = 6;
  const shadowCalls = (hateBandPerDay * shadowHours) / 24 + (ruleMatchesPerDay * shadowHours) / 24;
  const disagreement = 0.025;
  const sampled = 300;
  const reviewHours = (sampled * 60) / 3_600 / experts;
  const ukHateActionsPerHour = ((cascadeOf("hate").actionedTp + cascadeOf("hate").actionedFp) / 24) * 0.08;
  const canaryQa = ukHateActionsPerHour * 4 * 0.05;
  const canaryPrecision = wilson(0.9 * canaryQa, canaryQa);
  const steps = [
    { id: "write", label: "Write the rule, the term list and 5 boundary examples", hours: 2 },
    { id: "find", label: "Find 400 new gold items in the index and reports", hours: findHours },
    {
      id: "label",
      label: "Experts label and adjudicate (translations in parallel)",
      hours: Math.max(labelHours, translateHours),
    },
    { id: "eval", label: "Old and new prompt on the hold-out + new items", hours: evalMinutes / 60 },
    { id: "shadow", label: "Shadow on the hate band and rule matches", hours: shadowHours },
    { id: "review", label: "Experts read 300 sampled disagreements", hours: reviewHours },
    { id: "canary", label: "Canary in one market, boosted QA", hours: 4 },
    { id: "rollout", label: "All markets; the backfill starts", hours: 1 },
  ];
  const gates = {
    newRuleRecall: { k: 186, n: 200, floor: 0.85, ...wilson(186, 200) },
    nearMissFine: { k: 190, n: 200, floor: 0.9, ...wilson(190, 200) },
    disagreementsExplained: { k: 282, n: sampled, floor: 0.85, ...wilson(282, sampled) },
  };
  return {
    experts,
    newItems,
    labelHours,
    evalCalls,
    evalCostUsd: evalCalls * UNIT.smallText,
    shadowCalls,
    shadowCostUsd: shadowCalls * UNIT.smallText,
    disagreements: shadowCalls * disagreement,
    sampled,
    reviewHours,
    ruleMatchesPerDay,
    ruleCostPerDay: ruleMatchesPerDay * UNIT.smallText,
    backfillMatches,
    backfillCostUsd: backfillMatches * UNIT.smallText,
    backfillActions: backfillMatches * 0.6, // illustrative: 60% of matches violate under the new rule
    canaryQa,
    canaryPrecision,
    steps,
    totalHours: sum(steps.map((s) => s.hours)),
    gates,
  };
})();

// ── Release gates and the live guard (sheet §13; review 5, 27) ───────────────────────────────────────────────────

/**
 * Gold set per family with a model: 2,000 items split into a DEV half (prompt iteration) and a LOCKED hold-out half
 * (the gate): 500 violating, 500 fine near the boundary, stratified by language group, refreshed quarterly. The gate is
 * PAIRED: both versions score the same hold-out items; non-inferiority on the difference of recall and of specificity,
 * discordant rate ≈ 3% (illustrative), SE = √(0.03 ÷ 500) ≈ 0.0077. With 5 families × 2 metrics, each metric's margin
 * is set so an equal release passes all ten with ≥ 90%: per metric 0.9^(1/10) ≈ 0.9895 → z ≈ 2.31, margin
 * δ = (1.645 + 2.31) × SE ≈ 3.1 points; a true drop of 3 points is caught ≈ 94% of the time. Language and market
 * slices are warnings (a point drop > 5 points), not gates. Precision is reported reweighted to live band mix.
 * Live guard: per family × market × language × rule, on ratios (QA disagreement in a boosted sample, overturn rate,
 * the newest version's share of actions) with limits from historical variance (overdispersed, × 3 Poisson variance),
 * and a REPLAY of 5,000 known-fine units each hour through the new version: ≥ 4 actions on it in an hour rolls back.
 */
export const GATES = (() => {
  const perSide = 500;
  const discordant = 0.03;
  const se = Math.sqrt(discordant / perSide);
  const metrics = 10;
  const zEach = bisect(phi, 0.9 ** (1 / metrics), -8, 8);
  const margin = (Z95 + zEach) * se;
  const catchProb = (drop: number) => phi((drop - margin) / se + Z95);
  // Count guard for comparison (why counts alone fail): hate in Germany ≈ 9% of hate actions.
  const hateHourly = (cascadeOf("hate").actionedTp + cascadeOf("hate").actionedFp) / 24;
  const deHourly = hateHourly * 0.09;
  const deSdOver = Math.sqrt(deHourly * 3);
  const fpShare = cascadeOf("hate").actionedFp / (cascadeOf("hate").actionedTp + cascadeOf("hate").actionedFp);
  // Replay: 5,000 known-fine units an hour; today's false-action rate on them ≈ 0.01% → Poisson(0.5); ≥ 4 trips
  // (a false trip ≈ once in 23 days); a bug that raises the rate 10× (Poisson(5)) trips within the hour ≈ 73%.
  const replayFalseTrip = poissonAtLeast(4, 5_000 * 0.0001);
  const replayCatchDouble = poissonAtLeast(4, 5_000 * 0.001);
  return {
    perSide,
    discordant,
    se,
    zEach,
    margin,
    catch3: catchProb(0.03),
    catch5: catchProb(0.05),
    hateHourly,
    deHourly,
    deDoublingShare: fpShare, // a doubling of FP adds this share in DE too
    deGuardShare: (4 * deSdOver) / deHourly, // what a 4-sd count guard needs to see
    replayFalseTrip,
    replayCatch10x: replayCatchDouble,
  };
})();

/** QA double review: 0.5% of automated decisions (removals and band allows) to a blind second person; 10% of QA
 * disagreements adjudicated by an expert; precision reported against adjudicated labels (review 37). */
export const QA = CASCADE.per
  .filter((p) => p.sev >= 2)
  .map((p) => {
    const a = p.all;
    const removals = a.ownTp + a.ownFp + a.autoTp + a.autoFp + a.modelTp + a.modelFp + a.accountTp + a.accountFp;
    const sampledWeek = removals * 0.005 * 7;
    const precision = (a.ownTp + a.autoTp + a.modelTp + a.accountTp) / removals;
    const w = wilson(precision * sampledWeek, sampledWeek);
    return { id: p.id, removalsPerDay: removals, sampledWeek, precision, halfWidthPoints: ((w.hi - w.lo) / 2) * 100 };
  });

// ── Adversarial adaptation (sheet §15, deep dive 5; review 24, 25, 35, 54) ───────────────────────────────────────

/**
 * Monthly: 10 attack families × 100 crafted units each through the full cascade. Attack success per family with its
 * Wilson interval: 100 a family separates families that differ by ≥ 15 points (15 of 100 → 9.3–23.3%). Worked example
 * (illustrative): homoglyph and zero-width slurs succeed 23 of 100 before the confusables fold is extended, 3 of 100
 * after. Family 7 (instructions to the model) targets a FALSE ALLOW; its controls are an injection detector (rules + a
 * small classifier for "moderator note", role tokens, instructions, also in OCR text and the thread), the disagreement
 * route (high classifier score + model "no" → a person, `disagreementToPeople`), and rate limits on probing accounts.
 */
export const REDTEAM = {
  families: [
    "Homoglyphs, zero-width characters, leetspeak",
    "Words split across comments or lines",
    "Text inside an image",
    "Image edits against the hash: crop, rotate, border, mirror",
    "New coded terms and slurs, incl. LLM-paraphrased hate",
    "Context flips: quoting to condemn vs to endorse; counter-speech; reclaimed terms",
    "Instructions aimed at the model, in the post, the thread or the image",
    "Code-switching and romanised scripts (Hinglish)",
    "Account tactics: fresh accounts, slow ramps, probing the oracle",
    "Synthetic media: AI-generated images, incl. AI-generated CSAM (reportable like any CSAM)",
  ],
  perFamily: 100,
  before: wilson(23, 100),
  after: wilson(3, 100),
  ci15: wilson(15, 100),
} as const;

/**
 * A report brigade (review 25): 300 linked accounts report 300 of one user's posts in an hour. v1 sent each to the
 * model with the report reason in the prompt: at fpr 3%, ≈ 9 wrong removals. Now: the reason is not in the prompt,
 * a unit is re-reviewed only on new information or a new policy version (sticky), and a burst from linked accounts
 * routes the target's units to one person, who decides once. Notifiers who repeat manifestly unfounded reports are
 * warned, then suspended from reporting (DSA Art. 23, F61).
 */
export const BRIGADE = { posts: 300, v1WrongRemovals: 300 * 0.03, nowWrongRemovals: 0, toPerson: 1 } as const;

// ── Legal duties, records and storage (sheet §7, §14; review 7, 8, 19, 36) ───────────────────────────────────────

/**
 * Statements of reasons (DSA Art. 17, F9, F54): every restriction on an EU user, incl. demotion. Position (option A,
 * legal sign-off required): limited distribution of a severity 2–3 band unit for the ≈ 1.2 / 4.9 s the model takes is
 * a precaution that ends in a decision; a statement is issued only when a restriction remains. Risk: a regulator may
 * treat every demotion as a restriction; then the EU band adds ≈ the count below, and the submission path is sized
 * for it. Severity 0–1 band holds are "pending publication" for the author, released or decided within minutes; the
 * same position, the same risk. EU share of actions: 30% (by poster).
 */
export const LEGAL = (() => {
  const cs = cascadeOf("csea");
  const terror = cascadeOf("terror");
  const safety = cascadeOf("safety");
  const actions = CASCADE.actionedTp + CASCADE.actionedFp + REPORTS.actionsTp + REPORTS.actionsFp + LOCAL_LAW.withheld;
  const eu = MARKETS.find((m) => m.id === "EU")!.share;
  const euActions = actions * eu;
  const euDemotionsWorstCase = sum(CASCADE.per.filter((p) => p.sev >= 2).map((p) => p.all.toModel)) * eu;
  const euHoldsWorstCase = sum(CASCADE.per.filter((p) => p.sev < 2).map((p) => p.all.toModel + p.all.toPeople)) * eu;
  return {
    cseaUnitsPerDay: cs.actionedTp,
    cseaReportsPerDay: cs.actionedTp / 1.5, // bundled per upload event (F8)
    cseaUnviewedPerDay: cs.all.vettedExact, // exact vetted matches: signed off on the match record, "not viewed"
    preservationDays: 365, // 18 U.S.C. § 2258A (F7)
    terrorRemovalsPerDay: terror.actionedTp + terror.actionedFp,
    tcoPreservationDays: 183, // 6 months (F56)
    threatReferralsPerDay: safety.actionedTp * 0.004, // Art. 18: criminal threats to life (illustrative 0.4%)
    welfareReferralsPerDay: safety.actionedTp * 0.006, // imminent self-harm: welfare / emergency playbook, not Art. 18
    nciiRequestsPerDay: PLATFORM.nciiRequests,
    actionsPerDay: actions,
    euStatementsPerDay: euActions,
    euPerBatch: euActions / (24 * 4),
    euDemotionsWorstCase,
    euHoldsWorstCase,
    euWorstCaseTotal: euActions + euDemotionsWorstCase + euHoldsWorstCase,
    notifierNoticesEuPerDay: REPORTS.notifierNoticesEu,
    indiaGrievancesPerDay: (REPORTS.open + APPEALS.appeals) * 0.22, // acknowledged ≤ 24 h, resolved ≤ 15 days (F57)
  };
})();

/** Storage, incl. content retention by action type (review 36). Content kept 6 months after any action for appeals
 * (DSA ≥ 6 months, F10); terrorism removals 6 months (TCO, F56) plus any authority extension; CSEA 1 year in the vault
 * (F7); a user's deletion under a legal hold restricts access instead of erasing. */
export const STORAGE = (() => {
  const decisionGbDay = (PLATFORM.units * 200) / 1e9;
  const actionGbDay = (LEGAL.actionsPerDay * 2_000) / 1e9;
  const modelLogGbDay = (LLM.enforcementCalls * 1_000) / 1e9;
  // Removed content kept 6 months: 85% text (≈ 2 KB), 15% images (≈ 1 MB).
  const removedContentGbDay = (LEGAL.actionsPerDay * (0.85 * 2_000 + 0.15 * 1_000_000)) / 1e9;
  // Bank entries: person-confirmed image removals in every family, plus graphic and spam automated image removals that
  // passed 30 days without a successful appeal (QA-sampled weekly); hate banks hold person-confirmed entries only. A
  // bank entry whose matches spike is reviewed; an overturn unbanks it and re-reviews every removal matched to it.
  const bankImagesPerDay = sum(
    CASCADE.per.map((p) => {
      if (!p.image) return 0;
      const auto =
        p.id === "graphic" || p.id === "spam"
          ? (p.image.autoTp + p.image.autoFp + p.image.modelTp + p.image.modelFp) * 0.97
          : 0;
      return p.image.peopleTp + auto;
    })
  );
  // PDQ: store one hash per banked image and query the 8 dihedral variants of the upload (review 39); multi-index
  // hashing over 256-bit codes; 32 bytes a hash.
  const bankGbYear = (bankImagesPerDay * 365 * 32) / 1e9;
  return {
    decisionGbDay,
    decisionHotTb: (decisionGbDay * 90) / 1_000,
    actionGbDay,
    actionTwoYearsTb: (actionGbDay * 730) / 1_000,
    modelLogGbDay,
    removedContentGbDay,
    removedContentSixMonthsTb: (removedContentGbDay * 183) / 1_000,
    bankImagesPerDay,
    bankGbYear,
  };
})();

// ── Totals and alternatives (sheet §5, §12; review 13, 17, 58) ───────────────────────────────────────────────────

export const TIERS = (() => {
  const units = PLATFORM.units;
  return {
    units,
    vetted: CASCADE.vetted,
    own: CASCADE.own,
    hashShare: (CASCADE.vetted + CASCADE.own) / units,
    autoAct: CASCADE.autoAct,
    autoActShare: CASCADE.autoAct / units,
    held: CASCADE.held,
    heldShare: CASCADE.held / units,
    band: CASCADE.band,
    modelCalls: LLM.enforcementCalls,
    modelShare: LLM.enforcementCalls / units,
    people: PEOPLE.items,
    peopleShare: PEOPLE.items / units,
    peopleFromCascade: CASCADE.toPeople,
    precision: CASCADE.actionedTp / (CASCADE.actionedTp + CASCADE.actionedFp),
    recall: CASCADE.actionedTp / CASCADE.violating,
    prevalence: CASCADE.prevalence,
    // Actions taken with no person (exact hashes, own banks, automated removals, account rules, the model's own
    // decisions): the DSA statement says "fully automated" for these (F9).
    automatedShare:
      sum(
        CASCADE.per.map((p) =>
          p.sev >= 2
            ? p.all.ownTp +
              p.all.ownFp +
              p.all.autoTp +
              p.all.autoFp +
              p.all.modelTp +
              p.all.modelFp +
              p.all.accountTp +
              p.all.accountFp +
              p.recheck.caught +
              p.recheck.wrongActions
            : p.all.vettedExact
        )
      ) /
      (CASCADE.actionedTp + CASCADE.actionedFp),
  };
})();

/**
 * A month (30 days), USD, illustrative except model prices; ranges where the staffing of non-review roles is a
 * judgement (review 17). Engineering 40–80 (base 60) at 15,000; policy 15–25 (base 20) at 10,000; legal and
 * compliance 6 at 15,000; training-label vendors 30,000; infrastructure 60,000.
 */
export const COST = (() => {
  const model = (LLM.enforcementPerDay + PREVALENCE.modelCostPerDay) * 30;
  const classifiers = CLASSIFIERS.perMonth;
  const fallback = FALLBACK.perMonth;
  const people = PEOPLE.perMonth;
  const engineering = { lo: 40 * 15_000, base: 60 * 15_000, hi: 80 * 15_000 };
  const policy = { lo: 15 * 10_000, base: 20 * 10_000, hi: 25 * 10_000 };
  const legal = 6 * 15_000;
  const labels = 30_000;
  const infrastructure = 60_000;
  const fixed = model + classifiers + fallback + legal + labels + infrastructure;
  const total = fixed + people + engineering.base + policy.base;
  const totalLo = fixed + people + engineering.lo + policy.lo;
  const totalHi = fixed + PEOPLE.perMonthAt2 + engineering.hi + policy.hi;
  // The model on every unit, one family's policy per call (review 13): 4 text families (terrorism, threats, hate,
  // spam; CSEA text excluded only from the all-small case for comparability) and 5 image families.
  const modelEverywhereSmall = (PLATFORM.text * 4 * UNIT.smallText + PLATFORM.images * 5 * UNIT.smallImage) * 30;
  const modelEverywhereMid =
    (PLATFORM.text * (2 * UNIT.smallText + 2 * UNIT.midText) +
      PLATFORM.images * (3 * UNIT.smallImage + 2 * UNIT.midImage)) *
    30;
  const band = sum(CASCADE.per.map((p) => p.all.toModel));
  const peopleOnBandHoursDay = (band * 30) / 3_600;
  const peopleOnBandFte = (((peopleOnBandHoursDay / (6 * 0.85)) * 7) / 5) * 1.15 * 1.18;
  return {
    model,
    classifiers,
    fallback,
    people,
    engineering,
    policy,
    legal,
    labels,
    infrastructure,
    total,
    totalLo,
    totalHi,
    perThousandUnits: total / ((PLATFORM.units * 30) / 1_000),
    perThousandUnitsRange: [totalLo / ((PLATFORM.units * 30) / 1_000), totalHi / ((PLATFORM.units * 30) / 1_000)],
    shares: { people: people / total, model: model / total, classifiers: classifiers / total },
    modelAndClassifiersPerThousand: (model + classifiers + fallback) / ((PLATFORM.units * 30) / 1_000),
    modelEverywhereSmall, // ≈ 1.80M
    modelEverywhereMid,
    peopleOnBandHoursDay,
    peopleOnBandFte,
    peopleOnBandPerMonth: peopleOnBandFte * 25 * 173.3,
    // Price sensitivity (review 58): model prices × 10 → the model line × 10.
    modelAtTenTimesPrice: model * 10,
    // Per call vs the classifier's per-unit cost (review 14).
    callVsClassifier: {
      smallText: UNIT.smallText / CLASSIFIERS.perUnit,
      midImage: UNIT.midImage / CLASSIFIERS.perUnit,
    },
  };
})();

// ── The worked units (sheet §9) ──────────────────────────────────────────────────────────────────────────────────

/** A German comment in the hate band: global terms of service, plus the German local-law layer. */
export const WALKTHROUGH = (() => {
  const hate = familyById("hate");
  const e = edges(hate);
  const p = 0.3; // after the confusables fold
  const rawP = 0.02; // the raw text: below the global band (0.0417): without the fold, allowed
  const local = LOCAL_LAW.rows.find((r) => r.market === "EU")!;
  // A positive verdict at p = 0.3: posterior = 0.3 × 0.92 ÷ (0.3 × 0.92 + 0.7 × 0.03).
  const posteriorYes = (p * (1 - hate.llm!.fnr)) / (p * (1 - hate.llm!.fnr) + (1 - p) * hate.llm!.fpr);
  return {
    edges: e,
    p,
    rawP,
    score: scoreAt(p, hate.text!.rate, hate.text!.d),
    inBand: p >= e.pLo && p < e.pHi,
    posteriorYes,
    removes: posteriorYes >= e.tau,
    local: { tau: local.tau, pLo: local.pLo, pHi: local.pHi },
    prePublishMs: LATENCY.textPre.p50,
    modelMs: LATENCY.modelText.p50,
    usd: UNIT.smallText,
  };
})();

/** "Tonight I end it, nobody will miss me": threats and self-harm at P = 0.30 (review, follow-up 3). */
export const WALK_SAFETY = (() => {
  const f = familyById("safety");
  const e = edges(f);
  const p = 0.3;
  return {
    edges: e,
    p,
    held: p >= e.holdLine,
    straightToPerson: p >= e.pHi, // above the release line: a model "no" could not release it
    missCostHeld: p * f.cfn, // 120 harm units if published and wrong
    holdCost: (1 - p) * HOLD.cfpHold, // 0.035 harm units of delay
    heldReleaseMs: LATENCY.heldRelease,
    urgentWaitP95s: 600, // the roster's target
  };
})();

/** CSEA grooming text: its band runs on the mid model up to the release line (sheet §13 thresholds table). */
export const CSEA_TEXT_EDGES = edges(familyById("csea"), familyById("csea").llmText ?? null);
/** Extra prevalence-labeller cost a day for hate to see a 25% rise (≈ 137,500 labels a week instead of 35,000). */
export const PREVALENCE_HATE_25 = (() => {
  const r = prevalenceOf("hate");
  return { extraPerDay: ((r.nFor25 - r.nWeek) / 7) * (0.85 * UNIT.midText + 0.15 * UNIT.midImage) };
})();
