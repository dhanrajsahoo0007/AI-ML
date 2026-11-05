import type { DiagramSpec } from "../../types";

// Messenger deployed on AWS: the same eight build steps as messenger/architecture, drawn as a deployment.
// Layout, left to right: clients | global edge | Region { VPC { public | private app | private data subnets } |
// regional managed services }. Every tier inside the VPC runs in three Availability Zones.
//
// Lanes: y=728 inside the subnets (history → DynamoDB); y=772 and y=790 below the VPC (CloudFront → S3, SNS → APNs/FCM),
// with matching right lanes x=1318, 1338, 1358. The top lane y=86, between the VPC edge and the subnets, carries the
// early direct persist (steps 1–4) and later the presence heartbeats (step 6+), which never show together.
export const messengerAws: DiagramSpec = {
  title: "Facebook Messenger on AWS",
  width: 1400,
  height: 820,
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
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 60, w: 150, h: 740 },
    { id: "edge", title: "Global edge", tone: "blue", x: 186, y: 60, w: 148, h: 740 },
    { id: "region", title: "AWS Region", tone: "neutral", kind: "region", x: 350, y: 30, w: 1036, h: 775 },
    { id: "vpc", title: "VPC · 3 Availability Zones", tone: "blue", kind: "vpc", x: 366, y: 70, w: 746, h: 686 },
    { id: "public", title: "Public subnets", tone: "green", kind: "subnet", x: 382, y: 100, w: 152, h: 640 },
    { id: "app", title: "Private app subnets", tone: "teal", kind: "subnet", x: 548, y: 100, w: 304, h: 640 },
    { id: "data", title: "Private data subnets", tone: "violet", kind: "subnet", x: 866, y: 100, w: 232, h: 640 },
    { id: "managed", title: "Managed services", tone: "orange", x: 1128, y: 70, w: 244, h: 686 },
  ],
  nodes: [
    // Step 1: one chat tier behind an NLB, messages straight into DynamoDB.
    { id: "sender", label: "Sender", sub: "mobile / web", icon: "phone", x: 95, y: 200, w: 134, h: 60 },
    { id: "recipient", label: "Recipient", sub: "mobile / web", icon: "phone", x: 95, y: 470, w: 134, h: 60 },
    { id: "r53", label: "Route 53", sub: "latency routing", icon: "globe", tone: "blue", x: 260, y: 130, w: 140, h: 60 },
    { id: "nlb", label: "NLB", sub: "WebSockets", icon: "load-balancer", tone: "blue", x: 458, y: 200, w: 128, h: 60 },
    { id: "chat", label: "Chat servers", sub: "ECS on EC2, 3 AZs", icon: "chat", tone: "green", accent: true, x: 700, y: 200, w: 200, h: 62 },
    { id: "dynamo", label: "DynamoDB", sub: "messages", icon: "database", tone: "violet", variant: "glyph", x: 1250, y: 170 },

    // Step 2: which task holds the recipient's connection?
    { id: "sessions", label: "ElastiCache", sub: "session registry", icon: "cache", tone: "red", variant: "glyph", step: 2, x: 925, y: 175 },

    // Step 3: offline users through SNS mobile push.
    { id: "sns", label: "SNS", sub: "mobile push", icon: "bell", tone: "orange", step: 3, x: 1232, y: 360, w: 150, h: 60 },
    { id: "apns", label: "APNs / FCM", sub: "Apple, Google", icon: "bell", step: 3, x: 95, y: 690, w: 134, h: 60 },

    // Step 4: REST API, groups in Aurora, fan-out workers.
    { id: "alb", label: "ALB + WAF", sub: "REST API", icon: "gateway", tone: "blue", step: 4, x: 458, y: 470, w: 128, h: 60 },
    { id: "fanout", label: "Fan-out workers", sub: "ECS on Fargate", icon: "workers", tone: "orange", step: 4, x: 700, y: 340, w: 200, h: 58 },
    { id: "groups", label: "Group service", sub: "ECS on Fargate", icon: "users", tone: "teal", step: 4, x: 700, y: 470, w: 200, h: 58 },
    { id: "aurora", label: "Aurora PostgreSQL", sub: "users, groups", icon: "database", tone: "blue", variant: "glyph", step: 4, x: 982, y: 500 },

    // Step 5: MSK between the chat tier and everything downstream.
    { id: "msk", label: "Amazon MSK", sub: "keyed by conversation", icon: "queue", tone: "orange", variant: "glyph", step: 5, x: 982, y: 330, w: 90 },

    // Step 6: presence in its own cache cluster (heartbeat writes).
    { id: "presence", label: "ElastiCache", sub: "presence", icon: "cache", tone: "red", variant: "glyph", step: 6, x: 1040, y: 175 },

    // Step 7: media through S3 and CloudFront.
    { id: "media", label: "Media service", sub: "ECS on Fargate", icon: "media", tone: "teal", step: 7, x: 700, y: 580, w: 200, h: 58 },
    { id: "s3", label: "S3", sub: "photos, video", icon: "blob", tone: "violet", variant: "glyph", step: 7, x: 1250, y: 520 },
    { id: "cf", label: "CloudFront", sub: "media + WAF", icon: "cdn", tone: "violet", step: 7, x: 260, y: 580, w: 140, h: 60 },

    // Step 8: history pages and device sync.
    { id: "history", label: "History service", sub: "ECS on Fargate", icon: "history", tone: "teal", step: 8, x: 700, y: 690, w: 200, h: 58 },
  ],
  edges: [
    // Step 1.
    { from: "sender", to: "r53", label: "DNS", tone: "blue", dashed: true },
    { from: "sender", to: "nlb", label: "WebSocket", tone: "blue", flow: true, packet: true, delay: 0, labelAt: 0.42 },
    { from: "nlb", to: "chat", tone: "blue", flow: true, packet: true, delay: 0.6 },
    { from: "chat", to: "dynamo", label: "persist", tone: "violet", flow: true, packet: true, delay: 1.2, via: [[815, 86], [1190, 86]], until: 4 },
    { from: "chat", to: "nlb", tone: "green", flow: true, packet: true, delay: 3.0, via: [[580, 222], [540, 222]] },
    { from: "nlb", to: "recipient", label: "deliver", tone: "green", flow: true, packet: true, delay: 3.6, labelAt: 0.55 },

    // Step 2.
    { from: "chat", to: "sessions", tone: "red", dashed: true, bidirectional: true },

    // Step 3 (the direct path is replaced by fan-out workers in step 4).
    { from: "chat", to: "sns", label: "offline", tone: "orange", flow: true, packet: true, delay: 1.2, until: 3 },
    { from: "sns", to: "apns", label: "push", tone: "orange", dashed: true, via: [[1358, 360], [1358, 790], [95, 790]], labelAt: 0.7 },
    { from: "apns", to: "recipient", label: "notify", tone: "orange", dashed: true },

    // Step 4.
    { from: "sender", to: "alb", label: "HTTPS", tone: "blue", dashed: true, labelAt: 0.35 },
    { from: "alb", to: "groups", tone: "teal", dashed: true },
    { from: "groups", to: "aurora", label: "members", tone: "blue", dashed: true, labelAt: 0.45 },
    { from: "chat", to: "fanout", tone: "orange", flow: true, packet: true, delay: 1.2, until: 4 },
    { from: "fanout", to: "sessions", label: "lookup", tone: "red", dashed: true, via: [[840, 322], [840, 252], [903, 252]], labelAt: 0.37 },
    { from: "fanout", to: "chat", label: "online", tone: "green", flow: true, packet: true, delay: 2.4, via: [[760, 300], [760, 240]] },
    { from: "fanout", to: "sns", label: "offline", tone: "orange", flow: true, packet: true, delay: 2.4, via: [[850, 405], [1130, 405]], labelAt: 0.55 },

    // Step 5.
    { from: "chat", to: "msk", tone: "orange", flow: true, packet: true, delay: 1.2 },
    { from: "msk", to: "dynamo", label: "persist", tone: "violet", flow: true, packet: true, delay: 1.8 },
    { from: "msk", to: "fanout", tone: "orange", flow: true, packet: true, delay: 1.8 },

    // Step 6.
    { from: "chat", to: "presence", label: "heartbeats", tone: "green", dashed: true, via: [[820, 86], [1040, 86]], labelAt: 0.45 },

    // Step 7.
    { from: "alb", to: "media", tone: "teal", dashed: true },
    { from: "media", to: "s3", label: "pre-signed URL", tone: "violet", dashed: true, via: [[880, 620], [1150, 620]], labelAt: 0.45 },
    { from: "cf", to: "s3", label: "origin", tone: "violet", dashed: true, via: [[260, 772], [1338, 772], [1338, 520]], labelAt: 0.5 },
    { from: "cf", to: "recipient", label: "media", tone: "violet", dashed: true },

    // Step 8.
    { from: "alb", to: "history", tone: "teal", dashed: true, via: [[470, 690]] },
    { from: "history", to: "dynamo", label: "read pages", tone: "violet", dashed: true, via: [[830, 690], [830, 728], [1318, 728], [1318, 170]], labelAt: 0.35 },
  ],
};
