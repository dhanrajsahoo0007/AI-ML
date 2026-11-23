import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { BATCH_TERMS, SUMMARY_JOB } from "@/components/diagrams/presets/production-batch";

// The hero of batch-vs-realtime-inference: Brightpost's two paths to the same model. The online path answers a
// customer in 1.5 s; the offline path summarises yesterday's 200,000 conversations overnight, either through a
// provider batch API at half price or on Brightpost's own GPUs while they are idle.
//
// Seven steps: 1 the customer asks, the gateway sends it to the engine at high priority · 2 every exchange is logged ·
// 3 at 01:00 a job collects yesterday's 200,000 exchanges · 4 it sends them to a provider batch API in 8 batches ·
// 5 or it feeds the engine at low priority while the GPUs are idle · 6 summaries come back and are written by id ·
// 7 requests that expired or failed are resubmitted. Nodes never move between steps.
//
// Batch count: Anthropic allows 100,000 requests or 256 MB per batch. Each request is about 2,450 tokens ×
// about 4 bytes per token ≈ 10 KB of JSON, so 256 MB holds about 25,000 requests: 200,000 ÷ 25,000 = 8 batches
// (the size cap binds before the request cap; bytes per token is an approximation).
//
// Layout: two rows. Online row y 120: customer 100 · gateway 330 · engine 590. Offline row y 330: logs 100 ·
// batch job 330 · batch API 590 · summaries 800. The retry edge (step 7) runs under the offline row at y 430; the
// engine's results run right along y 120 then down to the summaries.
//
// Colours (PROD_TONE, four tones plus neutral): the customer and the online zone orange (traffic), the engine and its
// zone teal (compute), the logs, the summaries and the offline zone blue (data), the provider's model green; gateway
// and batch job neutral (infrastructure). Arrows neutral.

const ROW = { online: 120, offline: 330 } as const;
const COL = { a: 100, b: 330, c: 590, d: 800 } as const;
const PER_BATCH = 25_000; // about 256 MB ÷ 10 KB per request, rounded down (see header)
const BATCHES = Math.ceil(SUMMARY_JOB.count / PER_BATCH); // 8

const spec: DiagramSpec = {
  title: "Two paths to one model: a customer now, 200,000 summaries overnight",
  width: 880,
  height: 480,
  steps: [
    { title: "A customer asks; the answer streams back" },
    { title: "Every exchange is logged" },
    { title: "At 01:00 a job collects yesterday's exchanges" },
    { title: "Send them to a provider batch API" },
    { title: "Or fill idle GPUs at low priority" },
    { title: "Write the summaries back by id" },
    { title: "Resubmit what expired or failed" },
  ],
  zones: [
    { id: "online", title: "Online: a person waits", tone: PROD_TONE.traffic, x: 20, y: 36, w: 430, h: 196 },
    { id: "gpus", title: "Brightpost's GPUs", tone: PROD_TONE.compute, x: 480, y: 36, w: 220, h: 196 },
    { id: "offline", title: "Offline: nobody waits", tone: PROD_TONE.data, x: 20, y: 256, w: 840, h: 206 },
  ],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: "asks a question",
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: COL.a,
      y: ROW.online,
    },
    {
      id: "gateway",
      label: "LLM gateway",
      sub: "priority by route",
      icon: "gateway",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: COL.b,
      y: ROW.online,
      w: 170,
    },
    {
      id: "engine",
      label: "Inference engine",
      sub: `${TRAFFIC.peakPerSecond} requests/s at peak`,
      icon: "gpu",
      tone: PROD_TONE.compute,
      fill: "pastel",
      x: COL.c,
      y: ROW.online,
      w: 190,
    },
    {
      id: "logs",
      label: "Conversation logs",
      sub: `${n(TRAFFIC.requestsPerDay)} a day`,
      icon: "log",
      tone: PROD_TONE.data,
      variant: "glyph",
      step: 2,
      x: COL.a,
      y: ROW.offline,
    },
    {
      id: "job",
      label: "Nightly batch job",
      sub: "01:00, one line per id",
      icon: "pipeline",
      tone: PROD_TONE.infra,
      fill: "pastel",
      step: 3,
      x: COL.b,
      y: ROW.offline,
      w: 180,
    },
    {
      id: "batchapi",
      label: "Provider batch API",
      sub: `${BATCH_TERMS.discount * 100} % off, within ${BATCH_TERMS.windowHours} h`,
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 4,
      x: COL.c,
      y: ROW.offline,
      w: 190,
    },
    {
      id: "summaries",
      label: "Summaries table",
      sub: "keyed by custom_id",
      icon: "database",
      tone: PROD_TONE.data,
      variant: "glyph",
      step: 6,
      x: COL.d,
      y: ROW.offline,
    },
  ],
  edges: [
    // Step 1: the online path. The gateway marks chat traffic high priority.
    { from: "customer", to: "gateway", label: "question", packet: true, bidirectional: true },
    { from: "gateway", to: "engine", label: "high priority", packet: true, delay: 0.6 },

    // Step 2: every exchange (prompt with passages, and the answer) goes to the logs.
    { from: "gateway", to: "logs", label: "log each exchange", dashed: true, flow: true, labelAt: 0.3, step: 2 },

    // Step 3: the scheduled job reads yesterday's exchanges.
    { from: "logs", to: "job", label: `${n(SUMMARY_JOB.count)} rows`, packet: true, step: 3 },

    // Step 4: 8 batches of about 25,000 requests each, under the 256 MB cap.
    { from: "job", to: "batchapi", label: `${BATCHES} batches`, packet: true, step: 4 },

    // Step 5: the alternative: the same requests on Brightpost's own engine while chat traffic is low.
    { from: "job", to: "engine", label: "night, low priority", dashed: true, packet: true, labelAt: 0.64, step: 5 },

    // Step 6: results come back keyed by id; output order is not guaranteed.
    { from: "batchapi", to: "summaries", label: "results", packet: true, step: 6 },
    {
      from: "engine",
      to: "summaries",
      label: "results",
      dashed: true,
      via: [[COL.d, ROW.online]],
      labelAt: 0.3,
      step: 6,
    },

    // Step 7: expired or errored requests go back into the next batch.
    {
      from: "batchapi",
      to: "job",
      label: "expired or failed: resubmit",
      dashed: true,
      via: [
        [COL.c, 430],
        [COL.b, 430],
      ],
      step: 7,
    },
  ],
};

export default spec;
