import * as React from "react";
import { z } from "zod";
import { CompanyChip } from "@/components/company-logo";
import { parseProps } from "@/components/teach/parse-props";
import { InvalidProps } from "@/components/teach/props";
import { getCompany, getQuestions } from "@/lib/question-bank";

// The interview question at the top of a case study (plan §6.2), as the interviewer asks it:
//
//   <InterviewPrompt
//     prompt="Design a ticket booking system like Ticketmaster…"
//     level="Senior"
//     minutes={45}
//     bankId="design-ticket-booking"
//     tests={["Contention on one seat", "Surviving a spike far above capacity"]}
//     clarify={[{ q: "Assigned seats or general admission?", a: "Assigned seats on a seat map." }]}
//     outOfScope={["Resale", "Dynamic pricing"]}
//   />
//
// `bankId` names a question in content/question-bank/*.yaml; its `companies` show as "Reported at" chips. Company
// names come only from the bank, never from the page. Server component: the bank is read at build time.

const schema = z
  .object({
    prompt: z.string().min(20),
    level: z.enum(["Junior", "Mid", "Senior", "Staff"]),
    minutes: z.number().int().min(15).max(120),
    bankId: z.string().min(1).optional(),
    tests: z.array(z.string().min(1)).min(2).max(5),
    clarify: z
      .array(z.object({ q: z.string().min(1), a: z.string().min(1) }).strict())
      .min(2)
      .max(8),
    outOfScope: z.array(z.string().min(1)).max(6).optional(),
  })
  .strict();

const label = "!m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const chip =
  "inline-flex items-center rounded-full border border-hairline bg-paper px-2.5 py-1 text-[12.5px] leading-none text-ink-2";

export function InterviewPrompt(props: z.input<typeof schema>) {
  const parsed = parseProps("InterviewPrompt", schema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const p = parsed.data;

  const bank = p.bankId ? getQuestions().find((q) => q.id === p.bankId) : undefined;
  if (p.bankId && !bank) return <InvalidProps message={`<InterviewPrompt>: no bank question "${p.bankId}"`} />;
  const companies = (bank?.companies ?? [])
    .map((slug) => getCompany(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <section
      data-interview-prompt
      aria-label="The interview question"
      className="my-8 rounded-2xl border border-hairline bg-paper-2/50 p-5 sm:p-7"
    >
      <p className={label}>The interviewer says</p>
      <blockquote className="!mt-3 !mb-0 border-l-4 border-tint !pl-4 font-display text-xl leading-snug text-ink !not-italic sm:text-2xl">
        “{p.prompt}”
      </blockquote>

      <div className="!mt-5 flex flex-wrap items-center gap-2">
        <span className={chip}>{p.level}</span>
        <span className={chip}>{p.minutes}-minute round</span>
        {companies.length > 0 && (
          <>
            <span className="ml-1 text-[12.5px] text-muted-foreground">Reported at</span>
            {companies.map((c) => (
              <CompanyChip key={c.slug} company={c} />
            ))}
          </>
        )}
      </div>

      <div className="!mt-6">
        <p className={label}>What it tests</p>
        <ul className="!mt-2 !mb-0">
          {p.tests.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="!mt-6">
        <p className={label}>Clarifying questions, and the answers this page assumes</p>
        <dl className="!mt-3 !mb-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {p.clarify.map((c) => (
            <div key={c.q} className="rounded-xl border border-hairline bg-paper p-3">
              <dt className="text-[15px] font-medium text-ink">{c.q}</dt>
              <dd className="!m-0 !mt-1 text-[15px] leading-relaxed text-muted-foreground">{c.a}</dd>
            </div>
          ))}
        </dl>
      </div>

      {p.outOfScope && p.outOfScope.length > 0 && (
        <div className="!mt-6 flex flex-wrap items-center gap-2">
          <span className={label}>Out of scope</span>
          {p.outOfScope.map((o) => (
            <span key={o} className={chip}>
              {o}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
