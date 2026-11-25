import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A maps and navigation service, built one requirement at a time (google-maps case study, the hero).
// Seven steps: 1 map tiles: a map builder cuts tiles from the map database into a blob store; phones read them through
// a CDN · 2 routing on a road graph: the routing engine runs plain Dijkstra over the whole graph, drawn red because a
// long route takes seconds (replaced in step 3) · 3 partition the graph into cells and precompute shortcuts between
// cell boundaries; a query searches two cells and the overlay · 4 location reports: phones send batched fixes to the
// report ingest, onto a report stream; a traffic processor matches them to road segments and writes a speed per
// segment; raw reports go to the speed history · 5 live weights and the ETA: a customizer turns changed speeds into
// new cell weights every 30 s without touching the layout; the ETA service sums segment times along each path · 6 a
// navigation session: the phone holds a session with the navigation gateway; the navigation service asks for a
// reroute when the driver leaves the route or a faster one appears, and pushes it · 7 a learned ETA correction: a
// model trained offline on the speed history corrects the summed ETA.
// Working (round numbers chosen to size the system): 500,000,000 daily users × 2 routes = 1,000,000,000 routes/day
// ÷ 86,400 s ≈ 11,600/s, about 35,000/s at a 3 × peak; 20,000,000 drivers navigating at peak × one batch every 5 s =
// 4,000,000 reports/s; plain Dijkstra on a long route settles ~20,000,000 nodes × 100 ns ≈ 2 s, against ~70,000
// nodes ≈ 7 ms on cells (see graph-cells.ts).
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: the phone (y 370). Edge column x 297: report
// ingest 120, API gateway 290, navigation gateway 460, CDN 620. Core: the routing engine (accent) at 575, 175.
// Services: ETA service 490, 400 (w 150) and navigation service 640, 505 (w 170), offset so the reroute edge clears
// the ETA box. Async column x 879: report stream 120, traffic processor 215, customizer 310, map builder 450.
// Storage column x 1098: speed history 120, live speeds 240, ETA model 360, map database 480, blob store 600.
// Every long edge was checked against the boxes it passes: ingest → stream runs at y 120, 27 px above the routing
// engine; CDN → blob store runs at y 600 to 620, under the async zone; the ETA model → ETA edge passes between the
// customizer and the map builder.
// Colours: zone tones from the preset; the step-2 Dijkstra edge is red (too slow); every node is pastel except the
// routing engine (accent) and the storage glyphs.

const spec: DiagramSpec = {
  title: "Maps and navigation high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Map tiles from a CDN", covers: "F1" },
    { title: "Routing: plain Dijkstra is too slow", covers: "F2" },
    { title: "Cells and shortcuts", covers: "F2, N2" },
    { title: "Location reports to segment speeds", covers: "F5" },
    { title: "Live weights and the ETA", covers: "F3, N3" },
    { title: "Navigation: reroute and push", covers: "F4" },
    { title: "A learned ETA correction", covers: "F3, N4" },
  ],
  zones: zoneFrame({ core: "Routing core" }),
  nodes: [
    {
      id: "phone",
      label: "Phone app",
      sub: "map, route",
      icon: "phone",
      fill: "pastel",
      x: 105,
      y: 370,
      w: 140,
    },
    {
      id: "ingest",
      label: "Report ingest",
      sub: "batched fixes",
      icon: "signal",
      tone: "blue",
      fill: "pastel",
      step: 4,
      x: 297,
      y: 120,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      step: 2,
      x: 297,
      y: 290,
      w: 150,
    },
    {
      id: "navgw",
      label: "Nav gateway",
      sub: "session socket",
      icon: "socket",
      tone: "blue",
      fill: "pastel",
      step: 6,
      x: 297,
      y: 460,
      w: 150,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "tiles by version",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 620,
      w: 150,
    },
    {
      id: "routing",
      label: "Routing engine",
      sub: "shortest paths",
      icon: "map",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 175,
      w: 220,
    },
    {
      id: "eta",
      label: "ETA service",
      sub: "sum + correct",
      icon: "clock",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 490,
      y: 400,
      w: 150,
    },
    {
      id: "nav",
      label: "Navigation",
      sub: "off-route, reroute",
      icon: "server",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 640,
      y: 505,
      w: 170,
    },
    {
      id: "stream",
      label: "Report stream",
      sub: "keyed by cell",
      icon: "log",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 120,
      w: 190,
    },
    {
      id: "processor",
      label: "Traffic processor",
      sub: "match, 1-min windows",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 215,
      w: 190,
    },
    {
      id: "customizer",
      label: "Customizer",
      sub: "cell weights, 30 s",
      icon: "timer",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 310,
      w: 190,
    },
    {
      id: "builder",
      label: "Map builder",
      sub: "tiles, graph cells",
      icon: "pipeline",
      tone: "orange",
      fill: "pastel",
      x: 879,
      y: 450,
      w: 190,
    },
    {
      id: "history",
      label: "Speed history",
      sub: "reports, profiles",
      icon: "history",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 120,
    },
    {
      id: "live",
      label: "Live speeds",
      sub: "per segment",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 240,
    },
    {
      id: "model",
      label: "ETA model",
      sub: "trained daily",
      icon: "model",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 360,
    },
    {
      id: "mapdb",
      label: "Map database",
      sub: "roads, edits",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 480,
    },
    {
      id: "blob",
      label: "Blob store",
      sub: "tiles, graph files",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    { from: "phone", to: "cdn", label: "tile z/x/y", flow: true, packet: true },
    { from: "cdn", to: "blob", label: "miss: read tile", dashed: true },
    { from: "mapdb", to: "builder", label: "roads", dashed: true },
    { from: "builder", to: "blob", label: "cut tiles", dashed: true },

    { from: "phone", to: "gw", label: "route A→B", flow: true, packet: true, step: 2 },
    { from: "gw", to: "routing", label: "Dijkstra: 2 s", tone: "red", step: 2, until: 2 },
    { from: "builder", to: "routing", label: "whole graph", dashed: true, step: 2, until: 2 },

    { from: "gw", to: "routing", label: "route", flow: true, packet: true, delay: 0.4, step: 3 },
    { from: "builder", to: "routing", label: "cells, layout", dashed: true, step: 3 },

    { from: "phone", to: "ingest", label: "fixes, 5 s", flow: true, packet: true, step: 4 },
    { from: "ingest", to: "stream", label: "append", flow: true, packet: true, delay: 0.4, step: 4 },
    { from: "stream", to: "processor", step: 4 },
    { from: "processor", to: "live", label: "speeds", step: 4 },
    { from: "stream", to: "history", label: "raw", dashed: true, step: 4 },

    { from: "processor", to: "customizer", step: 5 },
    { from: "customizer", to: "routing", label: "weights, 30 s", flow: true, packet: true, step: 5 },
    { from: "customizer", to: "eta", label: "segment speeds", dashed: true, labelAt: 0.3, step: 5 },
    { from: "routing", to: "eta", label: "paths", step: 5 },

    { from: "phone", to: "navgw", label: "session", bidirectional: true, step: 6 },
    { from: "navgw", to: "nav", label: "position", flow: true, packet: true, step: 6 },
    { from: "nav", to: "routing", label: "reroute", labelAt: 0.15, step: 6 },

    { from: "model", to: "eta", label: "learned correction", dashed: true, step: 7 },
  ],
};

export default spec;
