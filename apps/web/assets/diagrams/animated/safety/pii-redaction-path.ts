import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// The redaction path (data-privacy-pii-handling, Architecture): personal data is swapped for placeholders before the
// model sees it, kept in a map for this one request, and put back in the reply. One Brightpost ticket: "My kettle
// (order 4471) arrived cracked. Refund to sam@example.com. Card 4242 4242 4242 4242." The email and card are made up
// (example.com is reserved for examples; 4242 4242 4242 4242 is a published payment-provider test card number).
//   Placeholders: sam@example.com → EMAIL_1, the card number → CARD_1. The order number 4471 stays (an engineer needs it).
// Steps: 1 the ticket arrives with an email and a card number · 2 detect: patterns, a check-digit test and a name
// finder · 3 replace with placeholders and keep the map · 4 the model sees placeholders only · 5 the trace store keeps
// placeholders only · 6 restore the values in the reply and send it.
// Layout (width 900, height 420, centres): row 1 y 90: ticket x 75 | detect 265 | model 455 | restore 645 | reply 835
// (w 130 to 150); row 2 y 250: placeholder map x 265 (under detect) | trace store x 455 (under the model). The return
// path from the map to restore runs under both along y 350 (via points).
// Colours (PROD_TONE): ticket and reply orange (traffic), detect and restore lime (checks), the model green, the map
// and trace store violet (stores). Four tones plus neutral; the model never sees the map.

const spec: DiagramSpec = {
  title: "Redact before the model, restore after",
  width: 900,
  height: 400,
  steps: [
    { title: "A ticket with an email and a card number" },
    { title: "Detect the personal data" },
    { title: "Swap it for placeholders, keep the map" },
    { title: "The model sees placeholders only" },
    { title: "The trace keeps placeholders only" },
    { title: "Put the values back in the reply" },
  ],
  zones: [],
  nodes: [
    {
      id: "ticket",
      label: "Ticket",
      sub: "email and card",
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 76,
      y: 90,
      w: 144,
    },
    {
      id: "detect",
      label: "Detect",
      sub: "patterns, name finder",
      icon: "search",
      tone: PROD_TONE.check,
      accent: true,
      x: 305,
      y: 90,
      w: 174,
      step: 2,
    },
    {
      id: "map",
      label: "Placeholder map",
      sub: "this request only",
      icon: "vault",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 305,
      y: 250,
      w: 170,
      step: 3,
    },
    {
      id: "model",
      label: "Model",
      sub: "EMAIL_1, CARD_1",
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 530,
      y: 90,
      w: 150,
      step: 4,
    },
    {
      id: "trace",
      label: "Trace store",
      sub: "placeholders only",
      icon: "log",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 530,
      y: 250,
      w: 154,
      step: 5,
    },
    {
      id: "restore",
      label: "Restore",
      sub: "values back in",
      icon: "key",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 745,
      y: 90,
      w: 136,
      step: 6,
    },
    {
      id: "reply",
      label: "Reply",
      sub: "sent",
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 810,
      y: 250,
      w: 120,
      step: 6,
    },
  ],
  edges: [
    { from: "ticket", to: "detect", label: "raw text", packet: true, step: 2 },
    { from: "detect", to: "map", label: "values", step: 3 },
    { from: "detect", to: "model", label: "masked", packet: true, step: 4 },
    { from: "model", to: "trace", label: "masked", step: 5 },
    { from: "model", to: "restore", label: "answer", packet: true, step: 6 },
    {
      from: "map",
      to: "restore",
      label: "values back",
      dashed: true,
      via: [
        [280, 340],
        [685, 340],
      ],
      step: 6,
    },
    { from: "restore", to: "reply", step: 6 },
  ],
};

export default spec;
