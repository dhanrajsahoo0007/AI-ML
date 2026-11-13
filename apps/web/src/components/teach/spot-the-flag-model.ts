import { z } from "zod";

// Data and pure helpers for <SpotTheFlag>: a weak interview answer, sentence by sentence, in which the reader
// picks the sentences that would cost the candidate points.

const sentenceSchema = z
  .object({
    text: z.string().min(1),
    /** Set on a red flag: why this sentence costs the candidate. */
    flag: z.string().min(1).optional(),
    /** Optional, on a sentence that is fine: why it is fine. Shown when the reader flags it by mistake. */
    note: z.string().min(1).optional(),
  })
  .strict()
  .refine((s) => !(s.flag && s.note), { message: "give a sentence `flag` or `note`, not both" });

export const spotTheFlagSchema = z
  .object({
    title: z.string().min(1).optional(),
    /** The interviewer's question the answer replies to. */
    prompt: z.string().min(1),
    sentences: z.array(sentenceSchema).min(3).max(12),
  })
  .strict()
  .refine((p) => p.sentences.some((s) => s.flag), { message: "sentences: at least one needs a `flag`" })
  .refine((p) => p.sentences.some((s) => !s.flag), { message: "sentences: at least one must be fine (no `flag`)" });

export type FlagSentence = z.output<typeof sentenceSchema>;

/** How the reader did on one sentence. */
export type Verdict = "caught" | "missed" | "false-alarm" | "clear";

export function verdictOf(sentence: FlagSentence, picked: boolean): Verdict {
  if (sentence.flag) return picked ? "caught" : "missed";
  return picked ? "false-alarm" : "clear";
}

interface FlagScore {
  /** Red flags in the answer. */
  flags: number;
  caught: number;
  missed: number;
  falseAlarms: number;
}

export function scoreFlags(sentences: readonly FlagSentence[], picked: ReadonlySet<number>): FlagScore {
  const score: FlagScore = { flags: 0, caught: 0, missed: 0, falseAlarms: 0 };
  sentences.forEach((s, i) => {
    const v = verdictOf(s, picked.has(i));
    if (s.flag) score.flags += 1;
    if (v === "caught") score.caught += 1;
    else if (v === "missed") score.missed += 1;
    else if (v === "false-alarm") score.falseAlarms += 1;
  });
  return score;
}

/** One line on the result, for the summary under the answer. */
export function summarize({ flags, caught, falseAlarms }: FlagScore): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const found = `You caught ${caught} of ${plural(flags, "red flag")}`;
  if (falseAlarms > 0) return `${found}, with ${plural(falseAlarms, "false alarm")}.`;
  return caught === flags ? `${found}. Nothing missed.` : `${found}.`;
}
