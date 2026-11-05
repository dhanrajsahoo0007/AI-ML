import type { DiagramSpec } from "../../types";

// Messenger architecture, built up one requirement at a time. Each node and edge says which build step
// introduces it; edges with `until` are early shortcuts that a later step replaces (chat server writing
// straight to the store until the message bus arrives in step 5).
//
// Full main path (packets, in order): sender -> load balancer -> chat servers -> message bus -> store +
// fan-out -> recipient's chat server -> recipient, with offline recipients going through the push service.
export const messengerArchitecture: DiagramSpec = {
  title: "Facebook Messenger high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One-to-one chat", covers: "F1" },
    { title: "Many chat servers", covers: "NFR: scale" },
    { title: "Offline users and push", covers: "F7" },
    { title: "Group chat and fan-out", covers: "F2" },
    { title: "Durable, ordered pipeline", covers: "NFR: durability, ordering" },
    { title: "Presence and receipts", covers: "F3, F4" },
    { title: "Photos and video", covers: "F5" },
    { title: "History and sync", covers: "F6" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 60, w: 170, h: 620 },
    { id: "edge", title: "Edge", tone: "blue", x: 212, y: 60, w: 170, h: 620 },
    { id: "realtime", title: "Real-time messaging", tone: "green", x: 405, y: 60, w: 340, h: 230 },
    { id: "services", title: "Application services", tone: "teal", x: 405, y: 330, w: 340, h: 350 },
    { id: "async", title: "Async pipeline", tone: "orange", x: 768, y: 60, w: 222, h: 440 },
    { id: "storage", title: "Storage", tone: "violet", x: 1012, y: 60, w: 172, h: 620 },
  ],
  nodes: [
    { id: "sender", label: "Sender", sub: "mobile / web", icon: "phone", x: 105, y: 210, w: 140, h: 64 },
    { id: "recipient", label: "Recipient", sub: "mobile / web", icon: "phone", x: 105, y: 540, w: 140, h: 64 },
    { id: "lb", label: "Load balancer", sub: "sticky WebSockets", icon: "load-balancer", tone: "blue", x: 297, y: 210, w: 160, h: 64 },
    { id: "chat", label: "Chat servers", sub: "hold WebSocket conns", icon: "chat", tone: "green", accent: true, x: 575, y: 120, w: 210, h: 64 },
    { id: "store", label: "Message store", sub: "by conversation", icon: "database", tone: "violet", variant: "glyph", x: 1098, y: 120 },

    { id: "session", label: "Session registry", sub: "user → server", icon: "registry", tone: "green", step: 2, x: 495, y: 215, w: 150, h: 64 },

    { id: "push", label: "Push service", sub: "APNs / FCM", icon: "bell", tone: "orange", step: 3, x: 879, y: 450, w: 190, h: 64 },

    { id: "gateway", label: "API gateway", sub: "auth, rate limit", icon: "gateway", tone: "blue", step: 4, x: 297, y: 515, w: 160, h: 64 },
    { id: "groups", label: "Group service", sub: "members, roles", icon: "users", tone: "teal", step: 4, x: 575, y: 420, w: 210, h: 64 },
    { id: "fanout", label: "Fan-out workers", sub: "one copy per member", icon: "workers", tone: "orange", step: 4, x: 879, y: 290, w: 190, h: 64 },
    { id: "cache", label: "Cache", sub: "members, recent", icon: "cache", tone: "red", variant: "glyph", step: 4, x: 1098, y: 290 },
    { id: "metadb", label: "Metadata DB", sub: "users, groups", icon: "database", tone: "blue", variant: "glyph", step: 4, x: 1098, y: 505 },

    { id: "bus", label: "Message bus", sub: "Kafka, keyed by convo", icon: "queue", tone: "orange", variant: "glyph", step: 5, x: 879, y: 120, w: 90 },

    { id: "presence", label: "Presence", sub: "heartbeats + TTL", icon: "presence", tone: "green", step: 6, x: 660, y: 215, w: 150, h: 64 },

    { id: "media", label: "Media service", sub: "upload URLs, thumbnails", icon: "media", tone: "teal", step: 7, x: 575, y: 515, w: 210, h: 64 },
    { id: "blob", label: "Blob store + CDN", sub: "photos, video", icon: "blob", tone: "violet", variant: "glyph", step: 7, x: 1098, y: 610 },

    { id: "history", label: "History service", sub: "paged by message id", icon: "history", tone: "teal", step: 8, x: 575, y: 610, w: 210, h: 64 },
  ],
  edges: [
    // Step 1: one chat server path, persist directly.
    { from: "sender", to: "lb", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "lb", to: "chat", tone: "blue", flow: true, packet: true, delay: 0.6, via: [[390, 200], [390, 110]] },
    { from: "chat", to: "store", label: "persist", tone: "violet", flow: true, packet: true, delay: 1.2, until: 4 },
    { from: "chat", to: "lb", tone: "green", flow: true, packet: true, delay: 3.0, via: [[399, 132], [399, 220]] },
    { from: "lb", to: "recipient", label: "deliver", tone: "green", flow: true, packet: true, delay: 3.6, labelAt: 0.3 },

    // Step 2: which server holds the recipient's connection?
    { from: "chat", to: "session", tone: "green", dashed: true, bidirectional: true },

    // Step 3: offline recipients (replaced by fan-out in step 4).
    { from: "chat", to: "push", label: "offline", tone: "orange", flow: true, packet: true, delay: 1.2, via: [[755, 150], [755, 450]], labelAt: 0.6, until: 3 },
    { from: "push", to: "recipient", label: "notify", tone: "orange", dashed: true, flow: true, via: [[879, 705], [105, 705]], labelAt: 0.45 },

    // Step 4: groups. Membership over REST; fan-out workers make one delivery per member.
    { from: "sender", to: "gateway", label: "HTTPS", tone: "blue", dashed: true, labelAt: 0.72 },
    { from: "gateway", to: "groups", tone: "teal", dashed: true },
    { from: "groups", to: "metadb", label: "members", tone: "blue", dashed: true, via: [[760, 420], [760, 505]], labelAt: 0.82 },
    { from: "chat", to: "fanout", tone: "orange", flow: true, packet: true, delay: 1.2, via: [[730, 140], [730, 290]], until: 4 },
    { from: "fanout", to: "cache", label: "members", tone: "red", dashed: true, labelAt: 0.55 },
    { from: "fanout", to: "chat", label: "online", tone: "green", flow: true, packet: true, delay: 2.4, via: [[755, 290], [755, 150]], labelAt: 0.63 },
    { from: "fanout", to: "push", label: "offline", tone: "orange", flow: true, packet: true, delay: 2.4 },

    // Step 5: message bus between the chat tier and everything downstream.
    { from: "chat", to: "bus", tone: "orange", flow: true, packet: true, delay: 1.2 },
    { from: "bus", to: "store", label: "persist", tone: "violet", flow: true, packet: true, delay: 1.8 },
    { from: "bus", to: "fanout", tone: "orange", flow: true, packet: true, delay: 1.8 },

    // Step 6: presence.
    { from: "chat", to: "presence", tone: "green", dashed: true },

    // Step 7: media goes around the chat path.
    { from: "gateway", to: "media", tone: "teal", dashed: true },
    { from: "media", to: "blob", label: "pre-signed URL", tone: "violet", dashed: true, via: [[740, 515], [740, 610]], labelAt: 0.62 },

    // Step 8: history pages and device sync.
    { from: "gateway", to: "history", tone: "teal", dashed: true },
    { from: "history", to: "store", label: "read pages", tone: "violet", dashed: true, via: [[575, 722], [1192, 722], [1192, 120]], labelAt: 0.35 },
  ],
};
