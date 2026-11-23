import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { INVOICE, POSTING, postingKey } from "@/components/diagrams/presets/gcase-docextract";

// Step 6 and deep dive 3 of the document-extraction case study (design sheet §6, §10.16, §15.3): ingest once, post once,
// against an asynchronous ERP. "Effectively once" = at-least-once delivery deduplicated at three layers: the byte hash
// at intake, the business key in the outbox (unique index), and the ERP's own hard duplicate check; a daily
// reconciliation catches anything left. Numbers and keys from presets/gcase-docextract.ts:
//   POSTING.example = postingKey("SUP-0193", "INV-2O417", "2026-11-03", "invoice") = "SUP-0193|INV20417|Y2026|invoice":
//   the copy's confusable "O" folds to "0", so it gets the same key as INV-20417 (INVOICE.number).
//   POSTING.interfaceMaxMinutes = 30: no resend inside the ERP interface's window; after it, a status read first.
// Steps: 1 one document per byte hash (a resend by another channel returns the same document) · 2 approval and outbox
// row in one transaction · 3 post with the key, time out, do not resend; the acknowledgement arrives later · 4 a
// re-rendered copy folds to the same key and is held; the daily reconciliation.
// Notes sit after the message whose index `at` names (the last of a step, or the timeout).
// Lanes (SEQUENCE_LANE, section tones only; labels ≤ 15 characters): Supplier and Review orange (people), Intake and
// Workflow neutral (harness), Poster teal (an action), ERP violet (the ledger, a store).

const KEY = postingKey("SUP-0193", INVOICE.number, INVOICE.isoDate, "invoice");
const COPY_NO = "INV-2O417";

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: one document per byte hash.
  m("supplier", "intake", `${INVOICE.number}.pdf by email`, 1),
  m("intake", "workflow", "sha256 new: doc_9f2a", 1),
  m("supplier", "intake", "same PDF via the portal", 1),
  m("intake", "supplier", "duplicate_of doc_9f2a", 1, "return"),

  // Step 2: approval and the outbox row commit together.
  m("workflow", "review", "task: fields flagged", 2),
  m("review", "workflow", "approve, version 3", 2, "return"),
  m("workflow", "poster", "approval + outbox row, one commit", 2),

  // Step 3: post with the key; a timeout is not a failure.
  m("poster", "erp", `post ${KEY}`, 3),
  m("erp", "poster", "no reply in time", 3, "timeout"),
  m("erp", "poster", "ack: posted, ERP doc number", 3, "async"),
  m("poster", "workflow", "posted", 3, "return"),

  // Step 4: a re-rendered copy gets new bytes but the same key.
  m("supplier", "intake", `copy printed "${COPY_NO}"`, 4),
  m("intake", "workflow", "new bytes: doc_a71c", 4),
  m("workflow", "review", "held: near-duplicate", 4),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "intake", text: "rejected or held → reopened; posted → returned", step: 1, at: firstOf(1) + 3 },
  { lane: "workflow", text: "a second approval of version 3 gets 409", step: 2, at: firstOf(2) + 2 },
  {
    lane: "poster",
    text: `no resend for ${POSTING.interfaceMaxMinutes} min; then a status read`,
    step: 3,
    at: firstOf(3) + 1,
  },
  { lane: "poster", text: `"${COPY_NO}" folds to the same key: unique index`, step: 4, at: firstOf(4) + 2 },
  { lane: "erp", text: "hard duplicate check; daily reconciliation", step: 4, at: messages.length },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title:
    "Ingest once, post once: a byte hash, a business key, an acknowledgement that comes later, a daily reconciliation",
  width: 1000,
  lanes: [
    { id: "supplier", label: "Supplier", icon: "users", tone: SEQUENCE_LANE.user },
    { id: "intake", label: "Intake", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "workflow", label: "Workflow", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "review", label: "Review", icon: "queue", tone: SEQUENCE_LANE.person },
    { id: "poster", label: "Poster", icon: "api", tone: SEQUENCE_LANE.tool },
    { id: "erp", label: "ERP", icon: "ledger", tone: SEQUENCE_LANE.store },
  ],
  steps: [
    { title: "One document per byte hash, whatever the channel" },
    { title: "The approval and the outbox row commit together" },
    { title: `Post with the key; no resend inside the ${POSTING.interfaceMaxMinutes}-minute window` },
    { title: `A re-rendered copy folds to ${POSTING.example} and is held` },
  ],
  messages,
  notes,
};

export default spec;
