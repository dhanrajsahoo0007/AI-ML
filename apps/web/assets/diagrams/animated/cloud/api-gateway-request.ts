import type { DiagramSpec } from "@/components/diagrams/types";

// One gateway in front of several services, told as the story of Brightpost's wholesale API
// (cloud/networking/api-gateways). Step 1: the gift shops' tills call one gateway, which checks only the shop's key
// and passes every call on; each of the three services checks the sign-in token in its own code (checks A, B and
// C). Step 2 (the failure step): a till stolen from shop 64 keeps an expired token; the key still works, and the
// invoices service, whose check skips the expiry time, accepts it. Step 3: a sign-in service issues the tokens, and
// the gateway checks every token once with its signing keys; the stolen till is refused at the door. Step 4: a new,
// breaking version of the order API runs beside the old one, and the gateway routes /v1 and /v2. Step 5: partner apps
// sign up on a developer portal and call the gateway on a plan of their own. Step 6: the gateway logs every call per
// API and per key.
//
// Nodes never move between steps. Edges that a later step replaces end with `until`.
//
// Layout: three rows over a services row.
//   Row 1 (y 80): stolen till 115 | gift shop tills 333 | partner apps 690.
//   Row 2 (y 250): sign-in service 115 and gateway 333 share the "Front door and sign-in" zone; portal 690.
//   Row 3 (y 430): Orders v1 80 | Stock 236 | Invoices 392 | Orders v2 548 | logs 716.
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 use only the stolen till, the
// tills, the gateway and the first three services, which all sit left of x 470.
//
// Zone tabs sit on a zone's top-left corner. The front-door zone starts at x 12 so the stolen till's diagonal enters
// at about x 262, right of its tab; the services zone's tab ("Services") ends near x 80, and the first fan-out edge
// enters at about x 157.
// Text room: about 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are sized
// for the longest provider name the Services toggle shows ("Identity Platform", "API Management", "Cloud Logging").
const spec: DiagramSpec = {
  title: "One gateway that checks every token before three services",
  width: 800,
  height: 510,
  steps: [
    { title: "Three services, three token checks" },
    { title: "An expired token gets through one of them" },
    { title: "The gateway checks every token once" },
    { title: "Two versions side by side" },
    { title: "Partners sign up for a plan" },
    { title: "Every call logged per API and per key" },
  ],
  zones: [
    { id: "callers", title: "Callers", tone: "neutral", x: 5, y: 25, w: 790, h: 110 },
    { id: "front", title: "Front door and sign-in", tone: "blue", x: 12, y: 195, w: 426, h: 110 },
    { id: "partners", title: "For partners", tone: "neutral", x: 588, y: 195, w: 207, h: 110 },
    { id: "services", title: "Services", tone: "teal", x: 2, y: 375, w: 627, h: 115 },
    { id: "ops", title: "Operations", tone: "orange", x: 635, y: 375, w: 162, h: 115 },
  ],
  nodes: [
    // Step 1
    {
      id: "tills",
      label: "Gift shop tills",
      sub: "300 shops",
      icon: "bag",
      tone: "neutral",
      x: 333,
      y: 80,
      w: 176,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "keys, tokens, routes",
      icon: "gateway",
      tone: "blue",
      accent: true,
      x: 333,
      y: 250,
      w: 176,
      cloud: {
        aws: { id: "aws-api-gateway", label: "API Gateway" },
        gcp: { id: "gcp-apigee", label: "Apigee" },
        azure: { id: "azure-apim", label: "API Management" },
      },
    },
    { id: "orders", label: "Orders API v1", sub: "place, track", icon: "api", tone: "teal", x: 80, y: 430, w: 146 },
    { id: "stock", label: "Stock API", sub: "levels, packs", icon: "api", tone: "teal", x: 236, y: 430, w: 146 },
    { id: "invoices", label: "Invoices API", sub: "per-shop PDFs", icon: "api", tone: "teal", x: 392, y: 430, w: 146 },

    // Step 2: the failure
    {
      id: "stolen",
      label: "Stolen till",
      sub: "shop 64, old token",
      icon: "alert-triangle",
      tone: "red",
      step: 2,
      x: 115,
      y: 80,
      w: 176,
    },

    // Step 3
    {
      id: "signin",
      label: "Sign-in service",
      sub: "1-hour tokens",
      icon: "key",
      tone: "red",
      step: 3,
      x: 115,
      y: 250,
      w: 176,
      cloud: {
        aws: { id: "aws-cognito", label: "Cognito" },
        gcp: { id: "gcp-identity-platform", label: "Identity Platform" },
        azure: { id: "azure-entra-id", label: "Entra ID" },
      },
    },

    // Step 4
    {
      id: "orders2",
      label: "Orders API v2",
      sub: "prices in pence",
      icon: "api",
      tone: "teal",
      step: 4,
      x: 548,
      y: 430,
      w: 146,
    },

    // Step 5
    {
      id: "partner",
      label: "Partner apps",
      sub: "2 marketplaces",
      icon: "browser",
      tone: "neutral",
      step: 5,
      x: 690,
      y: 80,
      w: 170,
    },
    {
      id: "portal",
      label: "Developer portal",
      sub: "docs, keys, plans",
      icon: "registry",
      tone: "blue",
      step: 5,
      x: 690,
      y: 250,
      w: 180,
      cloud: {
        aws: { label: "Developer portal" },
        gcp: { id: "gcp-apigee", label: "Apigee portal" },
        azure: { id: "azure-apim", label: "APIM portal" },
      },
    },

    // Step 6
    {
      id: "logs",
      label: "Logs, metrics",
      sub: "per API, per key",
      icon: "chart",
      tone: "orange",
      step: 6,
      x: 716,
      y: 430,
      w: 150,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch" },
        gcp: { id: "gcp-cloud-logging", label: "Cloud Logging" },
        azure: { id: "azure-monitor", label: "Azure Monitor" },
      },
    },
  ],
  edges: [
    // Step 1: one door that checks the key; three services that each check the token their own way.
    { from: "tills", to: "gw", label: "key + token", packet: true, labelAt: 0.45 },
    { from: "gw", to: "orders", label: "check A", packet: true, delay: 0.8, until: 2 },
    { from: "gw", to: "stock", label: "check B", packet: true, delay: 1.0, labelAt: 0.35, until: 2 },
    { from: "gw", to: "invoices", label: "check C", packet: true, delay: 1.2, labelAt: 0.65, until: 1 },

    // Step 2: the stolen till's key still works; check C never looks at the expiry time.
    {
      from: "stolen",
      to: "gw",
      label: "expired token",
      tone: "red",
      packet: true,
      duration: 1.4,
      labelAt: 0.4,
      step: 2,
      until: 2,
    },
    {
      from: "gw",
      to: "invoices",
      label: "skips expiry",
      tone: "red",
      packet: true,
      delay: 1.0,
      duration: 1.4,
      labelAt: 0.65,
      step: 2,
      until: 2,
    },

    // Step 3: the gateway checks every token against the sign-in service's keys; services get a checked shop id.
    { from: "signin", to: "gw", label: "keys", dashed: true, step: 3 },
    {
      from: "stolen",
      to: "gw",
      label: "refused: expired",
      tone: "red",
      dashed: true,
      labelAt: 0.4,
      step: 3,
    },
    { from: "gw", to: "orders", label: "/orders", packet: true, delay: 0.8, step: 3, until: 3 },
    { from: "gw", to: "stock", label: "/stock", packet: true, delay: 1.0, labelAt: 0.35, step: 3 },
    { from: "gw", to: "invoices", label: "/invoices", packet: true, delay: 1.2, labelAt: 0.65, step: 3 },

    // Step 4: old and new versions side by side; /v1 callers are told the end date.
    { from: "gw", to: "orders", label: "/v1 + end date", packet: true, delay: 0.8, step: 4 },
    { from: "gw", to: "orders2", label: "/v2", packet: true, delay: 1.4, step: 4 },

    // Step 5: partners get a key from the portal and call on their own plan.
    { from: "partner", to: "portal", label: "sign up", dashed: true, step: 5 },
    { from: "partner", to: "gw", label: "partner plan", packet: true, labelAt: 0.5, step: 5 },

    // Step 6: one log line per call, by API and by key.
    {
      from: "gw",
      to: "logs",
      label: "every call",
      dashed: true,
      flow: true,
      via: [[600, 340]],
      labelAt: 0.55,
      step: 6,
    },
  ],
};

export default spec;
