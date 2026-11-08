import React from "react";
import Link from "next/link";
import { ArrowUpRight, ListCollapse, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyChip, type CompanyTag } from "@/components/company-logo";
import {
  InterviewQuestion,
  QaController,
  type InterviewQuestionProps,
  type Level,
} from "@/components/mdx/interview-qa-island";

export { InterviewQuestion };

// The question list is plain server-rendered HTML: every question is a <details> element, so answers open
// without JavaScript and are in the page for search engines and find-in-page. Search, the filter chips and
// "Expand all" are handled by QaController, a small client island that only toggles attributes on this
// markup. This file has no "use client" so it also works inside client components (company-explorer.tsx).

const LEVELS: Level[] = ["Junior", "Mid", "Senior"];
// Show the search box only on banks large enough to need it.
const SEARCH_THRESHOLD = 10;
// Company tags shown on a question before "+N more", and company filters before "Show all".
const TAGS_SHOWN = 6;
const COMPANY_FILTERS_SHOWN = 10;

// Filter chips. The island sets aria-pressed, which drives the active style.
const chipClass =
  "rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink/40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper";
// Company chips draw their own pill; this restyles it when pressed.
const companyChipClass =
  "rounded-full [&[aria-pressed=true]>span]:border-ink [&[aria-pressed=true]>span]:bg-ink [&[aria-pressed=true]>span]:text-paper";
const labelClass = "mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

interface InterviewQuestionsProps {
  title?: string;
  footer?: React.ReactNode;
  /** Company slug chosen outside the list (the companies page); replaces the company chips. */
  company?: string;
  children: React.ReactNode;
}

