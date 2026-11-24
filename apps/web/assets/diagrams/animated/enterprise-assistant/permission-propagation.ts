import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CONNECTORS, PROPAGATION, SOURCES } from "@/components/diagrams/presets/gcase-enterprise";
import { PROD_TONE, meter, meterSize, n } from "@/components/diagrams/presets/production";

// Step 4 and deep dive 1 of the enterprise assistant (design sheet §15.1 and its worked example, the pay-band file;
// N4): how long a revoked permission can still be used, per path, inside SharePoint's rate-limit budget. Numbers from
// PROPAGATION and CONNECTORS in presets/gcase-enterprise.ts (illustrative except the Graph limits, F38, F101):
//   Event path, p50: notify 30 s (inside Graph's < 1 min average; maximum 6 h) + queue 1 + fetch 2 + map 0.1 + patch 1
//     + refresh 1 = PROPAGATION.eventP50 = 35.1 s; the document is dirty (live-checked) PROPAGATION.dirtyAfterS = 1 s
//     after the event. The worked example: link removed 10:00:00 → notified 10:00:30 → dirty 10:00:31 → ACL fetched
//     10:00:33 (5 RU) → 9 chunks (SOURCES.sharepointChunksPerDoc) patched 10:00:34 → visible 10:00:35.
//   Lost event: the hot-tier poll (300 drives every 10 min, 1 RU a call) sees it by ≈ 10:10:05: bound 10 min on hot-tier sites,
//     60 on the other 7,700 drives (PROPAGATION.perSource sp-doc-p1 / sp-doc-p2).
//   Throttled poll: one missed cycle stretches the bound to 20 min (120 elsewhere); 30 min without a successful
//     reconcile (dropOut) and the site's results leave the answers.
//   Membership: a user removed from a SharePoint site group on a hot-tier site is caught by the next site-group reconcile,
//     ≤ 10 min (60 elsewhere); the principal store changes, no chunk is rewritten (chunks carry group ids).
//   Budget: 2,400,000 RU a day for one Graph app (CONNECTORS.sharepoint.budgetDay): events, fetches and downloads
//     139,200 + hot- and warm-tier polls 228,000 + site-group reconcile 432,000 + live checks and drift audit 44,700 =
//     CONNECTORS.sharepoint.planned ≈ 843,900 (35%), plus a 650,000 reserve (27%) for a 410 re-enumeration of every
//     drive (624,000 RU, ≈ 7 h). v1's 10-minute poll of all 8,000 drives alone would have used 96%.
// Steps: 1 the event path · 2 a lost event, caught by the poll · 3 a throttled poll, and a membership change · 4 the
// budget that pays for it.
// Layout (880 wide): four lanes 52 tall, 70 apart; a lane-name box (150 wide) then five boxes 120 wide, 22 apart
// (x 176–864), joined by arrows; the meter() from presets/production.ts below, 852 wide, with two legend lines.
// Colours: the person's action orange, source and fetch blue (data), dirty/live check and bounds lime (checks), the
// index patch violet (store), drop-out red; meter segments blue (events), teal (polls), violet (site groups), lime
// (live checks and audit), neutral (reserve).

// Box lines are kept to 15 characters: the rendered font is wider than the lint estimate.
const LANE_X = 12;
const LANE_W = 150;
const BX0 = 176;
const BW = 120;
const BGAP = 22;
const BH = 52;
const LANE_Y0 = 34;
const PITCH = 70;
const bx = (i: number) => BX0 + i * (BW + BGAP);

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h: BH, label, tone, fill: "pastel", step, ...extra });
const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone: "neutral",
  step,
  quiet: true,
});

const per = (id: string) => PROPAGATION.perSource.find((p) => p.id === id);
const p1 = per("sp-doc-p1");
const p2 = per("sp-doc-p2");
const g1 = per("sp-groups-p1");
const g2 = per("sp-groups-p2");
const s = (v: number) => `${Math.round(v)}`;
const ev = (id: string) => PROPAGATION.event.find((e) => e.id === id)?.s ?? 0;

