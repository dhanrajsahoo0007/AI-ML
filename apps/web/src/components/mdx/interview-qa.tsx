import React from "react";
import Link from "next/link";
import { ArrowUpRight, CornerDownRight, ListCollapse, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyChip, type CompanyTag } from "@/components/company-logo";
import { interviewArea } from "@/lib/interview-areas";
import {
  InterviewQuestion,
  QaController,
  type FollowUpItem,
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
  "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-ink/40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper [&[aria-pressed=true]_svg]:text-paper";
// Company chips draw their own pill; this restyles it when pressed.
const companyChipClass =
  "rounded-full [&[aria-pressed=true]>span]:border-ink [&[aria-pressed=true]>span]:bg-ink [&[aria-pressed=true]>span]:text-paper";
// Wide enough for the longest label, "Company", so the chips of every row start on the same line.
const labelClass = "w-[4.75rem] shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const badgeClass =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2";

// Level colours, as dots: the label itself stays ink for contrast.
const LEVEL_DOT: Record<Level, string> = {
  Junior: "var(--dg-green)",
  Mid: "var(--dg-orange)",
  Senior: "var(--dg-red)",
};

/**
 * Icons for the list, rendered by the server: `area:<name>` for an area, `topic:<title>` for a topic
 * (questionIcons() in question-bank.tsx). They arrive as elements so this file, which also runs in the browser on
 * the companies page, does not pull the icon set into that page's bundle.
 */
export type QuestionIcons = Record<string, React.ReactNode>;

function Icon({ icons, id, className }: { icons?: QuestionIcons; id: string; className?: string }) {
  const icon = icons?.[id];
  return icon ? <span className={cn("inline-flex shrink-0 [&>svg]:size-full", className)}>{icon}</span> : null;
}

function LevelDot({ level }: { level: Level }) {
  return <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: LEVEL_DOT[level] }} />;
}

/** The question's area as a tinted pill with the area's icon. */
function AreaBadge({ area, icons }: { area: string; icons?: QuestionIcons }) {
  const meta = interviewArea(area);
  return (
    <span data-tone={meta?.tone} className={cn(badgeClass, "bg-tint-soft")}>
      <Icon icons={icons} id={`area:${area}`} className="size-3 text-tint" />
      {area}
    </span>
  );
}

type PageLink = { href: string; title: string };

/** "Topics: Caching · Redis" under an answer: the pages a question is tagged to. */
function TopicLinks({ label, links }: { label: string; links: PageLink[] }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      {links.map((t, i) => (
        <span key={t.href}>
          {i > 0 && " · "}
          <Link href={t.href} className="text-primary underline underline-offset-2">
            {t.title}
          </Link>
        </span>
      ))}
    </p>
  );
}

/** A question's own companies and those of its follow-ups, each once. */
function allCompanies(own: CompanyTag[] = [], followUps: FollowUpItem[] = []) {
  const bySlug = new Map<string, CompanyTag>();
  for (const c of [...own, ...followUps.flatMap((f) => f.companies ?? [])]) bySlug.set(c.slug, c);
  return Array.from(bySlug.values());
}

const weightOf = (followUps: FollowUpItem[] = []) => 1 + followUps.length;

