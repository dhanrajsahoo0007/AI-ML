import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The layers a call from a gift shop's till passes on its way to a service (cloud/networking/api-gateways), and the
// one question each layer answers. Left: the layers as a stack of boxes joined by arrows, top to bottom in the order
// Brightpost uses (edge cache, web application firewall, load balancer, API gateway, service). Right: what each layer
// owns, one box per layer on the same row. The gateway's row carries `highlight`: it is the only layer that knows
// which shop is calling. A note under the stack says the balancer and the gateway can swap places.
//
// Geometry: header texts at y 6-26. Rows start at y 36 and are 68 apart (boxes 52 tall), so the fifth row ends at
// 360. Layer boxes: x 20-230. Owns boxes: x 270-750. The note sits at y 374-394. Canvas 770 x 404.
// Label room: 6.2 px per character within width - 8, so an owns label fits about 76 characters.

const ROWS = [
  {
    id: "edge",
    label: "Edge cache (CDN)",
    sub: "near the caller",
    tone: "blue",
    owns: "Public copies, close to whoever asks",
    ownsSub: "the trade catalogue for 10 minutes; never per-shop prices",
  },
  {
    id: "waf",
    label: "Web app firewall",
    sub: "rules at the edge",
    tone: "red",
    owns: "Traffic that looks like an attack",
    ownsSub: "known attack patterns, address and bot rules",
  },
  {
    id: "lb",
    label: "Load balancer",
    sub: "spreads the calls",
    tone: "blue",
    owns: "Healthy servers and an even spread",
    ownsSub: "health checks, paths, TLS; it cannot tell one shop from another",
  },
  {
    id: "gw",
    label: "API gateway",
    sub: "reads every call",
    tone: "blue",
    owns: "Who is calling, and what they may call",
    ownsSub: "tokens, keys, plans, versions, logs per shop",
  },
  {
    id: "svc",
    label: "Service",
    sub: "your code",
    tone: "teal",
    owns: "What the call means",
    ownsSub: "business rules: may shop 64 open invoice 9031?",
  },
] as const;

const ROW_Y = (i: number) => 36 + i * 68;

const shapes: LayoutShape[] = [
  { id: "head-layer", type: "text", x: 20, y: 6, w: 210, h: 20, label: "Layer, in call order", tone: "neutral" },
  { id: "head-owns", type: "text", x: 270, y: 6, w: 480, h: 20, label: "What it owns", tone: "neutral" },
  ...ROWS.flatMap((r, i): LayoutShape[] => [
    {
      id: `layer-${r.id}`,
      type: "box",
      x: 20,
      y: ROW_Y(i),
      w: 210,
      h: 52,
      label: r.label,
      sub: r.sub,
      tone: r.tone,
      ...(r.id === "gw" ? { highlight: true as const } : {}),
    },
    {
      id: `owns-${r.id}`,
      type: "box",
      x: 270,
      y: ROW_Y(i),
      w: 480,
      h: 52,
      label: r.owns,
      sub: r.ownsSub,
      tone: r.id === "gw" ? "blue" : "neutral",
      ...(r.id === "gw" ? { highlight: true as const } : {}),
    },
  ]),
  ...ROWS.slice(0, -1).map((r, i): LayoutShape => ({
    id: `down-${r.id}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `layer-${r.id}`,
    to: `layer-${ROWS[i + 1].id}`,
    tone: "neutral",
  })),
  {
    id: "note",
    type: "text",
    x: 20,
    y: 374,
    w: 730,
    h: 20,
    label: "Some designs put the balancer behind the gateway. What each layer owns stays the same.",
    tone: "neutral",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From edge to service: what each layer owns",
  width: 770,
  height: 404,
  shapes,
};

export default spec;
