import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";

// Brightpost's LLM gateway, built one job at a time (llm-gateway, the Architecture figure). Three teams' apps call
// model providers; the gateway is added in step 2 and gains one job per step after that.
//
// Seven steps: 1 every app calls provider A with its own provider key (the "before") · 2 one gateway, one API: apps
// hold team keys, the gateway holds the provider keys and speaks each provider's format · 3 budgets and rate limits:
// the gateway counts tokens per team key in a shared store · 4 an exact-match response cache · 5 routing: easy
// questions to a self-hosted small model, provider B becomes the fallback · 6 guardrails on the prompt and the answer
// · 7 every call logged with its key, tokens, cost and latency. Nodes never move; the step-1 direct calls end with
// `until: 1` and the step-2 link to provider B (`until: 4`) is replaced by the dashed fallback link in step 5.
//
// Why not reuse cloud/api-gateway-request: that figure is about sign-in tokens and API versions in front of three
// REST services; nothing in it counts tokens, caches answers, falls back between providers or checks prompts.
//
// Layout (880 × 470): apps in a column at x 100 (y 100, 240, 380); the gateway at (440, 240), the accent; its stores
// above it (usage counters x 345, response cache x 535, y 78) and its checks and logs below (guardrails x 345, logs
// x 535, y 402); providers in a column at x 785 (y 100, 240, 380). Above and below the gateway, the two nodes sit
// either side of its centre so the four short edges fan out without crossing.
// Colours (PROD_TONE, four tones plus neutral): apps orange (traffic), the gateway neutral (infrastructure), counters,
// cache and logs violet (stores), providers and the self-hosted model green (the model), guardrails lime (a check).
// Fact check: per-key budgets and token-per-minute limits, provider fallbacks, exact-match caching, guardrails and
// per-request logs are all features of LiteLLM, Portkey, Kong AI Gateway and Cloudflare AI Gateway (docs, November
// 2026); the figure names no product.

const COL = { apps: 100, left: 345, gw: 440, right: 535, prov: 785 } as const;
const ROW = { top: 100, mid: 240, bottom: 380 } as const;

const spec: DiagramSpec = {
  title: "An LLM gateway, one job at a time",
  width: 880,
  height: 470,
  steps: [
    { title: "Every app calls a provider with its own key" },
    { title: "One gateway, one API, team keys" },
    { title: "Budgets and rate limits per team key" },
    { title: "Answer repeated requests from a cache" },
    { title: "Route easy questions to a small model; fall back to B" },
    { title: "Check the prompt and the answer" },
    { title: "Log every call with its key, tokens and cost" },
  ],
  zones: [
    { id: "apps", title: "Brightpost apps", tone: PROD_TONE.traffic, x: 5, y: 40, w: 190, h: 400 },
    { id: "providers", title: "Models", tone: PROD_TONE.model, x: 695, y: 40, w: 180, h: 400 },
  ],
  nodes: [
    // Step 1: three apps and the one provider they all call.
    {
      id: "support",
      label: "Support assistant",
      sub: `${n(TRAFFIC.requestsPerDay)} requests/day`,
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: COL.apps,
      y: ROW.top,
      w: 176,
    },
    {
      id: "catalogue",
      label: "Catalogue writer",
      sub: "nightly batch",
      icon: "file",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: COL.apps,
      y: ROW.mid,
      w: 176,
    },
    {
      id: "labs",
      label: "Labs prototypes",
      sub: "new ideas",
      icon: "browser",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: COL.apps,
      y: ROW.bottom,
      w: 176,
    },
    {
      id: "provA",
      label: "Provider A",
      sub: "large model",
      icon: "api",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: COL.prov,
      y: ROW.top,
      w: 160,
    },

    // Step 2: the gateway and a second provider behind the same API.
    {
      id: "gateway",
      label: "LLM gateway",
      sub: "one API, team keys",
      icon: "gateway",
      tone: PROD_TONE.infra,
      accent: true,
      step: 2,
      x: COL.gw,
      y: ROW.mid,
      w: 190,
      h: 64,
    },
    {
      id: "provB",
      label: "Provider B",
      sub: "second vendor",
      icon: "api",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 2,
      x: COL.prov,
      y: ROW.mid,
      w: 160,
    },

    // Step 3: counters for budgets and rate limits.
    {
      id: "counters",
      label: "Usage counters",
      sub: "tokens per key",
      icon: "database",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 3,
      x: COL.left,
      y: 78,
      w: 170,
    },

    // Step 4: the response cache.
    {
      id: "cache",
      label: "Response cache",
      sub: "exact match, TTL",
      icon: "cache",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 4,
      x: COL.right,
      y: 78,
      w: 170,
    },

    // Step 5: a self-hosted small model for easy questions.
    {
      id: "small",
      label: "Self-hosted",
      sub: "small model",
      icon: "api",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 5,
      x: COL.prov,
      y: ROW.bottom,
      w: 160,
    },

    // Step 6: guardrails.
    {
      id: "guard",
      label: "Guardrails",
      sub: "PII, policy",
      icon: "shield",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 6,
      x: COL.left,
      y: 402,
      w: 170,
    },

    // Step 7: the log and spend store.
    {
      id: "logs",
      label: "Logs and spend",
      sub: "per key, per call",
      icon: "log",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 7,
      x: COL.right,
      y: 402,
      w: 170,
    },
  ],
  edges: [
    // Step 1: three apps, three copies of provider A's key, no shared limit or log.
    { from: "support", to: "provA", label: "own key", packet: true, until: 1 },
    { from: "catalogue", to: "provA", label: "own key", packet: true, delay: 0.4, labelAt: 0.3, until: 1 },
    { from: "labs", to: "provA", label: "own key", packet: true, delay: 0.8, labelAt: 0.3, until: 1 },

    // Step 2: apps send one request shape with a team key; the gateway translates for each provider.
    { from: "support", to: "gateway", packet: true, step: 2 },
    { from: "catalogue", to: "gateway", label: "team keys", packet: true, delay: 0.3, step: 2 },
    { from: "labs", to: "gateway", packet: true, delay: 0.6, step: 2 },
    { from: "gateway", to: "provA", label: "A's format", packet: true, delay: 1, step: 2 },
    { from: "gateway", to: "provB", label: "B's format", packet: true, delay: 1.2, step: 2, until: 4 },

    // Step 3: read and add to the team's token count before and after every call.
    { from: "gateway", to: "counters", label: "tokens", bidirectional: true, step: 3 },

    // Step 4: an identical request is answered from the cache.
    { from: "gateway", to: "cache", label: "lookup", bidirectional: true, step: 4 },

    // Step 5: easy questions go to the small model; B now only takes over when A fails.
    { from: "gateway", to: "small", label: "easy", packet: true, delay: 1.2, step: 5 },
    { from: "gateway", to: "provB", label: "fallback", dashed: true, step: 5 },

    // Step 6: the prompt is checked on the way in and the answer on the way out.
    { from: "gateway", to: "guard", label: "check", bidirectional: true, step: 6 },

    // Step 7: one log line per call.
    { from: "gateway", to: "logs", label: "every call", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
