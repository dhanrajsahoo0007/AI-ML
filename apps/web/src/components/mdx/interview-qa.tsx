"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ListCollapse, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Level = "Junior" | "Mid" | "Senior";

interface InterviewQuestionProps {
  question: string;
  category?: string;
  level?: Level;
  companies?: string[];
  related?: { href: string; title: string };
  refs?: { title: string; url: string }[];
  children: React.ReactNode;
}

const LEVELS: Level[] = ["Junior", "Mid", "Senior"];
// Show the search box only on banks large enough to need it.
const SEARCH_THRESHOLD = 10;

// Plain text of an answer, so search can match answer bodies as well as questions.
function nodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return "";
}

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-[13px] transition-colors",
    active
      ? "border-ink bg-ink text-paper"
      : "border-hairline bg-paper text-ink-2 hover:border-ink/40"
  );
}

interface InterviewQuestionsProps {
  title?: string;
  footer?: React.ReactNode;
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
  isOpen,
  onToggle,
}: InterviewQuestionProps & {
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "border-b border-hairline transition-colors duration-200",
        isOpen && "bg-paper-2/50"
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="group flex w-full items-start gap-4 px-1 py-5 text-left sm:gap-6 sm:px-3"
      >
        <span className="w-6 shrink-0 pt-1.5 font-mono text-xs text-primary">
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-snug text-ink transition-colors group-hover:text-primary">
            {question}
          </p>
          {(category || level) && (
            <span className="mt-2 flex flex-wrap items-center gap-x-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {category && <span>{category}</span>}
              {level && <span className="text-primary">{level}</span>}
            </span>
          )}
          {companies && companies.length > 0 && (
            <span className="mt-1.5 block text-[13px] text-muted-foreground">
              Asked at {companies.join(", ")}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors group-hover:border-ink"
        >
          <Plus className="size-3.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="pr-4 pb-6 pl-11 sm:pr-14 sm:pl-[3.75rem]">
              <div className="text-[15px] leading-relaxed text-ink-2 [&>*+*]:mt-3">
                {children}
              </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InterviewQuestion(_props: InterviewQuestionProps) {
  return null;
}

export function InterviewQuestions({ title, footer, children }: InterviewQuestionsProps) {
  const questions = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<InterviewQuestionProps> =>
      React.isValidElement(child)
  );

  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set());
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [query, setQuery] = useState("");
  const [activeCompany, setActiveCompany] = useState("");

  const searchIndex = useMemo(
    () =>
      questions.map((q) =>
        `${q.props.question} ${q.props.category ?? ""} ${(q.props.companies ?? []).join(" ")} ${nodeText(q.props.children)}`.toLowerCase()
      ),
    [questions]
  );

  const levels = useMemo(
    () => LEVELS.filter((l) => questions.some((q) => q.props.level === l)),
    [questions]
  );

  const companyOptions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const q of questions)
      for (const c of q.props.companies ?? []) seen.set(c, (seen.get(c) ?? 0) + 1);
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [questions]);

  const tags = useMemo(() => {
    const seen = new Map<string, number>();
    for (const q of questions) {
      const cat = q.props.category;
      if (cat) seen.set(cat, (seen.get(cat) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([name, count]) => ({ name, count }));
  }, [questions]);

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return questions
      .map((q, i) => ({ q, originalIndex: i }))
      .filter(
        ({ q, originalIndex }) =>
          (!activeTag || q.props.category === activeTag) &&
          (!activeLevel || q.props.level === activeLevel) &&
          (!activeCompany || (q.props.companies ?? []).includes(activeCompany)) &&
          terms.every((t) => searchIndex[originalIndex].includes(t))
      );
  }, [questions, activeTag, activeLevel, activeCompany, query, searchIndex]);

  const isFiltered = filtered.length !== questions.length;

  const allFilteredOpen = filtered.length > 0 && filtered.every(({ originalIndex }) => openSet.has(originalIndex));

  const toggleAll = useCallback(() => {
    if (allFilteredOpen) {
      setOpenSet((prev) => {
        const next = new Set(prev);
        for (const { originalIndex } of filtered) next.delete(originalIndex);
        return next;
      });
    } else {
      setOpenSet((prev) => {
        const next = new Set(prev);
        for (const { originalIndex } of filtered) next.add(originalIndex);
        return next;
      });
    }
  }, [allFilteredOpen, filtered]);

  const toggleOne = useCallback((index: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title ?? "Interview questions"}
          </p>
          <p className="mt-1 font-display text-2xl text-ink">
            {filtered.length}
            {isFiltered && (
              <span className="text-muted-foreground"> / {questions.length}</span>
            )}{" "}
            <span className="text-muted-foreground">questions</span>
          </p>
        </div>
        <button
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          <ListCollapse className="size-3.5" />
          {allFilteredOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {questions.length >= SEARCH_THRESHOLD && (
        <label className="mb-4 flex items-center gap-2.5 rounded-full border border-hairline bg-paper px-4 py-2.5 focus-within:border-ink">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search questions</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions and answers"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </label>
      )}

      {companyOptions.length > 1 && (
        <label className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Company
          </span>
          <select
            value={activeCompany}
            onChange={(e) => setActiveCompany(e.target.value)}
            className="rounded-full border border-hairline bg-paper px-3 py-1 text-[13px] text-ink-2 outline-none focus:border-ink"
          >
            <option value="">Any company</option>
            {companyOptions.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </label>
      )}

      {levels.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Level
          </span>
          <button
            onClick={() => setActiveLevel(null)}
            className={chipClass(activeLevel === null)}
          >
            Any
          </button>
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setActiveLevel(activeLevel === l ? null : l)}
              className={chipClass(activeLevel === l)}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {tags.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={chipClass(activeTag === null)}
          >
            All
          </button>
          {tags.map(({ name, count }) => (
            <button
              key={name}
              onClick={() => setActiveTag(activeTag === name ? null : name)}
              className={chipClass(activeTag === name)}
            >
              {name}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        <AnimatePresence initial={false}>
          {filtered.map(({ q, originalIndex }) => (
            <motion.div
              key={originalIndex}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionItem
                index={originalIndex + 1}
                question={q.props.question}
                category={q.props.category}
                level={q.props.level}
                companies={q.props.companies}
                related={q.props.related}
                refs={q.props.refs}
                isOpen={openSet.has(originalIndex)}
                onToggle={() => toggleOne(originalIndex)}
              >
                {q.props.children}
              </QuestionItem>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No questions match. Try a different search or filter.
          </p>
        )}
      </div>
      {footer && (
        <div className="mt-6 text-xs leading-relaxed text-muted-foreground">{footer}</div>
      )}
    </section>
  );
}
