import type { DiagramSpec } from "@/components/diagrams/types";

// How the savings app talks to the partner bank's SOAP API: the payments service makes a plain JSON call to one
// SOAP adapter, which signs the XML with a key from the cert store, logs the raw envelope, and calls the bank.
// The adapter's client code is generated from the bank's WSDL at build time (dashed, not a runtime call).
//
// Layout check (canvas 880 x 360). Zones: yours x 20-240, integration x 262-602, bank x 624-860, all y 50-340.
// Nodes (centre, box): svc (130,150) 45-215 x 121-179; adapter (432,150) 342-522 x 121-179; keys (350,270)
// 280-420 x 241-299; log (520,270) 450-590 x 241-299 (30 px gap to keys); bank (742,150) 662-822 x 121-179;
// wsdl (742,270) 662-822 x 241-299. The wsdl -> adapter line passes x 590 at about y 211, above the log box (top 241).
const spec: DiagramSpec = {
  title: "Integrating with a bank's SOAP API",
  width: 880,
  height: 360,
  zones: [
    { id: "yours", title: "Your system", tone: "teal", x: 20, y: 50, w: 220, h: 290 },
    { id: "integration", title: "Integration layer", tone: "green", x: 262, y: 50, w: 340, h: 290 },
    { id: "partner", title: "Partner bank", tone: "neutral", x: 624, y: 50, w: 236, h: 290 },
  ],
  nodes: [
    { id: "svc", label: "Payments", sub: "your service, JSON", icon: "server", tone: "teal", x: 130, y: 150, w: 170 },
    {
      id: "adapter",
      label: "SOAP adapter",
      sub: "JSON in, signed XML out",
      icon: "api",
      tone: "green",
      accent: true,
      x: 432,
      y: 150,
      w: 180,
    },
    { id: "keys", label: "Signing key", sub: "in a cert store", icon: "key", tone: "violet", x: 350, y: 270, w: 140 },
    { id: "log", label: "Message log", sub: "raw XML, 90 days", icon: "log", tone: "violet", x: 520, y: 270, w: 140 },
    {
      id: "bank",
      label: "Bank SOAP API",
      sub: "mTLS + WS-Security",
      icon: "server",
      tone: "neutral",
      x: 742,
      y: 150,
      w: 160,
    },
    { id: "wsdl", label: "WSDL", sub: "the contract", icon: "file", tone: "neutral", x: 742, y: 270, w: 160 },
  ],
  edges: [
    { from: "svc", to: "adapter", label: "JSON call", flow: true, packet: true },
    { from: "adapter", to: "bank", label: "SOAP over HTTPS", flow: true, packet: true, delay: 1 },
    { from: "adapter", to: "keys", label: "sign", dashed: true },
    { from: "adapter", to: "log", label: "record", dashed: true },
    { from: "wsdl", to: "adapter", label: "generate client", dashed: true, labelAt: 0.35 },
  ],
};

export default spec;
