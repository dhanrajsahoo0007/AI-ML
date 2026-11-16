import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// End-to-end encrypted messaging, built one requirement at a time (whatsapp case study, the hero).
// Eight steps: 1 two online phones through a layer-4 load balancer to one chat server · 2 many chat servers and a
// routing registry (device -> chat server) · 3 the offline queue: the chat server stores ciphertext per device in a
// mailbox store, deletes it on the device's ack, and the push notifier wakes an offline phone through APNs / FCM ·
// 4 end-to-end encryption: the key service hands out identity keys and one-time prekeys from the key store, so a
// session can start while the recipient is offline · 5 groups with sender keys: the client uploads one ciphertext and
// the group fan-out writes one mailbox entry per member device, reading members from the account DB · 6 several
// devices: linked devices get their own copy, and the sender's send becomes "a copy per device" (the step-1 edge goes
// away) · 7 encrypted media: the media service hands out an upload URL, the encrypted blob goes to the blob store and
// devices download it through the CDN · 8 receipts travel back as small encrypted messages on the same path.
// Working (round numbers chosen to size the system): 1 B daily users × 40 messages = 40 B messages a day, 463K/s on
// average, 1.4M/s at a 3 × peak; 500 M connections at peak ÷ 1 M per chat server = 500 servers, 1,000 with 2 ×
// headroom; the mailbox holds only undelivered ciphertext, about 12 TB (36 TB with 3 replicas).
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients column x 105: Ana's phone 150, Ben's linked
// devices 275, Ben's phone 400, APNs / FCM 640. Edge column x 297: load balancer 270, CDN 450. Core: chat servers
// 575, 120 and the routing registry 575, 225. Services column x 575: key service 410, media service 540. Async column
// x 879: offline queue (accent) 140, group fan-out 290, push notifier 460. Storage column x 1098: mailbox store 140,
// account DB 290, key store 410, blob store 540.
// Edge routes: load balancer to chat servers up the gap at x 390; offline queue to push notifier down the gap at
// x 1000; push notifier to APNs / FCM along the bottom at y 705; the receipt back to Ana up from the load balancer.
// Every long edge was checked against the boxes it passes: the CDN to blob store line runs between the key service
// (bottom 438) and the media service (top 512); horizontal service-to-store lines at y 410 and 540 clear the async
// boxes (fan-out bottom 318, notifier 432 to 488).
// Fact check (2026-11-17, WhatsApp encryption overview and Meta Engineering 2021): one-time prekeys are removed from
// the server once fetched; a sender-key group message is one ciphertext that the server fans out; media is encrypted
// on the device, uploaded to a blob store, and the key travels inside the message.

