import type { DiagramSpec } from "@/components/diagrams/types";

// Lockbox, a parcel-locker app, tells a customer "your parcel is in locker 14" while the app is closed.
// Step 1: the phone gets a device token from APNs or FCM over the operating system's own connection, and the app
//         sends that token to Lockbox's token API, which saves it under the user's id.
// Step 2: a courier closes locker 14; the parcel service emits parcel.delivered; the notify service looks up the
//         user's tokens, puts one job per token on the push queue; push workers POST each job to APNs or FCM, which
//         delivers it to the phone over the connection it already holds. The step-1 token edge ends here (until 1)
//         because the delivery edge reuses the same line.
// Step 3: feedback. APNs answers 410 Unregistered (FCM: UNREGISTERED) for a dead token; the worker deletes it from
//         the token store. The 410 edge is routed under the boxes so it does not sit on the send edge.
//
// Layout (centres; card boxes are centre +- w/2, +- h/2; glyph boxes +-38 wide, 27 up, 62 down):
// top row y110:    parcels x100 w150 (25-175 x 81-139), tokens glyph x290 y100 (252-328 x 73-162),
//                  tokenapi x480 w140 (410-550 x 81-139)
// bottom row y290: notify x100 w150 (25-175 x 261-319), queue x290 w140 (220-360), workers x480 w150 (405-555),
//                  apns x685 w150 (610-760), phone x865 w130 (800-930)
// Gaps: queue-workers 45, workers-apns 55, apns-phone 40; rows 122 apart.
// phone -> tokenapi climbs to y110 at x865 and runs left above the provider zone (which starts at y220).
// apns -> workers (410) runs along y345, below every bottom-row box (bottoms at 319).
// Zones: services 15-185, tokens/pipeline 205-575, providers 595-775, device 790-945.
const spec: DiagramSpec = {
  title: "Push notifications: register, send, clean up",
  width: 960,
  height: 400,
  steps: [
    { title: "The phone gets a device token and registers it" },
    { title: "An event becomes a push, sent through APNs or FCM" },
    { title: "Dead tokens come back and are deleted" },
  ],
  zones: [
    { id: "services", title: "Your services", tone: "teal", x: 15, y: 40, w: 170, h: 330 },
    { id: "registry", title: "Device tokens", tone: "violet", x: 205, y: 40, w: 370, h: 150 },
    { id: "pipeline", title: "Send pipeline", tone: "orange", x: 205, y: 220, w: 370, h: 150 },
    { id: "providers", title: "Apple and Google", tone: "blue", x: 595, y: 220, w: 180, h: 150 },
    { id: "device", title: "Device", tone: "neutral", x: 790, y: 40, w: 155, h: 330 },
  ],
  nodes: [
    // Step 1: registration.
    { id: "phone", label: "Phone", sub: "app may be closed", icon: "phone", x: 865, y: 290, w: 130 },
    { id: "apns", label: "APNs / FCM", sub: "one conn per phone", icon: "bell", tone: "blue", x: 685, y: 290, w: 150 },
    { id: "tokenapi", label: "Token API", sub: "POST /devices", icon: "api", tone: "teal", x: 480, y: 110, w: 140 },
    {
      id: "tokens",
      label: "Token store",
      sub: "user → tokens",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 290,
      y: 100,
    },

    // Step 2: sending.
    {
      id: "parcels",
      label: "Parcel service",
      sub: "locker 14 closed",
      icon: "bag",
      tone: "teal",
      step: 2,
      x: 100,
      y: 110,
      w: 150,
    },
    {
      id: "notify",
      label: "Notify service",
      sub: "who, what, collapse",
      icon: "server",
      tone: "green",
      accent: true,
      step: 2,
      x: 100,
      y: 290,
      w: 150,
    },
    {
      id: "queue",
      label: "Push queue",
      sub: "1 job per token",
      icon: "queue",
      tone: "orange",
      step: 2,
      x: 290,
      y: 290,
      w: 140,
    },
    {
      id: "workers",
      label: "Push workers",
      sub: "HTTP/2 to providers",
      icon: "workers",
      tone: "orange",
      step: 2,
      x: 480,
      y: 290,
      w: 150,
    },
  ],
  edges: [
    // Step 1: the OS hands the app a token; the app registers it.
    { from: "apns", to: "phone", label: "token", tone: "blue", dashed: true, until: 1 },
    {
      from: "phone",
      to: "tokenapi",
      label: "register token",
      tone: "teal",
      flow: true,
      packet: true,
      delay: 0.6,
      via: [[865, 110]],
      labelAt: 0.6,
    },
    { from: "tokenapi", to: "tokens", label: "save", tone: "violet", packet: true, delay: 1.6 },

    // Step 2: one event, one lookup, one job per token, one HTTP/2 request per job.
    { from: "parcels", to: "notify", label: "parcel.delivered", tone: "green", flow: true, packet: true, delay: 0 },
    { from: "notify", to: "tokens", label: "lookup", tone: "violet", dashed: true },
    { from: "notify", to: "queue", tone: "orange", flow: true, packet: true, delay: 0.9 },
    { from: "queue", to: "workers", tone: "orange", flow: true, packet: true, delay: 1.5 },
    { from: "workers", to: "apns", label: "POST", tone: "blue", flow: true, packet: true, delay: 2.1 },
    { from: "apns", to: "phone", label: "deliver", tone: "blue", flow: true, packet: true, delay: 2.7, step: 2 },

    // Step 3: the provider reports a dead token; the worker deletes it.
    {
      from: "apns",
      to: "workers",
      label: "410 / UNREGISTERED",
      tone: "red",
      dashed: true,
      flow: true,
      step: 3,
      via: [
        [685, 345],
        [480, 345],
      ],
    },
    { from: "workers", to: "tokens", label: "delete token", tone: "red", dashed: true, flow: true, step: 3 },
  ],
};

export default spec;
