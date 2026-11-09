import type { DiagramSpec } from "@/components/diagrams/types";

// How the Larder API gateway checks every call. Three kinds of caller bring three kinds of credential: the web app a
// session cookie, the phone app a JWT access token, the grocer's server an API key. The gateway answers "who is
// this, and may they do this?" before any service sees the request, then forwards the user id and scopes.
// Step 1: every call passes the gateway. Step 2: cookies need a session lookup. Step 3: JWTs are checked locally
// with the auth server's public keys. Step 4: API keys are looked up by hash. Step 5: a small denylist revokes
// tokens before they expire.
//
// Layout (centres): web 105,110 | mobile 105,245 | partner 105,380 | gateway 320,150 (w 150) | recipes 770,105 |
// orders 770,195 | authsrv 320,365 (w 150) | sessions 485,365 | apikeys 640,365 | denylist 795,365.
// Card nodes are 130 wide unless noted; the tightest gaps are 25 px (bottom row).
const spec: DiagramSpec = {
  title: "Token checks at the API gateway",
  width: 900,
  height: 460,
  steps: [
    { title: "Every call passes the gateway" },
    { title: "Session cookies: look up the session" },
    { title: "JWTs: check the signature locally" },
    { title: "API keys: look up the key's hash" },
    { title: "Revoke early with a denylist" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 170, h: 390 },
    { id: "edgezone", title: "Edge", tone: "blue", x: 210, y: 50, w: 200, h: 200 },
    { id: "services", title: "Services", tone: "teal", x: 660, y: 50, w: 220, h: 200 },
    { id: "identity", title: "Identity", tone: "violet", x: 210, y: 280, w: 670, h: 160 },
  ],
  nodes: [
    { id: "web", label: "Web app", sub: "session cookie", icon: "browser", tone: "neutral", x: 105, y: 110, w: 130 },
    {
      id: "mobile",
      label: "Phone app",
      sub: "JWT access token",
      icon: "phone",
      tone: "neutral",
      x: 105,
      y: 245,
      w: 130,
    },
    { id: "partner", label: "Grocer server", sub: "API key", icon: "server", tone: "neutral", x: 105, y: 380, w: 130 },
    {
      id: "gateway",
      label: "API gateway",
      sub: "checks every call",
      icon: "gateway",
      tone: "green",
      accent: true,
      x: 320,
      y: 150,
      w: 150,
      h: 64,
    },
    { id: "recipes", label: "Recipes", sub: "service", icon: "server", tone: "teal", x: 770, y: 105, w: 130 },
    { id: "orders", label: "Orders", sub: "service", icon: "bag", tone: "teal", x: 770, y: 195, w: 130 },
    {
      id: "sessions",
      label: "Sessions",
      sub: "sid to user",
      icon: "cache",
      tone: "orange",
      x: 485,
      y: 365,
      w: 130,
      step: 2,
    },
    {
      id: "authsrv",
      label: "Auth server",
      sub: "signs JWTs",
      icon: "key",
      tone: "violet",
      x: 320,
      y: 365,
      w: 150,
      step: 3,
    },
    {
      id: "apikeys",
      label: "API keys",
      sub: "SHA-256 hashes",
      icon: "lock",
      tone: "violet",
      x: 640,
      y: 365,
      w: 130,
      step: 4,
    },
    {
      id: "denylist",
      label: "Denylist",
      sub: "revoked token ids",
      icon: "shield",
      tone: "red",
      x: 795,
      y: 365,
      w: 130,
      step: 5,
    },
  ],
  edges: [
    // Step 1: three callers, one front door, then the request moves on with an identity attached.
    { from: "web", to: "gateway", label: "cookie", flow: true, packet: true },
    { from: "mobile", to: "gateway", label: "JWT", flow: true, packet: true, delay: 0.3 },
    { from: "partner", to: "gateway", label: "API key", flow: true, packet: true, delay: 0.6 },
    { from: "gateway", to: "recipes", label: "user 42, scopes", flow: true, packet: true, delay: 1.2 },
    { from: "gateway", to: "orders", flow: true, packet: true, delay: 1.4 },

    // Step 2: a session id means nothing on its own, so the gateway looks it up.
    { from: "gateway", to: "sessions", label: "sid lookup", dashed: true, step: 2 },

    // Step 3: a JWT carries its own claims; the gateway only needs the signer's public keys, fetched hourly.
    { from: "authsrv", to: "gateway", label: "public keys", dashed: true, step: 3 },

    // Step 4: an API key is hashed and looked up, like a password with no user typing it.
    { from: "gateway", to: "apikeys", label: "hash lookup", dashed: true, labelAt: 0.55, step: 4 },

    // Step 5: the auth server pushes revoked token ids; the gateway checks each JWT's id against them.
    { from: "gateway", to: "denylist", label: "revoked?", dashed: true, labelAt: 0.72, step: 5 },
    {
      from: "authsrv",
      to: "denylist",
      label: "revoked ids",
      dashed: true,
      flow: true,
      via: [
        [320, 425],
        [795, 425],
      ],
      step: 5,
    },
  ],
};

export default spec;
