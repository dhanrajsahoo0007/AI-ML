import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// Ticketmaster-style booking, built one requirement at a time (ticketmaster case study, the hero).
// Eight steps: 1 browse events and the seat map, read straight from the inventory DB · 2 hold a seat the naive way:
// read, then write, so two fans get the same seat (red, replaced in step 3) · 3 an atomic hold: one conditional
// UPDATE per seat with an expiry · 4 pay with an idempotency key through the payment service and the card processor,
// then claim the seat and write the order in one transaction · 5 a hold-expiry worker releases unpaid holds · 6 the
// waiting room: fans join before the sale and are admitted at rate R with a signed token; the direct path to the API
// gateway goes away · 7 seat-map freshness: the inventory DB's changes flow through an availability stream into a
// seat-map cache that the event service reads (the step-1 read of the primary goes away) · 8 my tickets: the ticket
// service issues tickets from confirmed orders on the stream and serves "my tickets".
// Working: 2,000,000 fans for 50,000 seats; checkout handles 500 orders/s, so R = 500 fans/s drains the queue in
// 2,000,000 ÷ 500 = 4,000 s ≈ 67 minutes (round numbers chosen to size the system).
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: the fan (y 370). Edge column x 297: waiting
// room 140, API gateway 370, CDN 600. Core: the booking service (accent) at 575, 175. Services column x 575: payment
// 400, ticket 520, event 630. Async column x 879: hold expiry 120, availability stream 360. The card processor is an external
// party, drawn in the Clients column at 600. Storage column x 1098: inventory DB 260, seat-map cache 380, catalog 590.
// Every long edge was checked against the boxes it passes (see the plan's lessons on lines through boxes).

const spec: DiagramSpec = {
  title: "Ticket booking high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Browse and seat map", covers: "F1" },
    { title: "A naive hold: two fans, one seat", covers: "F2" },
    { title: "An atomic hold with an expiry", covers: "F2, F4" },
    { title: "Pay once, then confirm", covers: "F3" },
    { title: "Release expired holds", covers: "F4" },
    { title: "The waiting room", covers: "F5" },
    { title: "A fresh seat map from a stream", covers: "F1, N3" },
    { title: "Tickets for the fan", covers: "F6" },
  ],
  zones: zoneFrame({ core: "Booking core" }),
  nodes: [
    { id: "fan", label: "Fan", sub: "app / browser", icon: "phone", fill: "pastel", x: 105, y: 370, w: 140 },
    {
      id: "waiting",
      label: "Waiting room",
      sub: "token at R/s",
      icon: "users",
      tone: "blue",
      fill: "pastel",
      step: 6,
      x: 297,
      y: 140,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, token check",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 370,
      w: 154,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "pages, map tiles",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 600,
      w: 150,
    },
    {
      id: "booking",
      label: "Booking service",
      sub: "hold, claim, confirm",
      icon: "lock",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 175,
      w: 220,
    },
    {
      id: "payment",
      label: "Payment service",
      sub: "idempotency key",
      icon: "card",
      tone: "teal",
      fill: "pastel",
      step: 4,
      x: 575,
      y: 400,
      w: 200,
    },
    {
      id: "ticket",
      label: "Ticket service",
      sub: "issue, my tickets",
      icon: "ticket",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 575,
      y: 520,
      w: 200,
    },
    {
      id: "event",
      label: "Event service",
      sub: "events, seat map",
      icon: "map",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 630,
      w: 200,
    },
    {
      id: "expiry",
      label: "Hold expiry",
      sub: "release after 10 min",
      icon: "timer",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 120,
      w: 190,
    },
    {
      id: "stream",
      label: "Availability stream",
      sub: "seat changes",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 360,
      w: 190,
    },
    {
      id: "provider",
      label: "Card processor",
      sub: "external",
      icon: "coin",
      fill: "pastel",
      step: 4,
      x: 105,
      y: 600,
      w: 160,
    },
    {
      id: "inventory",
      label: "Inventory DB",
      sub: "seats + orders, ACID",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 260,
    },
    {
      id: "cache",
      label: "Seat-map cache",
      sub: "1 to 2 s stale",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 380,
    },
    {
      id: "catalog",
      label: "Event catalog",
      sub: "events, venues",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 590,
    },
  ],
  edges: [
    { from: "fan", to: "gw", label: "browse", flow: true, packet: true, until: 5 },
    { from: "fan", to: "cdn", label: "event page", dashed: true },
    { from: "gw", to: "event", label: "seat map", flow: true, packet: true, delay: 0.4 },
    { from: "event", to: "catalog", label: "events", dashed: true },
    { from: "event", to: "inventory", label: "seat status", dashed: true, until: 6 },

    { from: "gw", to: "booking", label: "hold seat", flow: true, packet: true, step: 2 },
    { from: "booking", to: "inventory", label: "read, then write", tone: "red", step: 2, until: 2 },

    {
      from: "booking",
      to: "inventory",
      label: "UPDATE … WHERE available",
      flow: true,
      packet: true,
      delay: 0.4,
      step: 3,
    },

    { from: "booking", to: "payment", label: "charge, key", step: 4 },
    { from: "payment", to: "provider", label: "charge", step: 4 },

    { from: "expiry", to: "inventory", label: "release", dashed: true, step: 5 },

    { from: "fan", to: "waiting", label: "join queue", flow: true, packet: true, step: 6 },
    { from: "waiting", to: "gw", label: "admit, token", flow: true, packet: true, delay: 0.4, step: 6 },

    { from: "inventory", to: "stream", label: "changes", step: 7 },
    { from: "stream", to: "cache", label: "apply", step: 7 },
    { from: "event", to: "cache", label: "read map", dashed: true, step: 7 },

    { from: "gw", to: "ticket", label: "my tickets", dashed: true, step: 8 },
    { from: "stream", to: "ticket", label: "order confirmed", step: 8 },
  ],
};

export default spec;
