// The GenAI design principles as data (plan: SYSTEM-DESIGN/plans/genai-design-plan.md §5). Each principle is
// defined once here and used in three places: the principles page (`design-principles` in the GenAI System Design
// hub) teaches it under a heading whose anchor is `anchor`; every case study names it in its "### GenAI principles"
// table, linking `${PRINCIPLES_PAGE}#${anchor}`; and the concept pages in `teach` get a "Used in our case studies"
// line generated from `caseStudies`. `genai-principles.test.ts` fails on a dead or outline href, a case study with
// fewer than five principles, and (once every case study is written) a principle used by fewer than two.
// The list is frozen at the pilot gate: renaming a principle changes its anchor and every link to it.

import { slugify } from "./doc-headings";

const CONCEPT = "/ai-system-design/genai-system-design";
const CASE = "/genai-system-design/case-studies";

/** The page that teaches every principle; case studies link its anchors. */
export const PRINCIPLES_PAGE = `${CASE}/design-principles`;

interface PrincipleRow {
  /** P1, P2, … in teaching order. */
  id: string;
  name: string;
  /** The rule in one sentence. */
  line: string;
  /** Concept pages that teach the mechanism, as site hrefs. */
  teach: string[];
  /** Written case studies that apply it, as site hrefs. Filled as each page lands. */
  caseStudies: string[];
}

interface Principle extends PrincipleRow {
  /** The heading id on the principles page: slugify(`${id} ${name}`). */
  anchor: string;
}

const concept = (...slugs: string[]) => slugs.map((s) => `${CONCEPT}/${s}`);

