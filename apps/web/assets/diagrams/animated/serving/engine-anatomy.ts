import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC } from "@/components/diagrams/presets/production";

// Inside one inference-engine process (llm-inference-engine, the Architecture figure). Brightpost's chat service
// sends a prompt; the engine's API server tokenises it into the request queue (drawn as one node: the page's text
// covers the API server); every iteration the scheduler picks a batch,
// asks the KV block manager for blocks, and runs one forward pass for the whole batch on the GPU; the sampler turns
// each request's logits into one token; the detokeniser streams text back while the new tokens go round again.
//
// Six steps: 1 a request arrives and waits in the queue · 2 the scheduler picks this iteration's batch · 3 the block
// manager gives each request its KV blocks · 4 one forward pass runs the whole batch · 5 the sampler picks one token
// per request · 6 tokens stream out and the loop repeats. Nodes never move.
//
// Fact checks: the scheduler selects requests, runs one iteration and receives the output tokens, then updates the
// request pool (Yu et al., OSDI 2022, Orca, §3.2 and Fig. 4); vLLM's centralised scheduler and KV cache manager keep
// block tables that map each request's logical blocks to physical GPU blocks and hand them to the workers with each
// step (Kwon et al., 2023, arXiv 2309.06180, §4.2 and Fig. 4). Tokenising, sampling and detokenising follow the
// vLLM and TensorRT-LLM serving docs (checked November 2026).
//
// Layout (880 × 400): the chat service as a glyph on the left (x 70); everything else inside one zone, "One engine
// process", on a 3 × 2 grid with columns at x 255, 500 and 755. Top row y 90: request queue, scheduler, KV block
// manager. Bottom row y 320, flowing back left: forward pass, sampler, detokeniser. Horizontal edges carry short pills
// (gaps are about 70 wide); the longer labels ride the vertical and diagonal edges, which meet the row y 205 at
// x 500 ("+1 token each"), x 628 ("batch") and x 755 ("read / write KV"), so the pills never touch.
// Colour (four tones plus neutral): the chat service orange (traffic), the forward pass teal (compute), the sampler
// green (the model's output), the block manager violet (a store); queue, scheduler and detokeniser neutral (control).
// The scheduler is the accent: the component the page is about.

const ROW = { top: 90, mid: 205, bottom: 320 } as const;
const COL = { client: 70, a: 255, b: 500, c: 755 } as const;

const spec: DiagramSpec = {
  title: "Inside one inference engine: one iteration of the loop",
  width: 880,
  height: 400,
  steps: [
    { title: "A request arrives and waits in the queue" },
    { title: "The scheduler picks this iteration's batch" },
    { title: "The block manager gives each request its KV blocks" },
    { title: "One forward pass runs the whole batch" },
    { title: "The sampler picks one token per request" },
    { title: "Tokens stream out and the loop repeats" },
  ],
  zones: [{ id: "engine", title: "One engine process", tone: PROD_TONE.compute, x: 150, y: 30, w: 715, h: 350 }],
  nodes: [
    {
      id: "client",
      label: "Chat service",
      sub: `${TRAFFIC.peakPerSecond} requests/s at peak`,
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: COL.client,
      y: ROW.mid - 32,
    },
    {
      id: "queue",
      label: "Request queue",
      sub: "tokenised prompts",
      icon: "queue",
      tone: PROD_TONE.infra,
      x: COL.a,
      y: ROW.top,
      w: 170,
    },
    {
      id: "scheduler",
      label: "Scheduler",
      sub: "picks the batch",
      icon: "controller",
      tone: PROD_TONE.infra,
      accent: true,
      step: 2,
      x: COL.b,
      y: ROW.top,
      w: 180,
    },
    {
      id: "blocks",
      label: "KV block manager",
      sub: "block tables",
      icon: "registry",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 3,
      x: COL.c,
      y: ROW.top,
      w: 180,
    },
    {
      id: "forward",
      label: "Forward pass",
      sub: "whole batch on GPU",
      icon: "gpu",
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 4,
      x: COL.c,
      y: ROW.bottom,
      w: 180,
    },
    {
      id: "sampler",
      label: "Sampler",
      sub: "1 token per request",
      icon: "dices",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 5,
      x: COL.b,
      y: ROW.bottom,
      w: 180,
    },
    {
      id: "detok",
      label: "Detokeniser",
      sub: "streams text",
      icon: "message-square",
      tone: PROD_TONE.infra,
      step: 6,
      x: COL.a,
      y: ROW.bottom,
      w: 170,
    },
  ],
  edges: [
    // Step 1: the prompt arrives, is tokenised and waits.
    { from: "client", to: "queue", label: "prompt", packet: true },

    // Step 2: the scheduler admits waiting requests into this iteration's batch.
    { from: "queue", to: "scheduler", label: "admit", packet: true, step: 2 },

    // Step 3: blocks for each request in the batch; they go back to the free list when a request ends.
    { from: "scheduler", to: "blocks", label: "blocks", bidirectional: true, packet: true, step: 3 },

    // Step 4: one forward pass over every request in the batch, reading and writing KV blocks.
    { from: "scheduler", to: "forward", label: "batch", packet: true, step: 4 },
    { from: "forward", to: "blocks", label: "read / write KV", dashed: true, flow: true, step: 4 },

    // Step 5: one row of logits per request becomes one token per request.
    { from: "forward", to: "sampler", label: "logits", packet: true, step: 5 },

    // Step 6: text streams back; the new tokens join the next iteration.
    { from: "sampler", to: "detok", label: "tokens", packet: true, step: 6 },
    { from: "detok", to: "client", label: "text stream", packet: true, delay: 0.6, step: 6 },
    { from: "sampler", to: "scheduler", label: "+1 token each", dashed: true, flow: true, step: 6 },
  ],
};

export default spec;