function QuestionItem({
  index,
  question,
  category,
  level,
  companies,
  related,
  refs,
  children,
}: InterviewQuestionProps & { index: number }) {
  return (
    <details
      data-qa-item
      data-cat={category ?? ""}
      data-level={level ?? ""}
      data-companies={(companies ?? []).map((c) => c.slug).join(" ")}
      className="group border-b border-hairline transition-colors duration-200 open:bg-paper-2/50"
    >
      <summary className="group/q flex w-full cursor-pointer list-none items-start gap-4 px-1 py-5 text-left sm:gap-6 sm:px-3 [&::-webkit-details-marker]:hidden">
        <span className="w-6 shrink-0 pt-1.5 font-mono text-xs text-primary">{String(index).padStart(2, "0")}</span>
        <span className="block min-w-0 flex-1">
          <span className="block font-display text-lg leading-snug text-ink transition-colors group-hover/q:text-primary">
            {question}
          </span>
          {(category || level) && (
            <span className="mt-2 flex flex-wrap items-center gap-x-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {category && <span>{category}</span>}
              {level && <span className="text-primary">{level}</span>}
            </span>
          )}
          {companies && companies.length > 0 && (
            <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[12.5px] text-muted-foreground">Asked at</span>
              {companies.slice(0, TAGS_SHOWN).map((c) => (
                <CompanyChip key={c.slug} company={c} />
              ))}
              {companies.length > TAGS_SHOWN && (
                <span className="text-[12.5px] text-muted-foreground">+{companies.length - TAGS_SHOWN} more</span>
              )}
            </span>
          )}
        </span>
        <span
          aria-hidden
          className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-[color,border-color,transform] duration-200 group-open:rotate-45 group-hover/q:border-ink"
        >
          <Plus className="size-3.5" />
        </span>
      </summary>

      <div className="pr-4 pb-6 pl-11 sm:pr-14 sm:pl-[3.75rem]">
        <div className="text-[15px] leading-relaxed text-ink-2 [&>*+*]:mt-3">{children}</div>
        {(related || (refs && refs.length > 0)) && (
          <div className="mt-4 space-y-1.5 border-t border-hairline pt-3 text-[13px]">
            {related && (
              <p>
                <span className="text-muted-foreground">Deep-dive: </span>
                <Link href={related.href} className="text-primary underline underline-offset-2">
                  {related.title}
                </Link>
              </p>
            )}
            {refs && refs.length > 0 && (
              <p className="text-muted-foreground">
                Further reading (Outcome School):{" "}
                {refs.map((r, i) => (
                  <span key={r.url}>
                    {i > 0 && " · "}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-ink-2 underline underline-offset-2 hover:text-primary"
                    >
                      {r.title}
                      <ArrowUpRight aria-hidden className="size-3" />
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

function FilterChip({ group, value, children }: { group: string; value: string; children: React.ReactNode }) {
  return (
    <button type="button" data-qa-filter={group} data-value={value} aria-pressed={value === ""} className={chipClass}>
      {children}
    </button>
  );
}

export function InterviewQuestions({ title, footer, company, children }: InterviewQuestionsProps) {
  const questions = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<InterviewQuestionProps> => React.isValidElement(child)
  );

  const levels = LEVELS.filter((l) => questions.some((q) => q.props.level === l));

  // Companies by how many questions they tag, most first.
  const seen = new Map<string, { company: CompanyTag; count: number }>();
  for (const q of questions)
    for (const c of q.props.companies ?? []) {
      const entry = seen.get(c.slug) ?? { company: c, count: 0 };
      entry.count += 1;
      seen.set(c.slug, entry);
    }
  const companyOptions = Array.from(seen.values()).sort(
    (a, b) => b.count - a.count || a.company.name.localeCompare(b.company.name)
  );

  const tagCounts = new Map<string, number>();
  for (const q of questions) {
    const cat = q.props.category;
    if (cat) tagCounts.set(cat, (tagCounts.get(cat) ?? 0) + 1);
  }
  const tags = Array.from(tagCounts.entries()).map(([name, count]) => ({ name, count }));

  return (
    <section className="mt-10" data-qa>
      <QaController company={company} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title ?? "Interview questions"}
          </p>
          <p className="mt-1 font-display text-2xl text-ink">
            <span data-qa-count>{questions.length}</span>
            <span data-qa-of hidden className="text-muted-foreground">
              {" "}
              / {questions.length}
            </span>{" "}
            <span className="text-muted-foreground">questions</span>
          </p>
        </div>
        <button
          type="button"
          data-qa-expand
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          <ListCollapse className="size-3.5" />
          <span data-qa-expand-label>Expand all</span>
        </button>
      </div>

      {questions.length >= SEARCH_THRESHOLD && (
        <label className="mb-4 flex items-center gap-2.5 rounded-full border border-hairline bg-paper px-4 py-2.5 focus-within:border-ink">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search questions</span>
          <input
            type="search"
            data-qa-search
            placeholder="Search questions and answers"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </label>
      )}

      {company === undefined && companyOptions.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={labelClass}>Company</span>
          <FilterChip group="company" value="">
            Any
          </FilterChip>
          {companyOptions.map(({ company: c, count }, i) => (
            <button
              key={c.slug}
              type="button"
              data-qa-filter="company"
              data-value={c.slug}
              data-qa-extra={i >= COMPANY_FILTERS_SHOWN ? "" : undefined}
              hidden={i >= COMPANY_FILTERS_SHOWN}
              aria-pressed={false}
              className={companyChipClass}
            >
              <CompanyChip company={c} count={count} />
            </button>
          ))}
          {companyOptions.length > COMPANY_FILTERS_SHOWN && (
            <button
              type="button"
              data-qa-more={companyOptions.length}
              className="text-[13px] text-primary underline underline-offset-2"
            >
              Show all {companyOptions.length}
            </button>
          )}
        </div>
      )}

      {levels.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={labelClass}>Level</span>
          <FilterChip group="level" value="">
            Any
          </FilterChip>
          {levels.map((l) => (
            <FilterChip key={l} group="level" value={l}>
              {l}
            </FilterChip>
          ))}
        </div>
      )}

      {tags.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip group="tag" value="">
            All
          </FilterChip>
          {tags.map(({ name, count }) => (
            <FilterChip key={name} group="tag" value={name}>
              {name}
              <span data-qa-tag-count className="ml-1.5 opacity-60">
                {count}
              </span>
            </FilterChip>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        {questions.map((q, i) => (
          <QuestionItem key={i} index={i + 1} {...q.props} />
        ))}
        <p data-qa-empty hidden className={cn("py-10 text-center text-sm text-muted-foreground")}>
          No questions match. Try a different search or filter.
        </p>
      </div>
      {footer && <div className="mt-6 text-xs leading-relaxed text-muted-foreground">{footer}</div>}
    </section>
  );
}
