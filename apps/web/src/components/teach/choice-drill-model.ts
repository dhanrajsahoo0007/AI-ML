import { z } from "zod";

// Data and pure helpers for the two pick-one exercises that share an island:
// <GuessTheLevel> (read an answer, pick the level it shows) and <WhichPrinciple> (read a prompt, pick the
// principle it tests). Both become a list of items, each answered from one shared set of options.

export interface DrillItem {
  text: string;
  /** The right option, by index into the options. */
  answer: number;
  /** Why that option is right. */
  why: string;
}

export interface ChoiceDrill {
  title: string;
  /** The interviewer's question the items reply to, when they share one. */
  prompt?: string;
  /** What to do, shown under the title. */
  instruction: string;
  options: string[];
  items: DrillItem[];
}

const text = z.string().min(1);
const unique = (list: string[]) => new Set(list).size === list.length;

export const guessTheLevelSchema = z
  .object({
    title: text.optional(),
    /** The interviewer's question every answer replies to. */
    prompt: text,
    /** The levels to choose from, lowest first, e.g. ["Mid", "Senior", "Staff"]. */
    levels: z.array(text).min(2).max(5).refine(unique, { message: "levels must be different" }),
    answers: z
      .array(z.object({ text, level: text, why: text }).strict())
      .min(1)
      .max(5),
  })
  .strict()
  .refine((p) => p.answers.every((a) => p.levels.includes(a.level)), {
    message: "answers: every `level` must be one of `levels`",
  });

export const whichPrincipleSchema = z
  .object({
    title: text.optional(),
    /** The principles, values or focus areas to choose from. */
    principles: z.array(text).min(2).max(8).refine(unique, { message: "principles must be different" }),
    prompts: z
      .array(z.object({ text, principle: text, why: text }).strict())
      .min(2)
      .max(8),
  })
  .strict()
  .refine((p) => p.prompts.every((q) => p.principles.includes(q.principle)), {
    message: "prompts: every `principle` must be one of `principles`",
  });

export function levelDrill(p: z.output<typeof guessTheLevelSchema>): ChoiceDrill {
  return {
    title: p.title ?? "Guess the level",
    prompt: p.prompt,
    instruction:
      p.answers.length === 1
        ? "Read the answer. Which level does it show?"
        : "Read each answer. Which level does it show?",
    options: p.levels,
    items: p.answers.map((a) => ({ text: a.text, answer: p.levels.indexOf(a.level), why: a.why })),
  };
}

export function principleDrill(p: z.output<typeof whichPrincipleSchema>): ChoiceDrill {
  return {
    title: p.title ?? "Which principle is this?",
    instruction: "Read each question. Which one is the interviewer testing?",
    options: p.principles,
    items: p.prompts.map((q) => ({ text: q.text, answer: p.principles.indexOf(q.principle), why: q.why })),
  };
}

/** How many items were answered correctly. `picks[i]` is the option chosen for item i, or undefined. */
export function scoreDrill(items: readonly DrillItem[], picks: readonly (number | undefined)[]): number {
  return items.reduce((n, item, i) => n + (picks[i] === item.answer ? 1 : 0), 0);
}

/** One line on the result. */
export function drillSummary(right: number, total: number): string {
  if (total === 1) return right === 1 ? "Correct." : "Not this time. The reason is above.";
  if (right === total) return `${right} of ${total}. All correct.`;
  return `${right} of ${total} correct. The reasons are above.`;
}
