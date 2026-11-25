import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A subscription video service with a fixed catalogue, built one requirement at a time (netflix case study, the hero).
// Eight steps: 1 stream from one origin: the playback service authorises the member and hands back one file URL on
// the origin store (replaced in step 3) · 2 an encoding ladder per title: the studio's master goes through the ingest
// service to an encode pipeline that writes every rung, in segments, to the origin store · 3 own appliances inside
// ISPs and at exchange points, and a steering service (the accent) that ranks appliance URLs from what each
// appliance reports · 4 fill the appliances off-peak: a popularity forecast hands steering a fill plan, the exchange
// appliances copy new files from the origin at night and the ISP appliances copy from them · 5 the control plane in
// three cloud regions behind a region DNS · 6 a cache tier: the browse service reads personalised rows and title
// data from a zone-mirrored cache · 7 resilience: the device falls back to the exchange appliance, a failure-injection
// tool kills instances in production · 8 the resume position: heartbeats go to the resume service and a wide-column
// viewing store, which also feeds the popularity forecast.
// Working (round numbers chosen to size the system): 20,000,000 streams at the evening peak × 5 Mb/s = 100 Tb/s;
// ÷ 50 Gb/s per appliance = 2,000 appliances at least. Play starts: 20,000,000 ÷ 2,400 s (40-minute sessions) ≈
// 8,300/s. Heartbeats: 20,000,000 ÷ 60 s ≈ 333,000 writes/s.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: member device (105, 160), studio (105, 360).
// Edge column x 297: ISP appliance 110, IX appliance 230, API gateway 470, region DNS 600. Core x 575: playback 110,
// steering 220. Services x 575: ingest 390, browse 480, resume 590. Async x 879: encode pipeline 190, popularity
// forecast 300, failure injection 395. Storage x 1098: metadata DB 110, origin store 260, cache 440, viewing store 590.
// Corridors: x 393 between edge and core (gateway to playback), y 36 above the zones (step-1 file and the nightly
// fill), x 201 between clients and edge (fill down to the IX appliance), x 1001 between async and storage (origin
// up to the top corridor; viewing history up to the forecast). Long edges checked against the boxes they pass:
// playback to DB runs at y 110 above the encode pipeline (165 to 215); ingest to encode crosses x 784 at y 252, above
// the forecast (275 to 325); browse to cache crosses x 974 at y 450, under failure injection (370 to 420).
// Colours: zone tones from the preset; no red: nothing on this picture is a failure.
// Fact check (2026-11-17): no real-system fact is drawn; the steering-and-fill split follows the Open Connect
// Overview (read 2026), quoted only under "How real systems do it".

