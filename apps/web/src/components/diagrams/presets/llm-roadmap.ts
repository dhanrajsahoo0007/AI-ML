// Constants for "GenAI Interview Roadmap" only (llm/roadmap-study-path and llm/roadmap-answer-timeline). The page's
// Architecture section, its prerequisites table and its Interview framework list read the same facts as these
// constants; keep them in step (the page's prose numbers are the ones below).
//
// Tiers and groups: the page's Architecture section, in its order. Group names are the hub's groups in
// content/sections.yaml (key ai-system-design, `groups`), each built from categories in
// content/ai-system-design/_index.yaml. Checked 2026-11-17 that every page below sits in the group named for it:
//   Embeddings & Representation Space (Embeddings), Vector Databases (Vector Databases), RAG Fundamentals (RAG
//   Foundations & Ingestion), Agentic RAG (Types of RAG), RAG Evaluation (RAG Evaluation)  -> RAG & Knowledge
//   Agent Architectures, Tool Use & Function Calling (Agent Foundations)                    -> AI Agents & Engineering
//   Fine-Tuning LLMs, LoRA, QLoRA & PEFT (Adapting a Model)                                 -> Fine-Tuning & Adaptation
//   Self-Attention Explained (Transformer & Core Mechanics)                                 -> LLM Foundations
//   LLM Evaluation Fundamentals (Evaluation Methods)                                        -> Evaluation
//   LLM Inference Engine (Inference Engine & GPUs)                                          -> Inference & Serving
//   Prompt Injection & Jailbreaks (Guardrails & Model Risks)                                -> Safety, Security & Governance
//
// Answer timeline: the page's 45-minute split, labelled illustrative there and on the figure.
//   5 + 5 + 20 + 10 + 5 = 45 minutes; the deep dive is 20 ÷ 45 = 44 % of the round.

/** The hub's groups, by study tier (Architecture section, items 1 to 4). */
export const ROADMAP_TIERS = [
  { n: 1, name: "Orientation", groups: ["Start Here"] },
  { n: 2, name: "Foundations", groups: ["LLM Foundations"] },
  { n: 3, name: "Building blocks", groups: ["RAG & Knowledge", "AI Agents & Engineering", "Fine-Tuning & Adaptation"] },
  {
    n: 4,
    name: "Running it",
    groups: ["Evaluation", "Inference & Serving", "LLMOps & Observability", "Safety, Security & Governance"],
  },
] as const;

/** The branch taken only if the role needs it; it assumes tiers 2 and 4. */
export const ROADMAP_BRANCH = { name: "Multimodal & Voice", assumes: [2, 4] } as const;

type RoadmapGroup = (typeof ROADMAP_TIERS)[number]["groups"][number];

/** The prerequisites table, one edge per "Read first" page: read `from` before `to`. Page names as the table links them. */
export const ROADMAP_PREREQS: readonly {
  from: { page: string; group: RoadmapGroup };
  to: { page: string; group: RoadmapGroup };
}[] = [
  {
    from: { page: "Embeddings", group: "RAG & Knowledge" },
    to: { page: "Vector Databases", group: "RAG & Knowledge" },
  },
  {
    from: { page: "RAG Fundamentals", group: "RAG & Knowledge" },
    to: { page: "Agentic RAG", group: "RAG & Knowledge" },
  },
  {
    from: { page: "Agent Architectures", group: "AI Agents & Engineering" },
    to: { page: "Agentic RAG", group: "RAG & Knowledge" },
  },
  {
    from: { page: "LLM Evaluation Fundamentals", group: "Evaluation" },
    to: { page: "RAG Evaluation", group: "RAG & Knowledge" },
  },
  {
    from: { page: "Self-Attention Explained", group: "LLM Foundations" },
    to: { page: "LLM Inference Engine", group: "Inference & Serving" },
  },
  {
    from: { page: "Fine-Tuning LLMs", group: "Fine-Tuning & Adaptation" },
    to: { page: "LoRA, QLoRA & PEFT", group: "Fine-Tuning & Adaptation" },
  },
  {
    from: { page: "Tool Use & Function Calling", group: "AI Agents & Engineering" },
    to: { page: "Prompt Injection & Jailbreaks", group: "Safety, Security & Governance" },
  },
];

/** The 45-minute design answer (Interview framework), in order, with an ILLUSTRATIVE number of minutes each. */
export const ANSWER_PHASES = [
  {
    id: "clarify",
    label: "Clarify",
    minutes: 5,
    covers: "users, questions a day, languages, freshness, cost of an error",
  },
  { id: "baseline", label: "Baseline", minutes: 5, covers: "retrieve top articles, prompt, answer with citations" },
  {
    id: "deep",
    label: "Deep dive",
    minutes: 20,
    covers: "chunking, hybrid search, re-ranking, context budget, model, hand-off",
  },
  {
    id: "evaluate",
    label: "Evaluate and operate",
    minutes: 10,
    covers: "golden set, metrics, judge vs people, latency, cost, guardrails",
  },
  { id: "wrap", label: "Wrap up", minutes: 5, covers: "the design in three sentences, the biggest risk, what next" },
] as const;

/** The round's length: the sum of the phases (45). */
export const ROUND_MINUTES = ANSWER_PHASES.reduce((sum, p) => sum + p.minutes, 0);
