import type { DiagramSpec } from "@/components/diagrams/types";

// One request from Maya's office laptop to the bookshop crosses two proxies.
// Step 1: the office's forward proxy speaks for 400 laptops; the outside world sees one office address.
// Step 2: the shop's reverse proxy speaks for three app servers; TLS ends there and plain HTTP goes inside.
//
// Layout check (card boxes, centre ± w/2, ± h/2):
// maya 25-175 x 91-149, others 25-175 x 251-309, fproxy 215-365 x 168-232 (gap 40 to the laptops),
// internet glyph 432-508 x 113-202, sites 410-530 x 256-314 (gap 54 under the glyph),
// rproxy 575-725 x 168-232 (gap 67 after the glyph), app1/app2/app3 775-905 x 81-139 / 171-229 / 261-319
// (row gaps 32, gap 50 after the proxy). Zones: office 15-385, internet 405-535, shop 555-925 (gaps 20).
const spec: DiagramSpec = {
  title: "Forward proxy and reverse proxy on one request",
  width: 940,
  height: 380,
  steps: [{ title: "Forward proxy: speaks for the clients" }, { title: "Reverse proxy: speaks for the servers" }],
  zones: [
    { id: "office", title: "Office network", tone: "neutral", x: 15, y: 40, w: 370, h: 320 },
    { id: "net", title: "Internet", tone: "blue", x: 405, y: 40, w: 130, h: 320 },
    { id: "shop", title: "Shop data centre", tone: "green", x: 555, y: 40, w: 370, h: 320 },
  ],
  nodes: [
    { id: "maya", label: "Maya's laptop", sub: "one of 400", icon: "browser", x: 100, y: 120, w: 150 },
    { id: "others", label: "Other laptops", sub: "399 more", icon: "users", x: 100, y: 280, w: 150 },
    {
      id: "fproxy",
      label: "Forward proxy",
      sub: "filters and logs",
      icon: "shield",
      tone: "blue",
      x: 290,
      y: 200,
      w: 150,
      h: 64,
    },
    { id: "internet", label: "Internet", icon: "globe", tone: "blue", variant: "glyph", x: 470, y: 140 },
    { id: "sites", label: "Other sites", sub: "news, video", icon: "server", x: 470, y: 285, w: 120 },
    {
      id: "rproxy",
      label: "Reverse proxy",
      sub: "TLS ends here",
      icon: "load-balancer",
      tone: "green",
      accent: true,
      step: 2,
      x: 650,
      y: 200,
      w: 150,
      h: 64,
    },
    {
      id: "app1",
      label: "App server 1",
      sub: "10.0.1.11",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 840,
      y: 110,
      w: 130,
    },
    {
      id: "app2",
      label: "App server 2",
      sub: "10.0.1.12",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 840,
      y: 200,
      w: 130,
    },
    {
      id: "app3",
      label: "App server 3",
      sub: "10.0.1.13",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 840,
      y: 290,
      w: 130,
    },
  ],
  edges: [
    // Step 1: every laptop's traffic leaves through the forward proxy.
    { from: "maya", to: "fproxy", label: "HTTPS", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "others", to: "fproxy", tone: "blue", flow: true, packet: true, delay: 0.3 },
    { from: "fproxy", to: "internet", label: "HTTPS", tone: "blue", flow: true, packet: true, delay: 1.0 },
    { from: "internet", to: "sites", dashed: true, flow: true, delay: 1.8 },

    // Step 2: the shop's reverse proxy takes the request and picks an app server.
    { from: "internet", to: "rproxy", label: "HTTPS", tone: "green", flow: true, packet: true, delay: 1.8 },
    { from: "rproxy", to: "app1", tone: "teal", flow: true, packet: true, delay: 2.6 },
    { from: "rproxy", to: "app2", label: "HTTP", tone: "teal", flow: true, packet: true, delay: 2.6 },
    { from: "rproxy", to: "app3", tone: "teal", flow: true, packet: true, delay: 2.6 },
  ],
};

export default spec;
