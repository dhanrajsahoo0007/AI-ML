import * as React from "react";
import { z } from "zod";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Self-check questions with a hidden answer. Plain <details>, so no JS. Usage in MDX:
//   <Quiz>
//     <QuizItem question="Why is p99 more useful than the average?" hint="Think about fan-out.">
//       Because a page that calls many services sees the slow tail of each one.
//     </QuizItem>
//   </Quiz>

export function Quiz({ title = "Check yourself", children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="my-8 rounded-xl border border-hairline bg-paper" aria-label={title}>
      <div className="border-b border-hairline px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:px-5">
        {title}
      </div>
      <ol className="!m-0 !list-none divide-y divide-hairline !p-0 [&>li]:!m-0 [&>li]:!pl-0">{children}</ol>
    </section>
  );
}

const quizItemSchema = z
  .object({
    question: z.string().min(1),
    hint: z.string().min(1).optional(),
    children: z.unknown().optional(),
  })
  .strict();

export function QuizItem(props: z.input<typeof quizItemSchema>) {
  const parsed = parseProps("QuizItem", quizItemSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { question, hint } = parsed.data;
  const children = props.children as React.ReactNode;
  return (
    <li className="px-4 py-4 sm:px-5">
      <p className="!mt-0 font-display font-semibold leading-snug text-ink">{question}</p>
      {hint && <p className="!mt-1 text-sm text-muted-foreground">Hint: {hint}</p>}
      <details className="group/quiz !mt-3 !border-0">
        <summary className="!inline-flex cursor-pointer !items-center !gap-1.5 rounded-full border border-hairline !px-3 !py-1 !text-[13px] !font-medium !tracking-normal !text-ink-2 transition-colors hover:border-ink hover:!text-ink focus-visible:outline-2 focus-visible:outline-ring after:!hidden">
          <span className="group-open/quiz:hidden">Show answer</span>
          <span className="hidden group-open/quiz:inline">Hide answer</span>
        </summary>
        <div
          className="!mt-3 rounded-lg border-l-2 bg-paper-2/60 !p-3 text-[15px] leading-relaxed text-ink-2 [&>*+*]:mt-2"
          style={{ borderColor: "var(--dg-green)" }}
        >
          {children}
        </div>
      </details>
    </li>
  );
}