/** One lane: a name box and five boxes joined by arrows; only the name box carries the step's ring. */
function lane(key: string, i: number, name: string, boxes: [string, LayoutTone][], step: number): LayoutShape[] {
  const y = LANE_Y0 + i * PITCH;
  return [
    box(`${key}-name`, LANE_X, y, LANE_W, name, PROD_TONE.infra, step, { fill: "soft" }),
    ...boxes.map(([label, tone], j) => box(`${key}-${j}`, bx(j), y, BW, label, tone, step, { quiet: true })),
    ...boxes.slice(1).map((_, j): LayoutShape => ({
      id: `${key}-a${j}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `${key}-${j}`,
      to: `${key}-${j + 1}`,
      step,
    })),
  ];
}

const lanes: LayoutShape[] = [
  text(
    "h-lanes",
    LANE_X,
    6,
    856,
    "FY27 pay bands: an org-wide link is removed at 10:00:00 on a hot-tier (Confidential) site",
    1
  ),
  ...lane(
    "event",
    0,
    `Event (typical)\n≈ ${s(PROPAGATION.eventP50)} s`,
    [
      ["10:00:00\nlink removed", GENAI_TONE.user],
      [`10:00:${s(ev("notify"))}\nGraph notifies`, GENAI_TONE.data],
      [`10:00:${s(ev("notify") + PROPAGATION.dirtyAfterS)} dirty,\nlive-checked`, GENAI_TONE.check],
      [`10:00:${s(ev("notify") + ev("queue") + ev("fetch"))} ACL\nfetched, 5 RU`, GENAI_TONE.data],
      [`10:00:${s(PROPAGATION.eventP50)}: ${SOURCES.sharepointChunksPerDoc}\nchunks patched`, GENAI_TONE.store],
    ],
    1
  ),
  ...lane(
    "lost",
    1,
    `Event lost\n≤ ${s(p1?.bound ?? 0)} min`,
    [
      [`Notification\nlost (max ${PROPAGATION.graphNotifyMaxHours} h)`, GENAI_TONE.failure],
      ["Hot poll every\n10 min, 1 RU", GENAI_TONE.data],
      ["≈ 10:10:05\nsees the change", GENAI_TONE.data],
      ["ACL fetched,\nchunks patched", GENAI_TONE.store],
      [`Hot: ≤ ${s(p1?.bound ?? 0)} min,\n≤ ${s(p2?.bound ?? 0)} elsewhere`, GENAI_TONE.check],
    ],
    2
  ),
  ...lane(
    "throttled",
    2,
    `Poll throttled\ndrop-out ${p1?.dropOut} min`,
    [
      ["429: one hot\ncycle missed", GENAI_TONE.failure],
      ["≈ 10:20 the\nnext hot poll", GENAI_TONE.data],
      [`Bound ≤ ${p1?.throttled} min\n(≤ ${p2?.throttled} others)`, GENAI_TONE.check],
      [`No reconcile\nfor ${p1?.dropOut} min`, GENAI_TONE.failure],
      ["The site drops\nout of results", GENAI_TONE.failure],
    ],
    3
  ),
  ...lane(
    "member",
    3,
    `Membership\n≤ ${s(g1?.bound ?? 0)} min on hot sites`,
    [
      ["User removed\nfrom site group", GENAI_TONE.user],
      ["Reconcile site\ngroups, 10 min", GENAI_TONE.data],
      ["Principal store\nupdated", GENAI_TONE.store],
      ["No chunk is\nrewritten", GENAI_TONE.store],
      [`Hot: ≤ ${s(g1?.bound ?? 0)} min,\n≤ ${s(g2?.bound ?? 0)} elsewhere`, GENAI_TONE.check],
    ],
    3
  ),
];

// Step 4: the SharePoint budget.
const sp = CONNECTORS.sharepoint;
const L = sp.lines;
const events = L.eventDeltas + L.permissionFetches + L.downloads; // 139,200
const polls = L.p1Poll + L.p2Poll; // 228,000
const checks = Math.round((L.liveChecks + L.driftAudit) / 100) * 100; // 44,695 → 44,700, as the sheet rounds
const planned = events + polls + L.siteGroups + checks; // ≈ 843,900
const pct = (v: number) => `${Math.round((v / sp.budgetDay) * 100)}%`;
const MW = 852;
const MY = LANE_Y0 + 4 * PITCH + 30;
const ms = meterSize({ width: MW });
const budget = meter("budget", LANE_X + 2, MY, {
  label: `SharePoint and OneDrive, one Graph app: RU a day (planned ${pct(sp.planned)} + reserve ${pct(sp.reserve)})`,
  used: planned + sp.reserve,
  limit: sp.budgetDay,
  unit: "RU",
  width: MW,
  limitLabel: "daily limit",
  step: 4,
  segments: [
    { value: events, tone: GENAI_TONE.data, label: "Events" },
    { value: polls, tone: GENAI_TONE.tool, label: "Polls" },
    { value: L.siteGroups, tone: GENAI_TONE.store, label: "Site groups" },
    { value: checks, tone: GENAI_TONE.check },
    { value: sp.reserve, tone: PROD_TONE.infra, label: "Reserve: 410 re-enumeration" },
  ],
});
const LEG = MY + ms.height + 8;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Permission propagation: ≈ ${s(PROPAGATION.eventP50)} s by event, ≤ ${s(p1?.bound ?? 0)} min by poll on hot-tier sites, drop-out at ${p1?.dropOut} min, inside ${pct(sp.planned)} of SharePoint's budget`,
  width: 880,
  height: LEG + 2 * 20 + 8,
  steps: [
    { title: `The event path: dirty in ${PROPAGATION.dirtyAfterS} s, visible in ≈ ${s(PROPAGATION.eventP50)} s` },
    { title: `A lost event: the hot-tier poll catches it within ${s(p1?.bound ?? 0)} min` },
    {
      title: `A throttled poll stretches the bound; past ${p1?.dropOut} min the site drops out. Membership: the next reconcile`,
    },
    { title: `The budget: ${pct(sp.planned)} planned, ${pct(sp.reserve)} reserved for re-enumeration` },
  ],
  shapes: [
    ...lanes,
    ...budget,
    text(
      "leg-1",
      LANE_X,
      LEG,
      856,
      `Events, fetches, downloads ${n(events)} · hot + warm polls ${n(polls)} · site groups ${n(L.siteGroups)} · live checks + drift ${n(checks)} = ${n(planned)}`,
      4
    ),
    text(
      "leg-2",
      LANE_X,
      LEG + 20,
      856,
      `Reserve ${n(sp.reserve)} covers re-enumerating every drive (${n(sp.reenumerate)} RU, ≈ ${Math.round(sp.reenumerateHours)} h). A 10-minute poll of all ${n(sp.drives)} drives would use ${Math.round(sp.v1PollShareAt8000 * 100)}% alone.`,
      4
    ),
  ],
};

export default spec;
