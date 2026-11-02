"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListCollapse, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewQuestionProps {
  question: string;
  category?: string;
  children: React.ReactNode;
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
  children: React.ReactNode;
}

function QuestionItem({
  index,
  question,
  category,
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
          {category && (
            <span className="mt-2 inline-block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {category}
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

export function InterviewQuestions({ children }: InterviewQuestionsProps) {
  const questions = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<InterviewQuestionProps> =>
      React.isValidElement(child)
  );

  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set());
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const seen = new Map<string, number>();
    for (const q of questions) {
      const cat = q.props.category;
      if (cat) seen.set(cat, (seen.get(cat) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([name, count]) => ({ name, count }));
  }, [questions]);

  const filtered = useMemo(() => {
    if (!activeTag) return questions.map((q, i) => ({ q, originalIndex: i }));
    return questions
      .map((q, i) => ({ q, originalIndex: i }))
      .filter(({ q }) => q.props.category === activeTag);
  }, [questions, activeTag]);

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
            Interview questions
          </p>
          <p className="mt-1 font-display text-2xl text-ink">
            {filtered.length}
            {activeTag && (
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
                isOpen={openSet.has(originalIndex)}
                onToggle={() => toggleOne(originalIndex)}
              >
                {q.props.children}
              </QuestionItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
