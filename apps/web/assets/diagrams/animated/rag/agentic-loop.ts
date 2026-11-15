import type { SequenceSpec } from "@/components/diagrams/types";
import { RESULTS, TOP_K } from "@/components/diagrams/presets/rag";

// "From one-shot retrieval to a retrieval loop": one run of Brightpost's main question through an agent that has a
// search tool. The model plans, calls search, reads what came back, notices a gap and searches again, then stops.
// Step 1: the customer asks; the agent plans two things to find (the reset steps, then two-factor recovery).
// Step 2: first search: the tool embeds the query and takes the top 5 from the index (RESULTS ranks 1 to 5).
// Step 3: the agent reads them: the reset article and the backup-code article are there, but nothing covers a
//   customer with no backup codes left.
// Step 4: second search for that gap; the ID-check article (RESULTS rank 7, outside the first top 5) comes back.
// Step 5: three relevant sources cover the question, so the agent stops and answers with three citations.
// The loop is the ReAct pattern (Yao et al. 2022): reasoning steps interleaved with actions (here, search calls).
//
// Tones (sequence lanes take the seven section tones): the customer and the search tool neutral (user and
// orchestration), the agent green (the LLM), the index violet (the store).

const relevantFirst = RESULTS.slice(0, TOP_K).filter((r) => r.relevant).length; // 2
const idCheck = RESULTS.find((r) => r.title.startsWith("No backup codes"))!.title;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Agentic RAG: plan, search, read, decide, search again, answer",
  width: 860,
  lanes: [
    { id: "user", label: "Customer", icon: "users", tone: "neutral" },
    { id: "agent", label: "Agent (LLM)", icon: "model", tone: "green" },
    { id: "tool", label: "Search tool", icon: "search", tone: "neutral" },
    { id: "index", label: "Index", icon: "vector-index", tone: "violet" },
  ],
  steps: [
    { title: "Plan what to look for" },
    { title: "Search" },
    { title: "Read the results and find the gap" },
    { title: "Search again for the gap" },
    { title: "Enough evidence: stop and answer" },
  ],
  messages: [
    // Step 1
    { from: "user", to: "agent", label: "lost my phone: reset?" },
    { from: "agent", to: "agent", label: "plan: reset, then 2FA" },

    // Step 2
    { from: "agent", to: "tool", label: "search(reset password)", step: 2 },
    { from: "tool", to: "index", label: `embed, top ${TOP_K}`, step: 2 },
    { from: "index", to: "tool", label: `${TOP_K} chunks`, kind: "return", step: 2 },
    { from: "tool", to: "agent", label: `${TOP_K} chunks with titles`, kind: "return", step: 2 },

    // Step 3
    { from: "agent", to: "agent", label: `read: ${relevantFirst} useful of ${TOP_K}`, step: 3 },
    { from: "agent", to: "agent", label: "gap: no backup codes?", step: 3 },

    // Step 4
    { from: "agent", to: "tool", label: "search(no backup codes)", step: 4 },
    { from: "tool", to: "index", label: `embed, top ${TOP_K}`, step: 4 },
    { from: "index", to: "tool", label: `${TOP_K} chunks`, kind: "return", step: 4 },
    { from: "tool", to: "agent", label: idCheck, kind: "return", step: 4 },

    // Step 5
    { from: "agent", to: "agent", label: "3 sources cover it: stop", step: 5 },
    { from: "agent", to: "user", label: "answer, 3 citations", kind: "return", step: 5 },
  ],
  notes: [{ lane: "agent", text: "Budget: at most 3 searches, then answer or hand over", step: 5, at: 12.5 }],
};

export default spec;
