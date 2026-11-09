import type { DiagramSpec } from "@/components/diagrams/types";

// The trip one packet takes from a reader's laptop in Chennai to a web server in Frankfurt, and which layers each
// device opens. Top row (y = 120), left to right: laptop -> home router -> ISP router -> internet core. The path
// turns down at the right into the data center (y = 320), right to left: load balancer -> web server. The DNS
// lookup that happens first hangs below the laptop as a dashed side trip.
//
// Layout check (cards 140 x 64, so x +/- 70, y +/- 32):
//   row 120: laptop 40-180, router 240-380, isp 470-610, core 700-840 (gaps 60, 90, 90)
//   row 320: dns 40-180, server 470-610, lb 700-840
// Zones: home 20-410 x 50-200, internet 430-880 x 50-200, name lookup 20-410 x 250-400, data center 430-880 x 250-400.
// One-way costs: 2 + 5 + 60 + 1 + 0.2 = about 68 ms, so about 140 ms for a round trip.
const spec: DiagramSpec = {
  title: "One packet's trip, and the layers each device reads",
  width: 900,
  height: 420,
  zones: [
    { id: "home", title: "Reader's home · Chennai", tone: "neutral", x: 20, y: 50, w: 390, h: 150 },
    { id: "internet", title: "The internet", tone: "blue", x: 430, y: 50, w: 450, h: 150 },
    { id: "lookup", title: "Name lookup, first", tone: "teal", x: 20, y: 250, w: 390, h: 150 },
    { id: "dc", title: "Data center · Frankfurt", tone: "green", x: 430, y: 250, w: 450, h: 150 },
  ],
  nodes: [
    {
      id: "laptop",
      label: "Laptop",
      sub: "reads all layers",
      icon: "browser",
      tone: "neutral",
      x: 110,
      y: 120,
      w: 140,
      h: 64,
    },
    {
      id: "router",
      label: "Home router",
      sub: "reads L2 to L4",
      icon: "network",
      tone: "neutral",
      x: 310,
      y: 120,
      w: 140,
      h: 64,
    },
    {
      id: "isp",
      label: "ISP router",
      sub: "reads L2 and L3",
      icon: "network",
      tone: "blue",
      x: 540,
      y: 120,
      w: 140,
      h: 64,
    },
    {
      id: "core",
      label: "Internet core",
      sub: "about 12 routers",
      icon: "globe",
      tone: "blue",
      x: 770,
      y: 120,
      w: 140,
      h: 64,
    },
    {
      id: "dns",
      label: "DNS resolver",
      sub: "name to address",
      icon: "dns",
      tone: "teal",
      x: 110,
      y: 320,
      w: 140,
      h: 64,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "reads L4 or L7",
      icon: "load-balancer",
      tone: "green",
      x: 770,
      y: 320,
      w: 140,
      h: 64,
    },
    {
      id: "server",
      label: "Web server",
      sub: "reads all layers",
      icon: "server",
      tone: "green",
      accent: true,
      x: 540,
      y: 320,
      w: 140,
      h: 64,
    },
  ],
  edges: [
    { from: "laptop", to: "dns", label: "name lookup", tone: "teal", dashed: true },
    { from: "laptop", to: "router", label: "2 ms", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "router", to: "isp", label: "5 ms", tone: "blue", flow: true, packet: true, delay: 0.5 },
    { from: "isp", to: "core", label: "60 ms", tone: "blue", flow: true, packet: true, delay: 1 },
    { from: "core", to: "lb", label: "1 ms", tone: "green", flow: true, packet: true, delay: 1.5 },
    { from: "lb", to: "server", label: "0.2 ms", tone: "green", flow: true, packet: true, delay: 2 },
  ],
};

export default spec;