const spec: DiagramSpec = {
  title: "Subscription video service high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Stream from one origin", covers: "F2" },
    { title: "An encoding ladder per title", covers: "F4, N1" },
    { title: "Own appliances and steering", covers: "F2, N2, N7" },
    { title: "Fill off-peak from a forecast", covers: "N4, N7" },
    { title: "Three cloud regions", covers: "N3" },
    { title: "A cache for catalogue data", covers: "F1, N6" },
    { title: "Fallbacks and failure injection", covers: "N3, N6" },
    { title: "The resume position", covers: "F3, N5" },
  ],
  zones: zoneFrame({ edge: "Edge and own CDN", core: "Playback control plane" }),
  nodes: [
    {
      id: "device",
      label: "Member",
      sub: "TV, phone, web",
      icon: "video",
      fill: "pastel",
      x: 105,
      y: 160,
      w: 150,
    },
    {
      id: "studio",
      label: "Studio",
      sub: "masters",
      icon: "building",
      fill: "pastel",
      step: 2,
      x: 105,
      y: 360,
      w: 150,
    },
    {
      id: "isp",
      label: "ISP appliance",
      sub: "inside the ISP",
      icon: "appliance",
      tone: "blue",
      fill: "pastel",
      step: 3,
      x: 297,
      y: 110,
      w: 150,
    },
    {
      id: "ix",
      label: "IX appliance",
      sub: "exchange point",
      icon: "appliance",
      tone: "blue",
      fill: "pastel",
      step: 3,
      x: 297,
      y: 230,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "L7 LB, auth",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 470,
      w: 150,
    },
    {
      id: "dns",
      label: "Region DNS",
      sub: "3 active regions",
      icon: "dns",
      tone: "blue",
      fill: "pastel",
      step: 5,
      x: 297,
      y: 600,
      w: 150,
    },
    {
      id: "playback",
      label: "Playback service",
      sub: "authorise, manifest",
      icon: "video",
      tone: "green",
      fill: "pastel",
      x: 575,
      y: 110,
      w: 230,
    },
    {
      id: "steer",
      label: "Steering and fill",
      sub: "ranked URLs, fill plans",
      icon: "router",
      tone: "green",
      accent: true,
      step: 3,
      x: 575,
      y: 220,
      w: 230,
    },
    {
      id: "ingest",
      label: "Ingest service",
      sub: "studio masters",
      icon: "file",
      tone: "teal",
      fill: "pastel",
      step: 2,
      x: 575,
      y: 390,
      w: 200,
    },
    {
      id: "browse",
      label: "Browse service",
      sub: "personalised rows",
      icon: "feed",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 480,
      w: 200,
    },
    {
      id: "resume",
      label: "Resume service",
      sub: "positions, heartbeats",
      icon: "history",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 575,
      y: 590,
      w: 200,
    },
    {
      id: "encode",
      label: "Encode pipeline",
      sub: "per-title ladders",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 2,
      x: 879,
      y: 190,
      w: 190,
    },
    {
      id: "forecast",
      label: "Popularity forecast",
      sub: "per region, nightly",
      icon: "chart",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 300,
      w: 190,
    },
    {
      id: "chaos",
      label: "Failure injection",
      sub: "kills instances",
      icon: "shield",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 395,
      w: 190,
    },
    {
      id: "db",
      label: "Metadata DB",
      sub: "accounts, titles",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 110,
    },
    {
      id: "origin",
      label: "Origin store",
      sub: "every encoded file",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 260,
    },
    {
      id: "cache",
      label: "Catalogue cache",
      sub: "mirrored per zone",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 440,
    },
    {
      id: "viewing",
      label: "Viewing store",
      sub: "wide-column",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 8,
      x: 1098,
      y: 590,
    },
  ],
  edges: [
    // Step 1: one origin, one file.
    { from: "device", to: "gw", label: "play", flow: true, packet: true },
    {
      from: "gw",
      to: "playback",
      label: "start",
      flow: true,
      packet: true,
      delay: 0.4,
      via: [
        [393, 470],
        [393, 110],
      ],
    },
    { from: "playback", to: "db", label: "account, licence", labelAt: 0.3, dashed: true },
    {
      from: "device",
      to: "origin",
      label: "one file",
      flow: true,
      packet: true,
      delay: 0.8,
      until: 2,
      via: [
        [105, 36],
        [1001, 36],
        [1001, 260],
      ],
    },

    // Step 2: a ladder per title.
    { from: "studio", to: "ingest", label: "master", flow: true, packet: true, step: 2 },
    { from: "ingest", to: "encode", label: "encode job", labelAt: 0.4, flow: true, packet: true, delay: 0.4, step: 2 },
    { from: "encode", to: "origin", flow: true, packet: true, delay: 0.8, step: 2 },

    // Step 3: own appliances and steering.
    { from: "playback", to: "steer", label: "pick appliances", step: 3 },
    {
      from: "device",
      to: "isp",
      label: "segments",
      labelAt: 0.6,
      flow: true,
      packet: true,
      step: 3,
      via: [[105, 110]],
    },
    { from: "ix", to: "steer", label: "health, files", labelAt: 0.62, dashed: true, step: 3 },

    // Step 4: nightly fill from a forecast.
    { from: "forecast", to: "steer", label: "fill plan", labelAt: 0.4, dashed: true, step: 4 },
    {
      from: "origin",
      to: "ix",
      label: "nightly fill",
      labelAt: 0.4,
      flow: true,
      packet: true,
      step: 4,
      via: [
        [1001, 260],
        [1001, 36],
        [201, 36],
        [201, 230],
      ],
    },
    { from: "ix", to: "isp", label: "peer fill", flow: true, packet: true, delay: 0.6, step: 4 },

    // Step 5: three regions.
    { from: "dns", to: "gw", label: "healthy region", step: 5 },

    // Step 6: the catalogue cache.
    { from: "gw", to: "browse", label: "home rows", step: 6 },
    { from: "browse", to: "cache", label: "rows, titles", labelAt: 0.62, step: 6 },

    // Step 7: fallbacks and failure injection.
    { from: "device", to: "ix", label: "fallback", labelAt: 0.6, dashed: true, step: 7, via: [[105, 230]] },
    { from: "chaos", to: "browse", label: "kill", dashed: true, step: 7 },

    // Step 8: the resume position.
    { from: "gw", to: "resume", label: "heartbeat", flow: true, packet: true, step: 8 },
    { from: "resume", to: "viewing", label: "position", labelAt: 0.62, flow: true, packet: true, delay: 0.4, step: 8 },
    {
      from: "viewing",
      to: "forecast",
      label: "watch history",
      labelAt: 0.8,
      dashed: true,
      step: 8,
      via: [
        [1001, 590],
        [1001, 300],
      ],
    },
  ],
};

export default spec;
