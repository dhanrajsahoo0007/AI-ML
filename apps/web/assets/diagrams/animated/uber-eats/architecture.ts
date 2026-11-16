import type { DiagramSpec } from "@/components/diagrams/types";

// Uber Eats architecture, built up one requirement at a time (uber-eats case study, Steps 1 to 5 and Final
// architecture).
// Steps: 1 browse nearby restaurants (F1) · 2 place an order and pay (F2) · 3 restaurant accepts, everyone hears about
// it (F3, F6) · 4 dispatch a courier (F4) · 5 live tracking and ETA (F5).
//
// Main paths (packets): browse = customer -> gateway -> search -> search index; order = customer ->
// gateway -> order service -> payment + orders DB -> event bus -> notifier -> socket gateway ->
// restaurant / customer; dispatch = bus -> dispatch <-> location; tracking = courier -> socket
// gateway -> location -> geo index + bus.
//
// Working (from the page's estimates): 10M orders a day / 86,400 s = 115/s, x 5 at dinner = about 600/s; 1M couriers
// online / one GPS fix every 4 s = 250K location writes/s, about 400 x the order rate, which is why the geo index is a
// separate in-memory store and not the orders DB.
//
// Layout: 1200 x 790 (taller than the 1200 x 740 hero grid because this spec predates zoneFrame(); nodes and zones
// keep their original places). Columns: Clients x 20, Edge x 212, Application services (top) and Ordering & dispatch
// (bottom) x 405, Async pipeline x 768, Storage x 1012.
// Style (restyled 2026-11-17): pastel blocks (fill "pastel") for services and apps, glyphs for stores and the bus, the
// order service is the one accent (no fill). Node ids and positions are unchanged, because the question bank embeds
// this spec with highlight={["order", "dispatch", "location", "bus"]}.
// Colours: zones as in CASE-STUDY-FORMAT.md (Clients neutral, Edge blue, services teal, core green, async orange,
// storage violet); the geo index is red because it is the one store that may lose data (it refills from GPS).
const spec: DiagramSpec = {
  title: "Uber Eats high-level architecture",
  width: 1200,
  height: 790,
  steps: [
    { title: "Browse nearby restaurants", covers: "F1" },
    { title: "Place an order and pay", covers: "F2" },
    { title: "Restaurant accepts, everyone hears about it", covers: "F3, F6" },
    { title: "Dispatch a courier", covers: "F4" },
    { title: "Live tracking and ETA", covers: "F5" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 60, w: 170, h: 670 },
    { id: "edge", title: "Edge", tone: "blue", x: 212, y: 60, w: 170, h: 670 },
    { id: "services", title: "Application services", tone: "teal", x: 405, y: 60, w: 340, h: 250 },
    { id: "core", title: "Ordering & dispatch", tone: "green", x: 405, y: 340, w: 340, h: 390 },
    { id: "async", title: "Async pipeline", tone: "orange", x: 768, y: 340, w: 222, h: 390 },
    { id: "storage", title: "Storage", tone: "violet", x: 1012, y: 60, w: 172, h: 640 },
  ],
  nodes: [
    {
      id: "customer",
      fill: "pastel",
      label: "Customer app",
      sub: "browse, order",
      icon: "phone",
      x: 105,
      y: 150,
      w: 150,
      h: 64,
    },
    {
      id: "gateway",
      fill: "pastel",
      label: "API gateway",
      sub: "auth, rate limit",
      icon: "gateway",
      tone: "blue",
      x: 297,
      y: 150,
      w: 160,
      h: 64,
    },
    {
      id: "search",
      fill: "pastel",
      label: "Search service",
      sub: "nearby, open, cuisine",
      icon: "server",
      tone: "teal",
      x: 575,
      y: 110,
      w: 210,
      h: 56,
    },
    {
      id: "menu",
      fill: "pastel",
      label: "Restaurant service",
      sub: "menus, hours, prices",
      icon: "media",
      tone: "teal",
      x: 575,
      y: 190,
      w: 210,
      h: 56,
    },
    {
      id: "searchIdx",
      label: "Search index",
      sub: "geo + text",
      icon: "registry",
      tone: "teal",
      variant: "glyph",
      x: 1098,
      y: 110,
    },
    {
      id: "restaurantsDb",
      label: "Restaurants DB",
      sub: "menus, locations",
      icon: "database",
      tone: "blue",
      variant: "glyph",
      x: 1098,
      y: 225,
    },

    {
      id: "order",
      label: "Order service",
      sub: "order state machine",
      icon: "bag",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 400,
      w: 210,
      h: 60,
    },
    {
      id: "payment",
      fill: "pastel",
      label: "Payment service",
      sub: "Stripe / Adyen",
      icon: "card",
      tone: "teal",
      step: 2,
      x: 575,
      y: 270,
      w: 210,
      h: 56,
    },
    {
      id: "ordersDb",
      label: "Orders DB",
      sub: "relational, ACID",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 340,
    },

    {
      id: "restaurant",
      fill: "pastel",
      label: "Restaurant app",
      sub: "kitchen tablet",
      icon: "phone",
      step: 3,
      x: 105,
      y: 430,
      w: 150,
      h: 64,
    },
    {
      id: "rtgw",
      fill: "pastel",
      label: "Socket gateway",
      sub: "live WebSockets",
      icon: "load-balancer",
      tone: "blue",
      step: 3,
      x: 297,
      y: 660,
      w: 160,
      h: 64,
    },
    {
      id: "bus",
      label: "Event bus",
      sub: "order events",
      icon: "queue",
      tone: "orange",
      variant: "glyph",
      step: 3,
      x: 879,
      y: 450,
      w: 90,
    },
    {
      id: "notifier",
      fill: "pastel",
      label: "Notifier",
      sub: "sockets + APNs / FCM",
      icon: "bell",
      tone: "orange",
      step: 3,
      x: 879,
      y: 640,
      w: 190,
      h: 64,
    },

    {
      id: "courier",
      fill: "pastel",
      label: "Courier app",
      sub: "GPS every 4 s",
      icon: "phone",
      step: 4,
      x: 105,
      y: 640,
      w: 150,
      h: 64,
    },
    {
      id: "dispatch",
      fill: "pastel",
      label: "Dispatch service",
      sub: "match order to courier",
      icon: "workers",
      tone: "green",
      step: 4,
      x: 575,
      y: 495,
      w: 210,
      h: 60,
    },
    {
      id: "location",
      fill: "pastel",
      label: "Location service",
      sub: "latest courier positions",
      icon: "presence",
      tone: "green",
      step: 4,
      x: 575,
      y: 590,
      w: 210,
      h: 60,
    },
    {
      id: "geo",
      label: "Geo index",
      sub: "Redis GEO, live couriers",
      icon: "cache",
      tone: "red",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 580,
    },

    {
      id: "eta",
      fill: "pastel",
      label: "ETA service",
      sub: "road graph + traffic",
      icon: "history",
      tone: "green",
      step: 5,
      x: 575,
      y: 685,
      w: 210,
      h: 60,
    },
  ],
  edges: [
    // Step 1: discovery is read-only and cacheable.
    { from: "customer", to: "gateway", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "gateway", to: "search", tone: "teal", flow: true, packet: true, delay: 0.6 },
    {
      from: "search",
      to: "searchIdx",
      label: "geo query",
      tone: "teal",
      flow: true,
      packet: true,
      delay: 1.2,
      labelAt: 0.6,
    },
    { from: "gateway", to: "menu", tone: "teal", dashed: true },
    { from: "menu", to: "restaurantsDb", tone: "blue", dashed: true },

    // Step 2: the order is the one strongly consistent write.
    {
      from: "gateway",
      to: "order",
      label: "POST /orders",
      tone: "green",
      flow: true,
      packet: true,
      delay: 0.6,
      // Routed down the gap between Edge and the services (x 393) so it no longer crosses the zone title.
      via: [
        [393, 175],
        [393, 400],
      ],
      labelAt: 0.45,
    },
    {
      from: "order",
      to: "payment",
      tone: "teal",
      flow: true,
      packet: true,
      delay: 1.2,
      // Right of the "Ordering & dispatch" title (which ends near x 603), so the arrow does not cross it.
      via: [
        [650, 370],
        [650, 298],
      ],
    },
    {
      from: "order",
      to: "ordersDb",
      label: "PLACED",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1.2,
      labelAt: 0.55,
    },

    // Step 3: order events go to the bus; the notifier pushes them to connected apps.
    { from: "order", to: "bus", tone: "orange", flow: true, packet: true, delay: 1.8 },
    { from: "bus", to: "notifier", tone: "orange", flow: true, packet: true, delay: 2.4 },
    {
      from: "notifier",
      to: "rtgw",
      label: "push",
      tone: "orange",
      flow: true,
      packet: true,
      delay: 3.0,
      via: [
        [879, 760],
        [297, 760],
      ],
      labelAt: 0.5,
    },
    {
      from: "rtgw",
      to: "restaurant",
      label: "new order",
      tone: "blue",
      flow: true,
      packet: true,
      delay: 3.6,
      labelAt: 0.5,
    },
    { from: "rtgw", to: "customer", label: "status", tone: "blue", dashed: true, flow: true, labelAt: 0.4 },
    { from: "restaurant", to: "gateway", label: "accept / ready", tone: "blue", dashed: true, labelAt: 0.35 },

    // Step 4: dispatch asks the location service for nearby free couriers.
    { from: "courier", to: "rtgw", tone: "blue", flow: true, packet: true, delay: 0, bidirectional: true },
    { from: "rtgw", to: "location", tone: "green", flow: true, packet: true, delay: 0.6 },
    { from: "location", to: "geo", label: "GEOADD", tone: "red", flow: true, packet: true, delay: 1.2, labelAt: 0.78 },
    { from: "bus", to: "dispatch", tone: "orange", flow: true, packet: true, delay: 2.4, bidirectional: true },
    { from: "dispatch", to: "location", tone: "green", dashed: true, bidirectional: true },

    // Step 5: positions and ETAs flow back to the customer through the bus.
    { from: "location", to: "bus", tone: "orange", flow: true, packet: true, delay: 1.2, step: 5 },
    { from: "location", to: "eta", tone: "green", dashed: true },
  ],
};

export default spec;
