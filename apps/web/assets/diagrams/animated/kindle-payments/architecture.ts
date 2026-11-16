import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// One-click purchase of a digital book, built one requirement at a time (kindle-payments case study, the hero).
// Eight steps: 1 the naive design: the payment service charges the provider, then writes the order (both red,
// replaced in step 2: a crash between them loses a payment, a retry charges twice) · 2 a payment intent and its
// idempotency key are written first, in one transaction, and the provider is called with the same key · 3 a payment
// worker drives the intent's state machine and retries with the same key · 4 a webhook receiver takes the provider's
// events; the worker asks the provider about outcomes that are unknown after a timeout · 5 the intent's outbox rows
// flow through change data capture into an event log; the entitlement service grants the book from it · 6 the ledger
// service posts double-entry entries from the same log into an append-only ledger DB · 7 refunds go through the same
// path as new entries; a receipts service sends receipts and projects the purchase history · 8 a reconciler matches
// the ledger against the provider's daily settlement file.
// Working (round numbers chosen to size the system): 10,000,000 purchases a day ÷ 86,400 s ≈ 116/s on average; a
// peak day morning is 10 × ≈ 1,160/s. 5 ledger entries a purchase × 10,000,000 = 50,000,000 entries a day ≈ 579/s.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients x 105: reader app 200, payment provider
// (external, w 140; its short edge to the webhook receiver has no label) 470. Edge x 297: API gateway 200, webhook receiver 470. Core x 575: payment service (accent) 130,
// payment worker 250. Services x 575: entitlement 380, ledger service 520, reconciler 625. Async x 879: event log
// 230, receipts 450. Storage x 1098: payments DB 130, history view 330, ledger DB 500, settlement files 615.
// Long edges checked against the boxes they pass: payment → provider passes 23 px above the worker; webhook → worker
// passes left of the entitlement box; event log → ledger service passes 26 px under the entitlement box; ledger and
// reconciler edges run under the async zone (it ends at y 500).
// Fact check: none; real systems appear only on the page, under "How real systems do it".

const spec: DiagramSpec = {
  title: "Digital book payments high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Charge, then write: the naive way", covers: "F1, F2" },
    { title: "A payment intent and its key first", covers: "F1, F2, N1" },
    { title: "A state machine and safe retries", covers: "F2, N2" },
    { title: "Webhooks and unknown outcomes", covers: "F2, N2" },
    { title: "Grant the book through an outbox", covers: "F3" },
    { title: "A double-entry ledger", covers: "F5" },
    { title: "Refunds, receipts and history", covers: "F4, F6" },
    { title: "Reconcile with the provider", covers: "F5, N2" },
  ],
  zones: zoneFrame({ core: "Payments core" }),
  nodes: [
    { id: "app", label: "Reader app", sub: "one-click buy", icon: "phone", fill: "pastel", x: 105, y: 200, w: 140 },
    {
      id: "provider",
      label: "Provider",
      sub: "external",
      icon: "coin",
      fill: "pastel",
      x: 105,
      y: 470,
      w: 140,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 200,
      w: 150,
    },
    {
      id: "webhook",
      label: "Webhooks",
      sub: "verify, store",
      icon: "webhook",
      tone: "blue",
      fill: "pastel",
      step: 4,
      x: 297,
      y: 470,
      w: 140,
    },
    {
      id: "payment",
      label: "Payment service",
      sub: "intents, idempotency",
      icon: "card",
      tone: "green",
      accent: true,
      x: 575,
      y: 130,
      w: 220,
    },
    {
      id: "worker",
      label: "Payment worker",
      sub: "retries, resolve",
      icon: "workers",
      tone: "green",
      fill: "pastel",
      step: 3,
      x: 575,
      y: 250,
      w: 190,
    },
    {
      id: "entitle",
      label: "Entitlements",
      sub: "grant the book",
      icon: "book-open",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 575,
      y: 380,
      w: 180,
    },
    {
      id: "ledgersvc",
      label: "Ledger service",
      sub: "double entry",
      icon: "ledger",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 520,
      w: 200,
    },
    {
      id: "recon",
      label: "Reconciler",
      sub: "daily match",
      icon: "scale",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 575,
      y: 625,
      w: 200,
    },
    {
      id: "log",
      label: "Event log",
      sub: "payment events",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 230,
      w: 190,
    },
    {
      id: "receipts",
      label: "Receipts",
      sub: "email, history",
      icon: "bell",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 450,
      w: 190,
    },
    {
      id: "paydb",
      label: "Payments DB",
      sub: "intents, keys, outbox",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 130,
    },
    {
      id: "history",
      label: "History view",
      sub: "seconds stale",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 330,
    },
    {
      id: "ledgerdb",
      label: "Ledger DB",
      sub: "append-only",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 500,
    },
    {
      id: "files",
      label: "Settlement files",
      sub: "from provider, daily",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 8,
      x: 1098,
      y: 615,
    },
  ],
  edges: [
    { from: "app", to: "gw", label: "buy", flow: true, packet: true },
    { from: "gw", to: "payment", label: "buy", flow: true, packet: true, delay: 0.3, until: 1 },
    { from: "payment", to: "provider", label: "1. charge", tone: "red", labelAt: 0.7, until: 1 },
    { from: "payment", to: "paydb", label: "2. write order", tone: "red", until: 1 },

    { from: "gw", to: "payment", label: "buy, key", flow: true, packet: true, delay: 0.3, step: 2, until: 6 },
    { from: "payment", to: "paydb", label: "intent + key, one tx", flow: true, packet: true, delay: 0.6, step: 2 },
    {
      from: "payment",
      to: "provider",
      label: "authorise, key",
      flow: true,
      packet: true,
      delay: 0.9,
      labelAt: 0.7,
      step: 2,
      until: 6,
    },

    { from: "worker", to: "payment", label: "retry, same key", dashed: true, step: 3 },

    { from: "provider", to: "webhook", flow: true, packet: true, step: 4 },
    { from: "webhook", to: "worker", label: "apply event", labelAt: 0.35, step: 4 },

    { from: "paydb", to: "log", label: "outbox (CDC)", labelAt: 0.6, flow: true, packet: true, step: 5 },
    { from: "log", to: "entitle", label: "grant book", flow: true, packet: true, delay: 0.4, step: 5 },

    { from: "log", to: "ledgersvc", label: "post entries", step: 6 },
    { from: "ledgersvc", to: "ledgerdb", label: "append", flow: true, packet: true, step: 6 },

    { from: "gw", to: "payment", label: "buy or refund, key", flow: true, packet: true, delay: 0.3, step: 7 },
    {
      from: "payment",
      to: "provider",
      label: "authorise, capture, refund",
      flow: true,
      packet: true,
      delay: 0.9,
      labelAt: 0.7,
      step: 7,
    },
    { from: "log", to: "receipts", label: "receipt, history", step: 7 },
    { from: "receipts", to: "history", label: "project", dashed: true, step: 7 },

    { from: "files", to: "recon", label: "settlement file", dashed: true, step: 8 },
    { from: "ledgerdb", to: "recon", label: "entries", dashed: true, step: 8 },
  ],
};

export default spec;
