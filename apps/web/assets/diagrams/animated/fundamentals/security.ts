import type { DiagramSpec } from "@/components/diagrams/types";

// Checkup, a clinic booking app, and the three layers where attacks land. The top row is the normal request path
// (patient -> edge gateway -> app servers -> patient DB). The red row underneath shows one attack per layer, each
// pointing at the box that has to stop it.
// Step 1: the edge. A bot flood lands on the edge gateway, which filters and rate-limits it.
// Step 2: the app. A forged request with a real token but someone else's id gets past the edge; the app servers
//         check ownership on every call. The auth service hands the gateway its token-signing keys.
// Step 3: the data. A leaked database password is useless: the vault hands out one-hour logins and rotates them,
//         and the database accepts connections only from the app servers.
//
// Layout (centres; card boxes are centre +- w/2, +- h/2):
// patient 95,230 w130 (30-160 x 201-259)
// edge 285,230 w150 h64 (210-360 x 198-262) | flood 285,420 w150 (210-360 x 391-449)
// auth 510,110 w150 (435-585 x 81-139) | app 510,230 w150 h64 (435-585 x 198-262) | forged 510,420 w150
// vault 770,110 w160 (690-850 x 81-139) | db 770,230 w160 h64 (690-850 x 198-262) | leak 770,420 w160
// Horizontal gaps: 50 (patient-edge), 75 (edge-app), 105 (app-db). Vertical gaps: 59 (top row to middle), 129
// (middle row to attack row). Diagonals auth->edge and vault->app pass above the middle row (checked at box corners).
// Zones: clients 20-170, edge 190-380, app 400-620, data 640-900 (y 40-330); attacks 190-900 (y 350-480).
const spec: DiagramSpec = {
  title: "Where attacks land: edge, app and data",
  width: 920,
  height: 500,
  steps: [
    { title: "Edge: stop floods before they cost anything" },
    { title: "App: check who is asking and what they may see" },
    { title: "Data: least privilege and short-lived secrets" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 150, h: 290 },
    { id: "edgezone", title: "Edge layer", tone: "blue", x: 190, y: 40, w: 190, h: 290 },
    { id: "appzone", title: "App layer", tone: "teal", x: 400, y: 40, w: 220, h: 290 },
    { id: "datazone", title: "Data layer", tone: "violet", x: 640, y: 40, w: 260, h: 290 },
    { id: "attacks", title: "Where attacks land", tone: "red", x: 190, y: 350, w: 710, h: 130 },
  ],
  nodes: [
    { id: "patient", label: "Patient app", sub: "phone, web", icon: "phone", tone: "neutral", x: 95, y: 230, w: 130 },
    {
      id: "edge",
      label: "Edge gateway",
      sub: "TLS, WAF, rate limits",
      icon: "gateway",
      tone: "blue",
      x: 285,
      y: 230,
      w: 150,
      h: 64,
    },
    {
      id: "app",
      label: "App servers",
      sub: "check owner per call",
      icon: "server",
      tone: "green",
      accent: true,
      x: 510,
      y: 230,
      w: 150,
      h: 64,
    },
    {
      id: "db",
      label: "Patient DB",
      sub: "encrypted at rest",
      icon: "database",
      tone: "violet",
      x: 770,
      y: 230,
      w: 160,
      h: 64,
    },
    {
      id: "flood",
      label: "Bot flood",
      sub: "50k requests/s",
      icon: "alert-triangle",
      tone: "red",
      x: 285,
      y: 420,
      w: 150,
    },

    {
      id: "auth",
      label: "Auth service",
      sub: "logins, tokens",
      icon: "key",
      tone: "teal",
      x: 510,
      y: 110,
      w: 150,
      step: 2,
    },
    {
      id: "forged",
      label: "Forged request",
      sub: "someone else's id",
      icon: "shield-alert",
      tone: "red",
      x: 510,
      y: 420,
      w: 150,
      step: 2,
    },

    {
      id: "vault",
      label: "Secrets vault",
      sub: "short-lived logins",
      icon: "lock",
      tone: "violet",
      x: 770,
      y: 110,
      w: 160,
      step: 3,
    },
    {
      id: "leak",
      label: "Leaked password",
      sub: "found in a repo",
      icon: "key",
      tone: "red",
      x: 770,
      y: 420,
      w: 160,
      step: 3,
    },
  ],
  edges: [
    // Step 1: the normal path, and the flood that the edge absorbs.
    { from: "patient", to: "edge", label: "HTTPS", tone: "blue", flow: true, packet: true },
    { from: "edge", to: "app", label: "allowed", tone: "green", flow: true, packet: true, delay: 0.8 },
    { from: "app", to: "db", label: "SQL", tone: "violet", flow: true, packet: true, delay: 1.6 },
    { from: "flood", to: "edge", label: "filtered, limited", tone: "red", dashed: true, flow: true },

    // Step 2: the gateway verifies tokens with keys from the auth service; the forged request reaches the app,
    // which refuses it because the record belongs to someone else.
    { from: "auth", to: "edge", label: "token keys", tone: "teal", dashed: true, step: 2 },
    { from: "forged", to: "app", label: "refused: not yours", tone: "red", dashed: true, flow: true, step: 2 },

    // Step 3: the vault issues and rotates database logins; the leaked password has expired and has no route in.
    { from: "vault", to: "app", label: "1-hour DB login", tone: "violet", dashed: true, step: 3 },
    { from: "vault", to: "db", label: "rotates", tone: "violet", dashed: true, step: 3 },
    { from: "leak", to: "db", label: "expired, no route", tone: "red", dashed: true, flow: true, step: 3 },
  ],
};

export default spec;