const spec: DiagramSpec = {
  title: "End-to-end encrypted messaging high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Two phones, one chat server", covers: "F1" },
    { title: "Many chat servers", covers: "N5" },
    { title: "The offline queue", covers: "F2, N3" },
    { title: "End-to-end encryption", covers: "F1, N1" },
    { title: "Groups with sender keys", covers: "F3" },
    { title: "Several devices per account", covers: "F4" },
    { title: "Encrypted media", covers: "F5" },
    { title: "Receipts", covers: "F6" },
  ],
  zones: zoneFrame({ core: "Real-time messaging" }),
  nodes: [
    { id: "ana", label: "Ana's phone", sub: "sender", icon: "phone", fill: "pastel", x: 105, y: 150, w: 150 },
    {
      id: "linked",
      label: "Ben's linked",
      sub: "laptop, web",
      icon: "browser",
      fill: "pastel",
      step: 6,
      x: 105,
      y: 275,
      w: 150,
    },
    { id: "ben", label: "Ben's phone", sub: "recipient", icon: "phone", fill: "pastel", x: 105, y: 400, w: 150 },
    {
      id: "push",
      label: "APNs / FCM",
      sub: "external",
      icon: "bell",
      fill: "pastel",
      step: 3,
      x: 105,
      y: 640,
      w: 150,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "layer 4, TCP",
      icon: "load-balancer",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 270,
      w: 150,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "encrypted blobs",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      step: 7,
      x: 297,
      y: 450,
      w: 150,
    },
    {
      id: "chat",
      label: "Chat servers",
      sub: "1M connections each",
      icon: "chat",
      tone: "green",
      fill: "pastel",
      x: 575,
      y: 120,
      w: 220,
    },
    {
      id: "registry",
      label: "Routing registry",
      sub: "device → server",
      icon: "registry",
      tone: "green",
      fill: "pastel",
      step: 2,
      x: 575,
      y: 225,
      w: 200,
    },
    {
      id: "keys",
      label: "Key service",
      sub: "prekeys, device lists",
      icon: "key",
      tone: "teal",
      fill: "pastel",
      step: 4,
      x: 575,
      y: 410,
      w: 220,
    },
    {
      id: "media",
      label: "Media service",
      sub: "upload URLs",
      icon: "media",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 540,
      w: 220,
    },
    {
      id: "queue",
      label: "Offline queue",
      sub: "per device, 30 days",
      icon: "queue",
      tone: "orange",
      accent: true,
      step: 3,
      x: 879,
      y: 140,
      w: 200,
    },
    {
      id: "fanout",
      label: "Group fan-out",
      sub: "1 ciphertext, n copies",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 290,
      w: 200,
    },
    {
      id: "notify",
      label: "Push notifier",
      sub: "wake, no content",
      icon: "bell",
      tone: "orange",
      fill: "pastel",
      step: 3,
      x: 879,
      y: 460,
      w: 200,
    },
    {
      id: "mailbox",
      label: "Mailbox store",
      sub: "undelivered only",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 140,
    },
    {
      id: "accounts",
      label: "Account DB",
      sub: "devices, groups",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 290,
    },
    {
      id: "keystore",
      label: "Key store",
      sub: "public keys only",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 410,
    },
    {
      id: "blob",
      label: "Blob store",
      sub: "ciphertext media",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 540,
    },
  ],
  edges: [
    { from: "ana", to: "lb", label: "send", flow: true, packet: true, until: 5 },
    {
      from: "lb",
      to: "chat",
      label: "TCP",
      flow: true,
      packet: true,
      delay: 0.4,
      bidirectional: true,
      via: [
        [390, 270],
        [390, 120],
      ],
    },
    { from: "lb", to: "ben", label: "deliver", flow: true, packet: true, delay: 1.2 },

    { from: "chat", to: "registry", dashed: true, bidirectional: true, step: 2 },

    { from: "chat", to: "queue", label: "store", flow: true, packet: true, delay: 0.8, step: 3 },
    { from: "queue", to: "mailbox", label: "append", step: 3 },
    {
      from: "queue",
      to: "notify",
      label: "offline",
      dashed: true,
      step: 3,
      via: [
        [1000, 150],
        [1000, 460],
      ],
      labelAt: 0.66,
    },
    {
      from: "notify",
      to: "push",
      label: "wake",
      dashed: true,
      step: 3,
      via: [
        [879, 705],
        [105, 705],
      ],
      labelAt: 0.5,
    },
    { from: "push", to: "ben", label: "notify", dashed: true, step: 3 },

    { from: "lb", to: "keys", label: "fetch keys", dashed: true, step: 4, labelAt: 0.72 },
    { from: "keys", to: "keystore", label: "prekeys", step: 4 },

    { from: "chat", to: "fanout", label: "group msg", flow: true, packet: true, delay: 0.8, step: 5 },
    { from: "fanout", to: "accounts", step: 5 },
    { from: "fanout", to: "queue", label: "n copies", step: 5 },

    { from: "ana", to: "lb", label: "a copy per device", flow: true, packet: true, step: 6 },
    { from: "lb", to: "linked", flow: true, packet: true, delay: 1.2, step: 6 },

    {
      from: "lb",
      to: "media",
      label: "upload URL",
      dashed: true,
      step: 7,
      labelAt: 0.3,
      via: [
        [390, 300],
        [390, 540],
      ],
    },
    { from: "media", to: "blob", label: "encrypted upload", step: 7 },
    { from: "cdn", to: "blob", label: "fetch blob", dashed: true, step: 7 },
    { from: "ben", to: "cdn", dashed: true, step: 7 },

    {
      from: "lb",
      to: "ana",
      label: "delivered, read",
      dashed: true,
      step: 8,
      via: [[297, 150]],
    },
  ],
};

export default spec;
