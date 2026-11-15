import type { SequenceSpec } from "@/components/diagrams/types";
import { ARTICLES, RAG_TONE, TOP_K } from "@/components/diagrams/presets/rag";

// Access control inside retrieval, with the track's access-control case: ARTICLES.runbook ("Runbook: unlock a locked
// account") carries the ACL metadata allowed_groups = ["support-staff"]. Public help articles carry ["everyone"].
//
// Step 1: a customer asks about a locked account. The app takes the user from the session token and asks the identity
// provider (IdP) for that user's groups: customers.
// Step 2: the app searches with a filter built from those groups. The runbook is the closest chunk to this question,
// but it fails the filter, so it is never a candidate; the top 5 are public chunks.
// Step 3: a support agent asks the same kind of question. The IdP returns support-staff, the filter admits the
// runbook, and the agent's answer cites it.
// Step 4, the failure: the app searches with no filter and checks permissions only on the output. The runbook chunk
// is in the prompt, the LLM paraphrases its steps, and dropping the citation afterwards does not remove the text.
//
// Sequence lanes take the seven section tones only (no pink or lime): the user lanes and the app neutral, the IdP teal
// (it supplies the filter), the retriever violet (the index), the LLM green. Calls are drawn blue by the renderer,
// returns neutral; the failure is carried by the note and by the page's red callout.

/** Group names in the identity provider (illustrative). */
const GROUP = { customer: "customers", staff: "support-staff" } as const;

const spec: SequenceSpec = {
  kind: "sequence",
  title: `Access control inside retrieval: who may see "${ARTICLES.runbook}"`,
  width: 880,
  lanes: [
    { id: "customer", label: "Customer", icon: "users", tone: RAG_TONE.infra },
    { id: "agent", label: "Support agent", icon: "user-check", tone: RAG_TONE.infra },
    { id: "app", label: "RAG app", icon: "pipeline", tone: RAG_TONE.infra },
    { id: "idp", label: "Identity (IdP)", icon: "key", tone: RAG_TONE.keyword },
    { id: "retriever", label: "Retriever", icon: "vector-index", tone: RAG_TONE.store },
    { id: "llm", label: "LLM", icon: "model", tone: RAG_TONE.answer },
  ],
  steps: [
    { title: "The app asks the identity provider who is asking" },
    { title: "The filter runs inside retrieval: the runbook is never a candidate" },
    { title: "A support agent's search does find the runbook" },
    { title: "Failure: filtering after generation is too late" },
  ],
  messages: [
    // Step 1
    { from: "customer", to: "app", label: "account locked: how to unlock?" },
    { from: "app", to: "idp", label: "groups for this user?" },
    { from: "idp", to: "app", label: GROUP.customer, kind: "return" },

    // Step 2
    { from: "app", to: "retriever", label: `search, filter: ${GROUP.customer}`, step: 2 },
    { from: "retriever", to: "app", label: `top ${TOP_K}, all public`, kind: "return", step: 2 },
    { from: "app", to: "customer", label: "answer from public articles", kind: "return", step: 2 },

    // Step 3
    { from: "agent", to: "app", label: "unlock a customer?", step: 3 },
    { from: "app", to: "idp", label: "groups for this user?", step: 3 },
    { from: "idp", to: "app", label: GROUP.staff, kind: "return", step: 3 },
    { from: "app", to: "retriever", label: `search, filter: ${GROUP.staff}`, step: 3 },
    { from: "retriever", to: "app", label: `top ${TOP_K}, runbook first`, kind: "return", step: 3 },
    { from: "app", to: "agent", label: "steps, cites the runbook", kind: "return", step: 3 },

    // Step 4
    { from: "app", to: "retriever", label: "customer's search, no filter", step: 4 },
    { from: "retriever", to: "app", label: `top ${TOP_K}, runbook first`, kind: "return", step: 4 },
    { from: "app", to: "llm", label: "prompt holds the runbook", step: 4 },
    { from: "llm", to: "app", label: "answer repeats its steps", kind: "return", step: 4 },
    { from: "app", to: "customer", label: "staff-only steps, no link", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "app", text: "Too late: the output check drops the citation, not the copied steps", step: 4, at: 15.5 },
  ],
};

export default spec;
