import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A chat assistant that streams its answer, built one requirement at a time (chatgpt case study, the hero).
// Eight steps: 1 one chat server calls one model server and blocks until the whole answer is ready (both edges
// replaced in step 2) · 2 the answer streams back as server-sent events · 3 the conversation store: metadata in a
// relational DB with replicas, message bodies in a sharded message store, a cache in front · 4 the inference fleet: a
// router with a queue hands batch slots on many model servers (the direct chat-to-model edge goes away) · 5 admission
// and limits counted in tokens per plan; tokens used flow to a usage log for billing and analytics · 6
// moderation of the prompt and of the streamed answer · 7 stop, resume and cancel: a stream buffer per response for
// reconnects, and a cancel that frees the slot · 8 regions and overflow: an overflow fleet with a smaller model.
// Working (round numbers chosen to size the system): 100,000,000 daily users × 10 prompts = 1,000,000,000 a day ÷
// 86,400 s ≈ 11,600 prompts/s, peak 3 × ≈ 35,000/s; 500 tokens at 50 tokens/s = 10 s per answer, so 35,000 × 10 =
// 350,000 open streams at peak; 5,000 replicas × 64 streams = 320,000 slots, so 3,000 prompts/s overflow at peak.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: the user (105, 370). Edge column x 297: CDN
// 160, load balancer 370. Core ("Inference"): router (accent) 575, 115; model servers 490, 235; overflow fleet 660, 235
// (the chat-to-router edge runs up the 30 px gap between them). Services: chat service 575, 390; moderation 490, 500;
// limits 660, 500. Async x 879: usage log 140 (its readers, billing and analytics, are not drawn: every box
// placed lower in the async zone sat on one of the four chat-to-store edges).
// The chat-to-router edge has no label: it runs up the gap between the two model boxes. Storage x 1098: conversation DB 130, message store 290, cache 450, stream buffer 610.
// Every long edge was checked against the boxes it passes.

const spec: DiagramSpec = {
  title: "Chat assistant high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One server, one model, blocking", covers: "F1" },
    { title: "Stream the answer", covers: "F1, N1" },
    { title: "Store the conversations", covers: "F2, F6" },
    { title: "A fleet: router, queue, batching", covers: "N5, N6" },
    { title: "Limits in tokens, per plan", covers: "F4" },
    { title: "Moderation in and out", covers: "F5" },
    { title: "Stop, resume, cancel", covers: "F3, N7" },
    { title: "Regions and overflow", covers: "N3, N5" },
  ],
  zones: zoneFrame({ core: "Inference" }),
  nodes: [
    { id: "user", label: "User", sub: "web / app", icon: "phone", fill: "pastel", x: 105, y: 370, w: 120 },
    {
      id: "cdn",
      label: "CDN",
      sub: "app assets",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 160,
      w: 150,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "L7, long streams",
      icon: "load-balancer",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 370,
      w: 150,
    },
    {
      id: "router",
      label: "Router + queue",
      sub: "admit, batch, priority",
      icon: "router",
      tone: "green",
      accent: true,
      step: 4,
      x: 575,
      y: 115,
      w: 230,
    },
    {
      id: "model",
      label: "Model servers",
      sub: "large, batched",
      icon: "gpu",
      tone: "green",
      fill: "pastel",
      x: 490,
      y: 235,
      w: 152,
    },
    {
      id: "overflow",
      label: "Overflow fleet",
      sub: "small model",
      icon: "gpu",
      tone: "green",
      fill: "pastel",
      step: 8,
      x: 660,
      y: 235,
      w: 150,
    },
    {
      id: "chat",
      label: "Chat service",
      sub: "SSE, request id",
      icon: "chat",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 390,
      w: 220,
    },
    {
      id: "moderation",
      label: "Moderation",
      sub: "prompt, answer",
      icon: "shield",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 490,
      y: 500,
      w: 140,
    },
    {
      id: "limits",
      label: "Limits",
      sub: "tokens per plan",
      icon: "timer",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 660,
      y: 500,
      w: 140,
    },
    {
      id: "log",
      label: "Usage log",
      sub: "billing, analytics",
      icon: "log",
      tone: "orange",
      variant: "glyph",
      step: 5,
      x: 879,
      y: 140,
    },
    {
      id: "convdb",
      label: "Conversation DB",
      sub: "1 primary + replicas",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 130,
    },
    {
      id: "messages",
      label: "Message store",
      sub: "sharded by conversation",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 290,
    },
    {
      id: "cache",
      label: "Cache",
      sub: "users, lists, counters",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 450,
    },
    {
      id: "buffer",
      label: "Stream buffer",
      sub: "per response, minutes",
      icon: "queue",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 610,
    },
  ],
  edges: [
    { from: "user", to: "cdn", label: "app", dashed: true },
    { from: "user", to: "lb", label: "prompt", flow: true, packet: true, until: 1 },
    { from: "lb", to: "chat", label: "prompt", flow: true, packet: true, delay: 0.4 },
    { from: "chat", to: "model", label: "wait 10 s", tone: "red", labelAt: 0.62, until: 1 },

    { from: "user", to: "lb", label: "SSE", flow: true, packet: true, bidirectional: true, step: 2 },
    {
      from: "chat",
      to: "model",
      label: "token stream",
      labelAt: 0.62,
      flow: true,
      packet: true,
      delay: 0.8,
      bidirectional: true,
      step: 2,
      until: 3,
    },

    { from: "chat", to: "convdb", label: "metadata", dashed: true, labelAt: 0.35 },
    { from: "chat", to: "messages", label: "append turns", labelAt: 0.35 },
    { from: "chat", to: "cache", label: "read-through", dashed: true, labelAt: 0.35 },

    {
      from: "chat",
      to: "router",
      flow: true,
      packet: true,
      delay: 0.8,
      bidirectional: true,
    },
    { from: "router", to: "model", label: "batch slot", flow: true, packet: true, delay: 1.2 },

    { from: "chat", to: "limits", label: "check" },
    { from: "limits", to: "cache", label: "counters", dashed: true, labelAt: 0.6 },
    { from: "router", to: "log", label: "tokens used" },

    { from: "chat", to: "moderation", label: "check" },

    { from: "chat", to: "buffer", label: "tokens", labelAt: 0.62 },

    { from: "router", to: "overflow", label: "overflow", dashed: true },
  ],
};

export default spec;
