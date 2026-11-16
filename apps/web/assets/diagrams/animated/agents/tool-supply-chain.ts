import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { SUPPLY_CHAIN } from "@/components/diagrams/presets/agents-security";

// The tool supply chain (agent-security-and-sandboxing, Technical mechanics "Securing tool and MCP supply chains"). The
// tool-poisoning figure on model-context-protocol covers a lying tool description; this one covers provenance and
// updates. It follows the postmark-mcp incident (Koi Security; The Hacker News, 29 Sep 2025): a third-party email MCP
// package on npm shipped 15 clean versions, then 1.0.16 (17 Sep 2025) added one line that BCC'd every email to an
// outside address. In Brightpost's version the email server is that package. Run at @latest, a restart installs the
// bad version; the host's per-call check still passes (the `to` field is the customer's own address) and the copy
// leaves through the real mail provider, which the egress allow-list permits. Pinned with a hash, the update arrives
// as a change someone reviews, and the added BCC line is caught there.
//
// Four steps: 1 a package earns trust · 2 one update adds one line · 3 floating at @latest: installed, unseen · 4
// pinned and reviewed: caught in the diff.
//
// Layout: the package's history runs down a left column (x 20, w 230): the registry (y 40), the clean versions
// (y 140), the bad version (y 278). Two groups on the right (x 280–860): "Floating" (y 40–175) and "Pinned" (y 238–373),
// each a row of three boxes (x 295, 485, 675; w 160) with arrows between them. The bad version feeds the first box of
// each row. A line of text between the groups (y 186) says why the runtime checks miss it.
//
// Colour (agents legend, three tones plus neutral): the package and the pinned server teal, the bad version and the
// leaked copies red, the checks lime (the diff review carries the one highlight), the registry neutral.

const ROW = { floating: 80, pinned: 278 } as const;
const BOX_X = [295, 485, 675] as const;
const BOX = { w: 160, h: 64 } as const;

const rowBox = (
  id: string,
  i: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  highlight = false
): LayoutShape => ({
  id,
  type: "box",
  x: BOX_X[i],
  y,
  w: BOX.w,
  h: BOX.h,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  highlight,
});

const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The tool supply chain: one update, two outcomes",
  width: 880,
  height: 395,
  steps: [
    { title: "A package earns trust" },
    { title: "One update adds one line" },
    { title: "Floating at @latest: installed, unseen" },
    { title: "Pinned and reviewed: caught in the diff" },
  ],
  groups: [
    {
      id: "g-floating",
      title: `Floating: ${SUPPLY_CHAIN.pkg}@latest`,
      tone: AGENT_TONE.failure,
      x: 280,
      y: 40,
      w: 580,
      h: 135,
    },
    {
      id: "g-pinned",
      title: `Pinned: ${SUPPLY_CHAIN.pkg}@${SUPPLY_CHAIN.goodVersion}`,
      tone: AGENT_TONE.check,
      x: 280,
      y: 238,
      w: 580,
      h: 135,
    },
  ],
  shapes: [
    // Steps 1–2: the package's history.
    {
      id: "registry",
      type: "box",
      x: 20,
      y: 40,
      w: 230,
      h: 52,
      label: "npm registry",
      sub: `${SUPPLY_CHAIN.pkg}, third-party`,
      tone: AGENT_TONE.infra,
      fill: "soft",
    },
    {
      id: "good",
      type: "box",
      x: 20,
      y: 140,
      w: 230,
      h: 52,
      label: `1.0.0 … ${SUPPLY_CHAIN.goodVersion}`,
      sub: `${SUPPLY_CHAIN.cleanVersions} versions, all clean`,
      tone: AGENT_TONE.action,
      fill: "pastel",
    },
    arrow("a-registry", "registry", "good", 1),
    {
      id: "bad",
      type: "box",
      x: 20,
      y: ROW.pinned,
      w: 230,
      h: BOX.h,
      label: `${SUPPLY_CHAIN.badVersion}, ${SUPPLY_CHAIN.badDate}`,
      sub: SUPPLY_CHAIN.added,
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 2,
    },
    arrow("a-update", "good", "bad", 2),

    // Step 3: floating at @latest. The runtime checks see nothing wrong.
    rowBox(
      "f-install",
      0,
      ROW.floating,
      `Restart installs\n${SUPPLY_CHAIN.badVersion}`,
      "nobody reads it",
      AGENT_TONE.action,
      3
    ),
    rowBox("f-check", 1, ROW.floating, "Host check passes", "to = the customer", AGENT_TONE.check, 3),
    rowBox("f-leak", 2, ROW.floating, "Every email copied", "via the real provider", AGENT_TONE.failure, 3),
    arrow("a-f-in", "bad", "f-install", 3),
    arrow("a-f-1", "f-install", "f-check", 3),
    arrow("a-f-2", "f-check", "f-leak", 3),
    {
      id: "why",
      type: "text",
      x: 280,
      y: 186,
      w: 580,
      h: 30,
      label: "The BCC is added inside the server: no per-call check or egress rule sees it.",
      step: 3,
      quiet: true,
    },

    // Step 4: pinned with a hash. The update arrives as a change someone reviews.
    rowBox("p-pinned", 0, ROW.pinned, "Update proposed", "as a pull request", AGENT_TONE.action, 4),
    rowBox("p-review", 1, ROW.pinned, "Diff review", "flags the bcc line", AGENT_TONE.check, 4, true),
    rowBox("p-keep", 2, ROW.pinned, "Rejected", `${SUPPLY_CHAIN.goodVersion} keeps running`, AGENT_TONE.action, 4),
    arrow("a-p-in", "bad", "p-pinned", 4),
    arrow("a-p-1", "p-pinned", "p-review", 4),
    arrow("a-p-2", "p-review", "p-keep", 4),
  ],
};

export default spec;