// The follow-ups of a design question, nested under its answer. They are plain <details> without data-qa-item,
// so the filters treat a question and its follow-ups as one row and "Expand all" leaves them closed.
function FollowUps({ items }: { items: FollowUpItem[] }) {
  return (
    <div data-qa-followups className="mt-5 rounded-lg border border-hairline bg-paper">
      <p className="flex items-center gap-2 border-b border-hairline px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        <CornerDownRight aria-hidden className="size-3.5 text-primary" />
        Interviewers then ask
        <span className="font-mono font-normal tracking-normal">{items.length}</span>
      </p>
      {items.map((f, i) => (
        <details key={i} data-qa-followup className="group/f border-b border-hairline last:border-b-0">
          <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
            <span className="w-5 shrink-0 pt-0.5 font-mono text-xs text-primary">{i + 1}</span>
            <span className="block min-w-0 flex-1">
              <span className="block text-[15px] leading-snug font-medium text-ink">{f.question}</span>
              {(f.level || (f.companies && f.companies.length > 0)) && (
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {f.level && (
                    <span className={cn(badgeClass, "border border-hairline")}>
                      <LevelDot level={f.level} />
                      {f.level}
                    </span>
                  )}
                  {f.companies?.slice(0, TAGS_SHOWN).map((c) => (
                    <CompanyChip key={c.slug} company={c} />
                  ))}
                </span>
              )}
            </span>
            <span
              aria-hidden
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-transform duration-200 group-open/f:rotate-45"
            >
              <Plus className="size-3" />
            </span>
          </summary>
          <div className="px-4 pb-4 pl-12">
            <div className="text-[15px] leading-relaxed text-ink-2 [&>*+*]:mt-3">{f.answer}</div>
            {f.topics && f.topics.length > 0 && (
              <div className="mt-3 border-t border-hairline pt-2.5 text-[13px]">
                <TopicLinks label={f.topics.length > 1 ? "Topics" : "Topic"} links={f.topics} />
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

interface InterviewQuestionsProps {
  title?: string;
  footer?: React.ReactNode;
  /** Company slug chosen outside the list (the companies page); replaces the company chips. */
  company?: string;
  /** Icons of the areas and topics in the list (questionIcons()). */
  icons?: QuestionIcons;
  children: React.ReactNode;
}

function QuestionItem({
  index,
  question,
  category,
  area,
  level,
  companies,
  related,
  topics,
  refs,
  followUpTo,
  followUps,
  icons,
  children,
}: InterviewQuestionProps & { index: number; icons?: QuestionIcons }) {
  const hasTopics = topics !== undefined && topics.length > 0;
  return (
    <details
      data-qa-item
      data-cat={category ?? ""}
      data-area={area ?? ""}
      data-level={level ?? ""}
      data-companies={allCompanies(companies, followUps)
        .map((c) => c.slug)
        .join(" ")}
      data-qa-weight={weightOf(followUps)}
      className="group border-b border-hairline transition-colors duration-200 open:bg-paper-2/50"
    >
      <summary className="group/q flex w-full cursor-pointer list-none items-start gap-4 px-1 py-5 text-left sm:gap-6 sm:px-3 [&::-webkit-details-marker]:hidden">
        <span className="w-6 shrink-0 pt-1.5 font-mono text-xs text-primary">{String(index).padStart(2, "0")}</span>
        <span className="block min-w-0 flex-1">
          {followUpTo && (
            <span data-qa-followup-to className="mb-1 flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
              <CornerDownRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>Follow-up to: {followUpTo}</span>
            </span>
          )}
          <span className="block font-display text-lg leading-snug text-ink transition-colors group-hover/q:text-primary">
            {question}
          </span>
          {(area || category || level) && (
            <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              {area && <AreaBadge area={area} icons={icons} />}
              {level && (
                <span className={cn(badgeClass, "border border-hairline")}>
                  <LevelDot level={level} />
                  {level}
                </span>
              )}
              {category && (
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {category}
                </span>
              )}
              {followUps && followUps.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CornerDownRight aria-hidden className="size-3" />
                  {followUps.length} follow-up{followUps.length > 1 ? "s" : ""}
                </span>
              )}
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
        {(related || hasTopics || (refs && refs.length > 0)) && (
          <div className="mt-4 space-y-1.5 border-t border-hairline pt-3 text-[13px]">
            {hasTopics && <TopicLinks label={topics.length > 1 ? "Topics" : "Topic"} links={topics} />}
            {!hasTopics && related && (
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
        {followUps && followUps.length > 0 && <FollowUps items={followUps} />}
      </div>
    </details>
  );
}

function FilterChip({
  group,
  value,
  tone,
  children,
}: {
  group: string;
  value: string;
  /** Tint of the chip's icon (an interview area's tone). */
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-qa-filter={group}
      data-value={value}
      data-tone={tone}
      aria-pressed={value === ""}
      className={chipClass}
    >
      {children}
    </button>
  );
}

export function InterviewQuestions({ title, footer, company, icons, children }: InterviewQuestionsProps) {
  const questions = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<InterviewQuestionProps> => React.isValidElement(child)
  );

  const levels = LEVELS.filter((l) => questions.some((q) => q.props.level === l));

  // A question counts for itself and for each follow-up nested under it.
  const total = questions.reduce((n, q) => n + weightOf(q.props.followUps), 0);

  // Companies by how many questions (and follow-ups) they tag, most first.
  const seen = new Map<string, { company: CompanyTag; count: number }>();
  for (const q of questions)
    for (const c of [...(q.props.companies ?? []), ...(q.props.followUps ?? []).flatMap((f) => f.companies ?? [])]) {
      const entry = seen.get(c.slug) ?? { company: c, count: 0 };
      entry.count += 1;
      seen.set(c.slug, entry);
    }
  const companyOptions = Array.from(seen.values()).sort(
    (a, b) => b.count - a.count || a.company.name.localeCompare(b.company.name)
  );

  // Topic chips, each with the area it belongs to.
  const tagMap = new Map<string, { name: string; count: number; area?: string }>();
  for (const q of questions) {
    const cat = q.props.category;
    if (!cat) continue;
    const tag = tagMap.get(cat) ?? { name: cat, count: 0, area: q.props.area };
    tag.count += weightOf(q.props.followUps);
    tagMap.set(cat, tag);
  }
  const tags = Array.from(tagMap.values());

  // Areas (LLM, GenAI, System Design), in the order the questions arrive, which is area order.
  const areaCounts = new Map<string, number>();
  for (const q of questions) {
    const a = q.props.area;
    if (a) areaCounts.set(a, (areaCounts.get(a) ?? 0) + weightOf(q.props.followUps));
  }
  const areas = Array.from(areaCounts.entries()).map(([name, count]) => ({ name, count }));

  return (
    <section className="mt-10" data-qa>
      <QaController company={company} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title ?? "Interview questions"}
          </p>
          <p className="mt-1 font-display text-2xl text-ink">
            <span data-qa-count>{total}</span>
            <span data-qa-of hidden className="text-muted-foreground">
              {" "}
              / {total}
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

      <div data-qa-filters className="mb-6 space-y-3 rounded-xl border border-hairline bg-paper-2/40 p-4 empty:hidden">
        {company === undefined && companyOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
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

        {areas.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={labelClass}>Area</span>
            <FilterChip group="area" value="">
              Any
            </FilterChip>
            {areas.map(({ name, count }) => (
              <FilterChip key={name} group="area" value={name} tone={interviewArea(name)?.tone}>
                <Icon icons={icons} id={`area:${name}`} className="size-3.5 text-tint" />
                {name}
                <span data-qa-tag-count className="opacity-60">
                  {count}
                </span>
              </FilterChip>
            ))}
          </div>
        )}

        {levels.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={labelClass}>Level</span>
            <FilterChip group="level" value="">
              Any
            </FilterChip>
            {levels.map((l) => (
              <FilterChip key={l} group="level" value={l}>
                <LevelDot level={l} />
                {l}
              </FilterChip>
            ))}
          </div>
        )}

        {tags.length > 1 && (
          <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
            <span className={cn(labelClass, "pt-1.5")}>Topic</span>
            <FilterChip group="tag" value="">
              All
            </FilterChip>
            {/* On a phone the rows take the full width, under the label and the All chip. */}
            <div className="min-w-0 basis-full space-y-2 sm:flex-1 sm:basis-0">
              {/* Topics area by area, so a long list (a company can be asked about a dozen) reads as a few short rows. */}
              {(areas.length > 1 ? areas.map((a) => a.name) : [undefined]).map((areaName) => (
                <div key={areaName ?? "all"} data-qa-tag-row className="flex flex-wrap items-center gap-2">
                  {areaName && (
                    <span
                      data-tone={interviewArea(areaName)?.tone}
                      className="inline-flex w-full items-center gap-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase sm:w-32 sm:shrink-0"
                    >
                      <Icon icons={icons} id={`area:${areaName}`} className="size-3 text-tint" />
                      {areaName}
                    </span>
                  )}
                  {tags
                    .filter((t) => areaName === undefined || t.area === areaName)
                    .map(({ name, count }) => (
                      <FilterChip key={name} group="tag" value={name}>
                        <Icon icons={icons} id={`topic:${name}`} className="size-3.5 text-muted-foreground" />
                        {name}
                        <span data-qa-tag-count className="opacity-60">
                          {count}
                        </span>
                      </FilterChip>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        {questions.map((q, i) => (
          <QuestionItem key={i} index={i + 1} icons={icons} {...q.props} />
        ))}
        <p data-qa-empty hidden className={cn("py-10 text-center text-sm text-muted-foreground")}>
          No questions match. Try a different search or filter.
        </p>
      </div>
      {footer && <div className="mt-6 text-xs leading-relaxed text-muted-foreground">{footer}</div>}
    </section>
  );
}
