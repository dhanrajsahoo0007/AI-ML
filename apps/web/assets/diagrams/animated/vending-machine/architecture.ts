import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A vending machine and the backend for a connected fleet, built one requirement at a time (vending-machine case
// study, the hero). Seven steps: 1 one machine: the payment devices (coins, notes, card reader, keypad) talk to the
// controller, which runs the state machine and drives the motors · 2 failure paths: the controller writes every
// vend, refund and cash count to a local log (SQLite, fsync) before it acts, so a power cut mid-vend is recoverable ·
// 3 card payment: the controller authorises through the payment API; the payment service holds the money at the
// card processor, then captures after a good vend or releases after a failed one, and keeps each payment's state in
// the payments DB · 4 connected: the local log uploads events with per-machine sequence numbers through the MQTT
// broker into the event log (Kafka, keyed by machine) · 5 ingest: the stream processor applies each sale once and
// keeps stock per slot in the fleet DB; telemetry goes to a time-series DB · 6 prices and configuration: the operator
// sets prices through the API gateway; the config service writes the desired version to the fleet DB and sends it
// down through the broker; the step-4 upload edge becomes two-way · 7 alerts and restocking: the restock planner
// reads stock and alerts and sends pick lists to the driver app; old sales go to the archive store.
// Working (round numbers chosen to size the system): 100,000 machines × 40 vends a day = 4,000,000 vends a day ÷
// 86,400 s ≈ 46/s; lunch hour carries 15% of vends: 600,000 ÷ 3,600 s ≈ 167/s. Heartbeats every 5 minutes: 288 a
// day × 100,000 = 28,800,000 ≈ 333/s. Events ≈ 33,000,000 a day ≈ 380/s; 200 bytes each ≈ 6.6 GB a day.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients column x 105 (w 150): pay devices 105,
// controller 200 (accent), local log 305, driver app 500, operator 610. Edge column x 297 (w 150): payment API 200,
// MQTT broker 305, API gateway 555. Core column x 575 (w 200): payment service 120, card processor 235. Services
// column x 575: config service 450, restock planner 580. Async column x 879: stream processor 180 (w 190), event log
// glyph 305. Storage column x 1098 (glyphs): payments DB 110, telemetry DB 260, fleet DB 430, archive store 600.
// Long edges were checked against the boxes they pass: payment service→payments DB runs at y 110 to 120, above the
// stream processor (152 to 208); broker→event log runs at y 305 between the core (ends 263) and the services zone
// title (330); config→fleet DB runs at y 430 to 450, under the event log's label; stream processor→fleet DB passes
// x 994 at y 260, left of the telemetry DB glyph.

const spec: DiagramSpec = {
  title: "Vending machine fleet high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One machine, a state machine", covers: "F1" },
    { title: "Failure paths and a local log", covers: "F2, N1" },
    { title: "Card: authorise, vend, capture", covers: "F5, N1" },
    { title: "Connected: store and forward", covers: "F3, N2, N4" },
    { title: "Sales and stock per machine", covers: "F3, N5" },
    { title: "Prices: desired against reported", covers: "F4, N6" },
    { title: "Alerts and restocking", covers: "F3" },
  ],
  // The clients zone is 6 units wider than the frame so its title ends inside it.
  zones: zoneFrame({ clients: "Machines and people", core: "Payments core" }).map((z) =>
    z.id === "clients" ? { ...z, w: 176 } : z
  ),
  nodes: [
    {
      id: "devices",
      label: "Pay devices",
      sub: "coins, notes, card",
      icon: "coin",
      fill: "pastel",
      x: 105,
      y: 105,
      w: 154,
    },
    {
      id: "controller",
      label: "Controller",
      sub: "state machine",
      icon: "controller",
      accent: true,
      x: 105,
      y: 200,
      w: 150,
    },
    {
      id: "locallog",
      label: "Local log",
      sub: "SQLite, seq ids",
      icon: "log",
      fill: "pastel",
      step: 2,
      x: 105,
      y: 305,
      w: 150,
    },
    {
      id: "driver",
      label: "Driver app",
      sub: "restock route",
      icon: "phone",
      fill: "pastel",
      step: 7,
      x: 105,
      y: 500,
      w: 150,
    },
    {
      id: "operator",
      label: "Operator",
      sub: "prices, alerts",
      icon: "browser",
      fill: "pastel",
      step: 6,
      x: 105,
      y: 610,
      w: 150,
    },
    {
      id: "payapi",
      label: "Payment API",
      sub: "HTTPS, keys",
      icon: "api",
      tone: "blue",
      fill: "pastel",
      step: 3,
      x: 297,
      y: 200,
      w: 150,
    },
    {
      id: "broker",
      label: "MQTT broker",
      sub: "mTLS, QoS 1",
      icon: "shield",
      tone: "blue",
      fill: "pastel",
      step: 4,
      x: 297,
      y: 305,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      step: 6,
      x: 297,
      y: 555,
      w: 150,
    },
    {
      id: "payment",
      label: "Payment service",
      sub: "auth, capture, sweep",
      icon: "card",
      tone: "green",
      fill: "pastel",
      step: 3,
      x: 575,
      y: 120,
      w: 200,
    },
    {
      id: "processor",
      label: "Card processor",
      sub: "external",
      icon: "coin",
      tone: "green",
      fill: "pastel",
      step: 3,
      x: 575,
      y: 235,
      w: 200,
    },
    {
      id: "config",
      label: "Config service",
      sub: "desired vs reported",
      icon: "policy",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 450,
      w: 200,
    },
    {
      id: "restock",
      label: "Restock planner",
      sub: "pick lists, routes",
      icon: "map",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 580,
      w: 200,
    },
    {
      id: "stream",
      label: "Stream processor",
      sub: "dedup, stock, alerts",
      icon: "pipeline",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 180,
      w: 190,
    },
    {
      id: "eventlog",
      label: "Event log",
      sub: "Kafka, by machine",
      icon: "log",
      tone: "orange",
      variant: "glyph",
      step: 4,
      x: 879,
      y: 305,
    },
    {
      id: "paydb",
      label: "Payments DB",
      sub: "PostgreSQL",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 110,
    },
    {
      id: "tsdb",
      label: "Telemetry DB",
      sub: "time-series",
      icon: "chart",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 260,
    },
    {
      id: "fleetdb",
      label: "Fleet DB",
      sub: "PostgreSQL",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 430,
    },
    {
      id: "archive",
      label: "Archive store",
      sub: "object storage",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    { from: "devices", to: "controller", label: "credit, vend", bidirectional: true, flow: true, packet: true },

    { from: "controller", to: "locallog", label: "log, fsync", flow: true, packet: true, step: 2 },

    { from: "controller", to: "payapi", label: "auth", flow: true, packet: true, step: 3 },
    { from: "payapi", to: "payment", label: "key", flow: true, packet: true, delay: 0.4, step: 3 },
    { from: "payment", to: "processor", label: "hold, settle", bidirectional: true, step: 3 },
    { from: "payment", to: "paydb", label: "payment states", step: 3 },

    { from: "locallog", to: "broker", label: "up", flow: true, packet: true, step: 4, until: 5 },
    { from: "broker", to: "eventlog", label: "events, seq", flow: true, packet: true, delay: 0.4, step: 4 },

    { from: "eventlog", to: "stream", label: "consume", flow: true, packet: true, delay: 0.8, step: 5 },
    { from: "stream", to: "fleetdb", label: "sale once, stock", labelAt: 0.62, step: 5 },
    { from: "eventlog", to: "tsdb", label: "telemetry", labelAt: 0.4, dashed: true, step: 5 },

    { from: "locallog", to: "broker", label: "sync", bidirectional: true, flow: true, packet: true, step: 6 },
    { from: "operator", to: "gw", label: "prices", flow: true, packet: true, step: 6 },
    { from: "gw", to: "config", label: "price v12", flow: true, packet: true, delay: 0.4, step: 6 },
    { from: "config", to: "fleetdb", label: "desired", step: 6 },
    { from: "config", to: "broker", label: "delta", dashed: true, step: 6 },

    { from: "restock", to: "fleetdb", label: "stock, alerts", dashed: true, step: 7 },
    { from: "gw", to: "restock", label: "pick lists", bidirectional: true, step: 7 },
    { from: "driver", to: "gw", label: "route", step: 7 },
    { from: "fleetdb", to: "archive", label: "old sales", dashed: true, step: 7 },
  ],
};

export default spec;
