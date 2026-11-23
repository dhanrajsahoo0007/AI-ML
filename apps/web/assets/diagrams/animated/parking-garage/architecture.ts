import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A parking garage operator's system, built one requirement at a time (parking-garage case study, the hero).
// Seven steps: 1 one garage: the gates and a garage controller that keeps the counts in memory · 2 tickets in a
// database: the controller calls the sync service through the device gateway for every entry and waits (replaced in
// step 6) · 3 choose a space by vehicle type: the controller tells the gate which bay to use (replaces the step-1
// link) · 4 reservations as capacity per 15-minute slot: driver app, API gateway, reservation service, slot counters
// in the garage DB, and a no-show release job · 5 pricing and payment: the operator console sets rates and capacity,
// the billing service prices and charges with an idempotency key, the controller takes cards at the exit · 6 many
// garages, gates that work offline: the controller decides locally and syncs event batches up and config down; a
// standby replica and an archive job that reads old sessions from the replica · 7 availability: the availability service serves free spaces to
// the app from the replica; the controller drives the signs.
// Working (round numbers chosen to size the system): 1,000 garages × 500 spaces = 500,000 spaces; 3 parks per space a
// day = 1,500,000 sessions/day; 3 events per session (entry, exit, payment) = 4,500,000 events/day ÷ 86,400 s ≈ 52/s.
// Peak hour: 25% of entries = 375,000 ÷ 3,600 s ≈ 104 entries/s across the fleet. One primary is enough.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients column x 105 (w 150): driver app 130, operator
// 240, card processor 380, garage controller 530 (accent), gates and signs 640. Edge column x 297 (w 150): API gateway
// 300 (low enough that its edge to billing passes under the "Application services" title), device API 530. Core
// column x 575 (w 200): reservation service 130, availability service 235. Services column x 575: billing 420, sync
// 530. Async column x 879 (w 190): no-show release 110, archive job 460. Storage column x 1098 (glyphs): garage DB
// 240, standby replica 440, archive store 600.
// Long edges were checked against the boxes they pass: reservation→DB crosses the async column at y 174 to 214 (the
// no-show box ends at 138); billing→DB at 356 to 298, sync→DB at 414 to 309, availability→replica at 317 to 391 (the
// archive box starts at 432); gateway→billing passes x 419 at y 353 (the services title ends at 342).

const spec: DiagramSpec = {
  title: "Parking garage system high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One garage, counts in memory", covers: "F2" },
    { title: "Tickets in a database", covers: "F2, F3" },
    { title: "A space by vehicle type", covers: "F2" },
    { title: "Reservations as slot capacity", covers: "F1" },
    { title: "Pricing and payment", covers: "F3, F5" },
    { title: "Many garages, gates that work offline", covers: "N3, N7" },
    { title: "Availability for drivers and signs", covers: "F4" },
  ],
  zones: zoneFrame({ clients: "Drivers and garages", core: "Capacity core" }),
  nodes: [
    {
      id: "app",
      label: "Driver app",
      sub: "reserve, pay",
      icon: "phone",
      fill: "pastel",
      step: 4,
      x: 105,
      y: 130,
      w: 150,
    },
    {
      id: "operator",
      label: "Operator",
      sub: "rates, capacity",
      icon: "browser",
      fill: "pastel",
      step: 5,
      x: 105,
      y: 240,
      w: 150,
    },
    {
      id: "processor",
      label: "Processor",
      sub: "card, external",
      icon: "coin",
      fill: "pastel",
      step: 5,
      x: 105,
      y: 380,
      w: 150,
    },
    {
      id: "controller",
      label: "Controller",
      sub: "one per garage",
      icon: "controller",
      accent: true,
      x: 105,
      y: 530,
      w: 150,
    },
    {
      id: "gates",
      label: "Gates, signs",
      sub: "camera, barrier",
      icon: "meter",
      fill: "pastel",
      x: 105,
      y: 640,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      step: 4,
      x: 297,
      y: 300,
      w: 150,
    },
    {
      id: "devgw",
      label: "Device API",
      sub: "mTLS per garage",
      icon: "shield",
      tone: "blue",
      fill: "pastel",
      step: 2,
      x: 297,
      y: 530,
      w: 150,
    },
    {
      id: "reservation",
      label: "Reservation service",
      sub: "slot counters",
      icon: "lock",
      tone: "green",
      fill: "pastel",
      step: 4,
      x: 575,
      y: 130,
      w: 200,
    },
    {
      id: "avail",
      label: "Availability service",
      sub: "free spaces",
      icon: "map",
      tone: "green",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 235,
      w: 200,
    },
    {
      id: "billing",
      label: "Billing service",
      sub: "rates, fees, payments",
      icon: "card",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 575,
      y: 420,
      w: 200,
    },
    {
      id: "sync",
      label: "Sync service",
      sub: "events up, config down",
      icon: "api",
      tone: "teal",
      fill: "pastel",
      step: 2,
      x: 575,
      y: 530,
      w: 200,
    },
    {
      id: "noshow",
      label: "No-show release",
      sub: "30 min after start",
      icon: "timer",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 110,
      w: 190,
    },
    {
      id: "archive",
      label: "Archive job",
      sub: "older than 13 months",
      icon: "snapshot",
      tone: "orange",
      fill: "pastel",
      step: 6,
      x: 879,
      y: 460,
      w: 190,
    },
    {
      id: "db",
      label: "Garage DB",
      sub: "PostgreSQL, ACID",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 240,
    },
    {
      id: "replica",
      label: "Standby replica",
      sub: "failover, reads",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 440,
    },
    {
      id: "objects",
      label: "Archive store",
      sub: "object storage",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    { from: "gates", to: "controller", label: "plate", flow: true, packet: true, until: 2 },

    { from: "controller", to: "devgw", label: "wait", tone: "red", flow: true, packet: true, step: 2, until: 5 },
    { from: "devgw", to: "sync", label: "events", flow: true, packet: true, delay: 0.4, step: 2 },
    { from: "sync", to: "db", label: "tickets", step: 2 },

    { from: "controller", to: "gates", label: "open, bay", flow: true, packet: true, step: 3, until: 6 },

    { from: "app", to: "gw", label: "reserve", flow: true, packet: true, step: 4 },
    { from: "gw", to: "reservation", label: "reserve", flow: true, packet: true, delay: 0.4, step: 4 },
    { from: "reservation", to: "db", label: "slots +1, one tx", flow: true, packet: true, delay: 0.8, step: 4 },
    { from: "noshow", to: "db", label: "release", dashed: true, step: 4 },

    { from: "operator", to: "gw", label: "rates", dashed: true, step: 5 },
    { from: "gw", to: "billing", label: "pay", step: 5 },
    { from: "billing", to: "db", label: "rates, payments", step: 5 },
    { from: "billing", to: "processor", label: "charge, key", step: 5 },
    { from: "controller", to: "processor", label: "card", step: 5 },

    { from: "controller", to: "devgw", label: "batch", bidirectional: true, flow: true, packet: true, step: 6 },
    { from: "db", to: "replica", label: "sync copy", step: 6 },
    { from: "archive", to: "replica", label: "old rows", dashed: true, step: 6 },
    { from: "archive", to: "objects", label: "monthly files", step: 6 },

    { from: "gw", to: "avail", label: "free spaces", dashed: true, step: 7 },
    { from: "avail", to: "replica", label: "counts", dashed: true, step: 7 },
    { from: "controller", to: "gates", label: "open, bay, free", flow: true, packet: true, step: 7 },
  ],
};

export default spec;
