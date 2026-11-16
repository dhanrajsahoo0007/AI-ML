import type { SequenceSpec } from "@/components/diagrams/types";
import { RAG_TONE, TOP_K } from "@/components/diagrams/presets/rag";

// Deep dive, "Corrective retrieval loop": one run of Brightpost's main question through a pipeline that grades its
// own retrieval and its own answer before showing anything.
// Step 1: retrieve the top 5 and grade them: only 2 of 5 are relevant (the basic top 5, RESULTS ranks 1 to 5).
// Step 2: weak, so an LLM rewrites the query and the app searches again; the grader passes 3 of 5. A note gives the
// fallback for a retry that stays weak: search another source (Corrective RAG, Yan et al. 2024, uses web search) or
// answer "not found".
// Step 3: the LLM writes a draft from the chunks that passed.
// Step 4: every claim in the draft is checked against the chunks; only a supported answer reaches the user.
// The grader is a separate model, as in Corrective RAG (a fine-tuned T5-large retrieval evaluator). In Self-RAG
// (Asai et al. 2023) the LLM grades itself with reflection tokens instead: the grader and LLM lanes merge.
//
// Sequence lanes take the seven section tones only (no lime), so the grader is neutral like the app; the retriever is
// violet (the index) and the LLM green. Calls are drawn blue by the renderer, returns neutral.

const relevantFirst = 2;
const relevantRetry = 3;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Corrective RAG: grade the chunks, retry, then check the answer",
  width: 860,
  lanes: [
    { id: "user", label: "Customer", icon: "users", tone: RAG_TONE.infra },
    { id: "app", label: "RAG app", icon: "pipeline", tone: RAG_TONE.infra },
    { id: "retriever", label: "Retriever", icon: "vector-index", tone: RAG_TONE.store },
    { id: "grader", label: "Grader", icon: "gauge", tone: RAG_TONE.infra },
    { id: "llm", label: "LLM", icon: "model", tone: RAG_TONE.answer },
  ],
  steps: [
    { title: "Retrieve, then grade before generating" },
    { title: "Weak results: rewrite the query and retry" },
    { title: "Generate from the chunks that passed" },
    { title: "Check every claim before it is shown" },
  ],
  messages: [
    // Step 1
    { from: "user", to: "app", label: "lost my phone: reset?" },
    { from: "app", to: "retriever", label: "search the question" },
    { from: "retriever", to: "app", label: `top ${TOP_K} chunks`, kind: "return" },
    { from: "app", to: "grader", label: "relevant to the question?" },
    { from: "grader", to: "app", label: `weak: ${relevantFirst} of ${TOP_K} relevant`, kind: "return" },

    // Step 2
    { from: "app", to: "llm", label: "rewrite the query", step: 2 },
    { from: "llm", to: "app", label: "lost phone, no backup codes", kind: "return", step: 2 },
    { from: "app", to: "retriever", label: "search again", step: 2 },
    { from: "retriever", to: "app", label: `top ${TOP_K} chunks`, kind: "return", step: 2 },
    { from: "app", to: "grader", label: "relevant?", step: 2 },
    { from: "grader", to: "app", label: `pass: ${relevantRetry} of ${TOP_K} relevant`, kind: "return", step: 2 },

    // Step 3
    { from: "app", to: "llm", label: `prompt: ${relevantRetry} chunks + question`, step: 3 },
    { from: "llm", to: "app", label: "draft, 2 citations", kind: "return", step: 3 },

    // Step 4
    { from: "app", to: "grader", label: "is each claim in a chunk?", step: 4 },
    { from: "grader", to: "app", label: "supported", kind: "return", step: 4 },
    { from: "app", to: "user", label: "answer with 2 links", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "app", text: "Still weak after 2 tries? Search another source or say 'not found'", step: 2, at: 10.5 },
    { lane: "app", text: "Unsupported claim? Drop it, or rewrite and retry", step: 4, at: 14.5 },
  ],
};

export default spec;
