// The areas an interview topic belongs to, in display order, each with the icon and tint its badge and filter chip
// use (tint: a diagram tone, globals.css [data-tone]). No Node imports: the question list renders this in the
// browser too (the companies page). lib/question-bank.ts takes its group names from here.

export interface InterviewArea {
  name: string;
  /** Icon key (src/lib/icons.ts). */
  icon: string;
  tone: "blue" | "green" | "orange" | "red" | "violet" | "teal" | "neutral";
}

export const INTERVIEW_AREAS: readonly InterviewArea[] = [
  { name: "LLM", icon: "brain", tone: "blue" },
  { name: "GenAI", icon: "sparkles", tone: "violet" },
  { name: "System Design", icon: "layers", tone: "teal" },
  { name: "Machine Learning & Data Science", icon: "cpu", tone: "green" },
  { name: "Career & Applied", icon: "users", tone: "orange" },
];

export function interviewArea(name: string | undefined): InterviewArea | undefined {
  return INTERVIEW_AREAS.find((a) => a.name === name);
}

// The two tracks of Interview Practice. Every category is in one (`track` in content/question-bank/taxonomy.yaml):
// AI and ML questions, or classic system design questions. The /interviews index lists the tracks separately.
export type InterviewTrack = "ai" | "design";

export const INTERVIEW_TRACKS: readonly { slug: InterviewTrack; title: string; noun: string; description: string }[] = [
  {
    slug: "ai",
    title: "AI & ML interviews",
    noun: "AI and ML",
    description:
      "LLMs, RAG, agents, evaluation, AI system design and machine learning, tagged with the companies reported to ask them.",
  },
  {
    slug: "design",
    title: "System design interviews",
    noun: "system design",
    description:
      "Design questions with the follow-ups interviewers ask next, and the fundamentals, databases and patterns behind them. Every question links to its topic page.",
  },
];
