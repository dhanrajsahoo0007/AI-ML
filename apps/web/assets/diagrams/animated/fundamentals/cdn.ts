import type { DiagramSpec } from "@/components/diagrams/types";

// The poster shop from the CDN page. The origin sits in Virginia; readers and a CDN edge sit in Mumbai.
// Step 1: Reader A asks the edge for a photo; the edge has no copy (miss), fetches it from the origin
// (about 200 ms away), keeps it and returns it.
// Step 2: Reader B asks two minutes later; the edge answers from its copy (hit, about 10 ms) and the origin
// does no work.
// Step 3: Reader C asks the next day, after the 24 h TTL ran out; the edge asks the origin "has it changed?"
// and gets a tiny 304 Not Modified, so it keeps serving the same copy for another TTL.
//
// Layout check (card boxes, centre ± w/2, h 64):
// readerA 35-185 x 88-152, readerB 35-185 x 198-262, readerC 35-185 x 308-372 (row gaps 46).
// edge 265-445 x 198-262. origin 540-710 x 198-262. store (glyph) 762-838 x 203-292.
// Column gaps: 80 (readers to edge), 95 (edge to origin), 52 (origin to store).
// The revalidate route leaves the edge's bottom, runs along y 330 under every box and climbs into the origin,
// so it never sits on top of the step-1 miss line at y 230. Zones end at y 400; canvas is 900 x 420.
const spec: DiagramSpec = {
  title: "A CDN edge: miss, hit, revalidate",
  width: 900,
  height: 420,
  steps: [
    { title: "Miss: the edge fetches from the origin" },
    { title: "Hit: the edge answers on its own" },
    { title: "TTL over: the edge revalidates" },
  ],
  zones: [
    { id: "readers", title: "Readers in Mumbai", tone: "neutral", x: 20, y: 50, w: 200, h: 350 },
    { id: "edge-zone", title: "CDN edge in Mumbai", tone: "blue", x: 250, y: 50, w: 210, h: 350 },
    { id: "origin-zone", title: "Origin in Virginia", tone: "teal", x: 490, y: 50, w: 390, h: 350 },
  ],
  nodes: [
    { id: "reader-a", label: "Reader A", sub: "first visit", icon: "browser", x: 110, y: 120, w: 150, h: 64 },
    {
      id: "reader-b",
      label: "Reader B",
      sub: "2 minutes later",
      icon: "browser",
      step: 2,
      x: 110,
      y: 230,
      w: 150,
      h: 64,
    },
    { id: "reader-c", label: "Reader C", sub: "the next day", icon: "browser", step: 3, x: 110, y: 340, w: 150, h: 64 },
    {
      id: "edge",
      label: "Edge server",
      sub: "cache, 10 ms away",
      icon: "cdn",
      tone: "blue",
      accent: true,
      x: 355,
      y: 230,
      w: 180,
      h: 64,
    },
    {
      id: "origin",
      label: "Origin server",
      sub: "200 ms from Mumbai",
      icon: "server",
      tone: "teal",
      x: 625,
      y: 230,
      w: 170,
      h: 64,
    },
    { id: "store", label: "Poster photos", icon: "blob", tone: "violet", variant: "glyph", x: 800, y: 230 },
  ],
  edges: [
    // Step 1: a miss travels all the way to the origin and back.
    {
      from: "reader-a",
      to: "edge",
      label: "GET",
      tone: "blue",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0,
    },
    // until: 1 so steps 2 and 3 do not still show the origin working on the old miss.
    {
      from: "edge",
      to: "origin",
      label: "miss: fetch",
      tone: "orange",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0.6,
      until: 1,
    },
    { from: "origin", to: "store", label: "read", dashed: true, delay: 1.2, until: 1 },

    // Step 2: a hit never leaves Mumbai.
    {
      from: "reader-b",
      to: "edge",
      label: "hit",
      tone: "green",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0,
    },

    // Step 3: the copy is past its TTL; a conditional request comes back as a small 304.
    {
      from: "reader-c",
      to: "edge",
      label: "GET",
      tone: "blue",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0,
    },
    {
      from: "edge",
      to: "origin",
      label: "revalidate: 304",
      tone: "orange",
      dashed: true,
      flow: true,
      packet: true,
      bidirectional: true,
      step: 3,
      delay: 0.6,
      via: [
        [400, 330],
        [590, 330],
      ],
    },
  ],
};

export default spec;
