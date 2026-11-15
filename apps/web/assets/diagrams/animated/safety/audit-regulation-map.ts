import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { blk, note } from "@/components/diagrams/presets/production-safety";

// Which rule asks for which control (compliance-audit-logging, Architecture). Four columns, one per rule, each with the
// provisions that bear on logging and a last row: does it bind Brightpost's support assistant? Facts checked on 16 Nov 2026:
//   EU AI Act (Regulation (EU) 2024/1689): Art. 12(1) high-risk systems must allow automatic recording of events over their
//   lifetime; Art. 19(1) providers and Art. 26(6) deployers keep the logs at least six months unless other law says
//   otherwise. Annex III high-risk duties apply from 2 Dec 2027 after the Digital Omnibus amendment, Regulation (EU) 2026/1744,
//   in force 27 Jul 2026. A customer-support assistant is not an Annex III use, so Art. 12 does not bind it by itself.
//   GDPR: Art. 30(1) record of processing (purposes, data categories, recipients, erasure time limits, security measures);
//   Art. 22(1) and (3) a decision based solely on automated processing with legal or similarly significant effects,
//   with human intervention and the right to contest. Personal data in tickets means GDPR applies to Brightpost.
//   SOC 2 (AICPA 2017 Trust Services Criteria, revised points of focus 2022): CC6.1 logical access, CC7.2 monitoring for
//   anomalies, CC8.1 authorised and recorded changes. A report is voluntary and sought by a buyer.
//   ISO/IEC 42001:2023: AI management system standard; Annex A control A.6.2.8 on event logs (title from published control
//   lists; the standard text is paid). Certification is voluntary.
// Grid (width 880): columns x 10 | 232 | 454 | 676 (w 194); header y 14 (h 56); cell rows y 80 and 160 (h 70);
// third cell y 240 (h 70); applies row y 326 (h 56). Colours: headers and cells neutral, the "applies" cell lime where the
// rule binds Brightpost today (GDPR) and neutral where it depends. Two tones.

const COLS = [10, 232, 454, 676] as const;
const W = 194;

interface Col {
  head: string;
  sub: string;
  cells: [string, string, string?][];
  applies: string;
  appliesSub: string;
  binds: boolean;
}

const cols: Col[] = [
  {
    head: "EU AI Act",
    sub: "Reg. (EU) 2024/1689",
    cells: [
      ["Art. 12", "high-risk: automatic event logs"],
      ["Art. 19, 26(6)", "keep logs at least 6 months"],
    ],
    applies: "Only if high-risk",
    appliesSub: "Annex III: 2 Dec 2027",
    binds: false,
  },
  {
    head: "GDPR",
    sub: "personal data",
    cells: [
      ["Art. 30", "record of processing"],
      ["Art. 22", "contest automated decisions"],
    ],
    applies: "Yes, today",
    appliesSub: "tickets hold personal data",
    binds: true,
  },
  {
    head: "SOC 2",
    sub: "AICPA, a report",
    cells: [
      ["CC6.1", "restrict logical access"],
      ["CC7.2", "monitor for anomalies"],
      ["CC8.1", "authorise, record changes"],
    ],
    applies: "If a buyer asks",
    appliesSub: "voluntary attestation",
    binds: false,
  },
  {
    head: "ISO/IEC 42001",
    sub: "2023, certifiable",
    cells: [
      ["A.6.2.8", "event logs while in use"],
      ["Management system", "policies, roles, review"],
    ],
    applies: "If you certify",
    appliesSub: "voluntary",
    binds: false,
  },
];

const shapes: LayoutShape[] = [];
cols.forEach((c, i) => {
  const x = COLS[i];
  shapes.push(blk(`h${i}`, x, 14, W, 56, c.head, c.sub, PROD_TONE.infra, 1));
  c.cells.forEach((cell, j) => {
    shapes.push({
      id: `c${i}-${j}`,
      type: "box",
      x,
      y: 80 + j * 80,
      w: W,
      h: 70,
      label: cell[0],
      sub: cell[1],
      tone: PROD_TONE.infra,
      fill: "soft",
      step: 1,
    });
  });
  const tone: LayoutTone = c.binds ? PROD_TONE.check : PROD_TONE.infra;
  shapes.push(blk(`a${i}`, x, 326, W, 56, c.applies, c.appliesSub, tone, 1, c.binds));
});
shapes.push(
  note("row", 10, 396, "Bottom row: does the rule bind Brightpost's support assistant? Checked 16 November 2026.", 1)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Which rule asks for which control, and whether it binds Brightpost",
  width: 880,
  height: 426,
  shapes,
};

export default spec;
