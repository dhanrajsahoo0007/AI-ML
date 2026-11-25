import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// Hotel booking, built one requirement at a time (hotel-booking case study, the hero).
// Eight steps: 1 search hotels and open a hotel page: the search service reads hotels from the catalog and checks
// availability straight from the inventory DB (replaced in step 6) · 2 the inventory model: the hotel's channel
// manager pushes rates and room counts (ARI) through the partner API; the booking service writes one row per room
// type per night (the step-2 write edge is replaced in step 3) · 3 a naive booking reads each night's count, then
// writes it: two guests get the last room (red, replaced in step 4) · 4 one transaction reserves every night of the
// stay with a guarded UPDATE · 5 hold, pay, confirm as a durable workflow: the workflow calls the payment service,
// which authorises and captures with the card processor (the workflow-to-payment edge runs down the gutter between
// the services and async zones) · 6 availability reaches the search index from a change stream (CDC); search reads
// the index, the hotel page re-checks one hotel live through the booking service · 7 my bookings and cancel: a
// guest-keyed trips view is built from the same stream; a cancel runs the workflow's compensation · 8 the workflow
// pushes each booking to the hotel's channel manager through the partner API.
// Working: 1,000,000 hotels × 4 room types × 365 nights = 1.46 B room-night rows (round numbers chosen to size the
// system); 5,800 searches/s at peak × 300 hotels × 4 room types × 3 nights = 20.9 M rows/s if search read the primary.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients column x 105: hotel 140, guest 380, card
// processor 625. Edge column x 297: partner API 140, API gateway 380, CDN 560. Core: booking service (accent) at
// 575, 190. Services column x 575: search 400, trips 515, payment 625. Async column x 879: booking workflow 110,
// change stream 250. Storage column x 1098 (glyphs): inventory DB 150, search index 300, hotel catalog 450, trips
// view 600. The workflow-to-partner edge runs above the booking service (≥ 30 px clear); every long edge was
// checked against the boxes it passes. Two edges cross once near the storage column (search to index and stream to
// trips view); no edge passes through a box.
// Colours: zone tones from ZONE; red only for the naive read-then-write in step 3.

const spec: DiagramSpec = {
  title: "Hotel booking high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Search hotels, open a hotel", covers: "F1, F2" },
    { title: "A row per room type per night", covers: "F5" },
    { title: "A naive booking overbooks", covers: "F3" },
    { title: "Reserve every night at once", covers: "F3" },
    { title: "Hold, pay, confirm", covers: "F3" },
    { title: "Availability into the index", covers: "F1, N3" },
    { title: "My bookings and cancel", covers: "F4, F6" },
    { title: "Tell the hotel", covers: "F5" },
  ],
  zones: zoneFrame({ core: "Reservation core" }),
  nodes: [
    {
      id: "hotel",
      label: "Hotel",
      sub: "channel manager",
      icon: "building",
      fill: "pastel",
      step: 2,
      x: 105,
      y: 140,
      w: 150,
    },
    { id: "guest", label: "Guest", sub: "app / browser", icon: "phone", fill: "pastel", x: 105, y: 380, w: 150 },
    {
      id: "provider",
      label: "Card processor",
      sub: "external",
      icon: "coin",
      fill: "pastel",
      step: 5,
      x: 105,
      y: 625,
      w: 160,
    },
    {
      id: "partner",
      label: "Partner API",
      sub: "rates, rooms in",
      icon: "api",
      tone: "blue",
      fill: "pastel",
      step: 2,
      x: 297,
      y: 140,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 380,
      w: 150,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "photos, pages",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 560,
      w: 150,
    },
    {
      id: "booking",
      label: "Booking service",
      sub: "owns room-nights",
      icon: "lock",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 190,
      w: 220,
    },
    {
      id: "search",
      label: "Search service",
      sub: "results, hotel page",
      icon: "search",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 400,
      w: 200,
    },
    {
      id: "trips",
      label: "Trips service",
      sub: "my bookings",
      icon: "ticket",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 515,
      w: 200,
    },
    {
      id: "payment",
      label: "Payment service",
      sub: "idempotency key",
      icon: "card",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 575,
      y: 625,
      w: 200,
    },
    {
      id: "workflow",
      label: "Booking workflow",
      sub: "hold, pay, confirm",
      icon: "workflow",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 110,
      w: 190,
    },
    {
      id: "stream",
      label: "Change stream",
      sub: "room-night changes",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 6,
      x: 879,
      y: 250,
      w: 190,
    },
    {
      id: "inventory",
      label: "Inventory DB",
      sub: "room-nights, bookings",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 150,
    },
    {
      id: "index",
      label: "Search index",
      sub: "geo + open nights",
      icon: "search",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 300,
    },
    {
      id: "catalog",
      label: "Hotel catalog",
      sub: "content, photos",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 450,
    },
    {
      id: "tripsView",
      label: "Trips view",
      sub: "by guest",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    { from: "guest", to: "gw", flow: true, packet: true },
    { from: "guest", to: "cdn", label: "photos", dashed: true },
    { from: "gw", to: "search", label: "search", flow: true, packet: true, delay: 0.4 },
    { from: "search", to: "catalog", label: "hotels", dashed: true, labelAt: 0.35 },
    { from: "search", to: "inventory", label: "nights per hotel", dashed: true, until: 5 },

    { from: "hotel", to: "partner", flow: true, packet: true, step: 2 },
    { from: "partner", to: "booking", label: "ARI", flow: true, packet: true, delay: 0.4, step: 2 },
    { from: "booking", to: "inventory", label: "set counts", step: 2, until: 2 },

    { from: "gw", to: "booking", label: "book", flow: true, packet: true, step: 3 },
    { from: "booking", to: "inventory", label: "read, then write", tone: "red", step: 3, until: 3 },

    {
      from: "booking",
      to: "inventory",
      label: "UPDATE all nights",
      flow: true,
      packet: true,
      delay: 0.4,
      step: 4,
    },

    { from: "booking", to: "workflow", label: "start", bidirectional: true, step: 5 },
    {
      from: "workflow",
      to: "payment",
      label: "pay, key",
      via: [
        [757, 110],
        [757, 625],
      ],
      labelAt: 0.6,
      step: 5,
    },
    { from: "payment", to: "provider", label: "authorise, capture", step: 5 },

    { from: "inventory", to: "stream", label: "CDC", step: 6 },
    { from: "stream", to: "index", label: "open nights", step: 6 },
    { from: "search", to: "index", label: "query", flow: true, packet: true, delay: 0.8, step: 6 },
    { from: "search", to: "booking", label: "live re-check", dashed: true, step: 6 },

    { from: "gw", to: "trips", label: "my trips", dashed: true, step: 7 },
    { from: "stream", to: "tripsView", label: "by guest", labelAt: 0.3, step: 7 },
    { from: "trips", to: "tripsView", label: "read", dashed: true, step: 7 },

    { from: "workflow", to: "partner", label: "push booking", dashed: true, step: 8 },
  ],
};

export default spec;