const ROWS: PrincipleRow[] = [
  {
    id: "P1",
    name: "Start with the simplest design that passes the evals",
    line: "A fixed workflow before an agent, one agent before many; add autonomy only when an eval shows the simpler design fails.",
    teach: concept("agent-architectures", "chain-flow-orchestration"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P2",
    name: "Ground before you generate",
    line: "Retrieve the evidence first and answer only from it; no evidence means no answer.",
    teach: concept("rag-fundamentals", "hallucination-mitigation"),
    caseStudies: [`${CASE}/customer-support-agent`, `${CASE}/kg-healthcare-case-study`],
  },
  {
    id: "P3",
    name: "Route by difficulty",
    line: "Send easy inputs down a cheap, fast path and pay for the large model only when the input needs it.",
    teach: concept("multi-model-routing-fallbacks", "choosing-a-model"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/ai-answer-engine`,
      `${CASE}/document-extraction-pipeline`,
      `${CASE}/conversational-assistant-design`,
    ],
  },
  {
    id: "P4",
    name: "Cascade from cheap to expensive",
    line: "Rules and small models decide the clear cases, a large model takes the uncertain band, and people take the rest.",
    teach: concept("content-moderation-red-teaming", "cost-latency-optimization"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/ai-answer-engine`,
      `${CASE}/document-extraction-pipeline`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P5",
    name: "Budget latency per stage",
    line: "Give every stage a number, stream and overlap stages, and manage the p95, not the mean.",
    teach: concept("streaming-and-time-to-first-token", "latency-token-monitoring"),
    caseStudies: [`${CASE}/voice-agent-call-centre`, `${CASE}/ai-answer-engine`, `${CASE}/kg-healthcare-case-study`],
  },
  {
    id: "P6",
    name: "Count and cap in tokens",
    line: "Quotas, budgets and capacity are measured in tokens and GPU time, not in requests.",
    teach: concept("rate-limiting-throttling", "capacity-planning-and-cost-estimation"),
    caseStudies: [`${CASE}/ai-answer-engine`],
  },
  {
    id: "P7",
    name: "Cache at every layer and keep the prefix stable",
    line: "Order the prompt so the provider's prefix cache hits; treat a semantic cache as a correctness risk to scope and audit.",
    teach: concept("prompt-caching", "semantic-caching"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/ai-answer-engine`,
      `${CASE}/conversational-assistant-design`,
    ],
  },
  {
    id: "P8",
    name: "Manage context deliberately",
    line: "Decide what enters the window: compact old turns, load tools and documents on demand, isolate sub-tasks.",
    teach: concept("context-engineering", "context-compaction-resets-and-state"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/ai-answer-engine`,
      `${CASE}/conversational-assistant-design`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P9",
    name: "Constrain the output",
    line: "Schemas and constrained decoding fix the shape; validators and rules after the model check the content.",
    teach: concept("structured-output-generation", "guardrails-output-validation"),
    caseStudies: [`${CASE}/document-extraction-pipeline`, `${CASE}/kg-healthcare-case-study`],
  },
  {
    id: "P10",
    name: "Enforce rules in code, not in the prompt",
    line: "Limits, permissions and money checks live in services the model calls, where no message can talk them away.",
    teach: concept("guardrails-and-safety", "tool-use-and-mcp"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/ai-answer-engine`,
      `${CASE}/document-extraction-pipeline`,
      `${CASE}/conversational-assistant-design`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P11",
    name: "Run as the user",
    line: "Every retrieval and every action runs with the end user's identity and permissions, never the agent's own.",
    teach: concept("rag-access-control-multi-tenancy", "access-control-rbac"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/conversational-assistant-design`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P12",
    name: "Bound the blast radius of actions",
    line: "Split reads from writes, scope credentials, sandbox execution and confirm anything that cannot be undone.",
    teach: concept("agent-security-and-sandboxing", "human-in-the-loop-and-approvals"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/conversational-assistant-design`,
    ],
  },
  {
    id: "P13",
    name: "Treat retrieved content as untrusted",
    line: "Pages, files, emails, transcripts and tool output can carry instructions; they are data, never commands.",
    teach: concept("prompt-injection-and-jailbreaks"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/ai-answer-engine`,
      `${CASE}/document-extraction-pipeline`,
      `${CASE}/conversational-assistant-design`,
    ],
  },
  {
    id: "P14",
    name: "Carry provenance",
    line: "Every claim, field, action and edge points back to its source, so it can be checked, cited and audited.",
    teach: concept("compliance-audit-logging", "data-versioning-lineage"),
    caseStudies: [
      `${CASE}/ai-answer-engine`,
      `${CASE}/document-extraction-pipeline`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P15",
    name: "Keep a human escape hatch and close the loop",
    line: "Escalation, review and appeals with the context handed over; every correction becomes eval and training data.",
    teach: concept("human-in-the-loop-and-approvals", "continuous-improvement-pipeline"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P16",
    name: "Evaluate continuously and degrade gracefully",
    line: "Gold sets, repeated trials and simulators before release, online checks after; fall back, shed load, refuse safely.",
    teach: concept("online-production-evaluation", "agent-reliability-and-error-recovery"),
    caseStudies: [
      `${CASE}/customer-support-agent`,
      `${CASE}/voice-agent-call-centre`,
      `${CASE}/document-extraction-pipeline`,
      `${CASE}/conversational-assistant-design`,
      `${CASE}/kg-healthcare-case-study`,
    ],
  },
  {
    id: "P17",
    name: "Keep sensitive data inside a boundary",
    line: "Redact, de-identify or keep data in its region and on approved models; log only what you may keep.",
    teach: concept("data-privacy-pii-handling", "compliance-audit-logging"),
    caseStudies: [`${CASE}/voice-agent-call-centre`, `${CASE}/kg-healthcare-case-study`],
  },
];

export const PRINCIPLES: Principle[] = ROWS.map((r) => ({ ...r, anchor: slugify(`${r.id} ${r.name}`) }));

/** The principles a case study applies, in catalog order. */
export const principlesFor = (caseStudyHref: string) => PRINCIPLES.filter((p) => p.caseStudies.includes(caseStudyHref));

/** The case studies of the GenAI System Design hub, as site hrefs (the eleven designs, not the Start-here pages). */
export const CASE_STUDIES = [
  "customer-support-agent",
  "voice-agent-call-centre",
  "ai-answer-engine",
  "document-extraction-pipeline",
  "conversational-assistant-design",
  "kg-healthcare-case-study",
  "kg-semiconductor-case-study",
  "llm-platform-gateway",
  "content-moderation-system",
  "chatgpt-style-chat-service",
  "code-assistant",
].map((s) => `${CASE}/${s}`);
