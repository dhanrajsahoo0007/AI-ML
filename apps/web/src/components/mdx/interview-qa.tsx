"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ListCollapse, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewQuestionProps {
  question: string;
  category?: string;
  children: React.ReactNode;
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
        "group rounded-xl border transition-all duration-200",
        isOpen
          ? "border-primary/30 bg-primary/[0.03] shadow-sm"
          : "border-border/60 hover:border-border"
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-xl sm:px-5"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {index}
        </span>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
            {question}
          </p>
          {category && (
            <span className="mt-1.5 inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {category}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-0.5 shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
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
            <div className="border-t border-border/40 px-4 py-4 sm:px-5 sm:pl-[3.75rem]">
              <div className="text-sm leading-relaxed text-muted-foreground [&>p]:mb-0">
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
    <section className="not-prose mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquareText className="h-4 w-4 text-primary" />
          </span>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            Interview Questions
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {filtered.length}
            {activeTag && <span className="text-muted-foreground/60">/{questions.length}</span>}
          </span>
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ListCollapse className="h-3.5 w-3.5" />
          {allFilteredOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {tags.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150",
              activeTag === null
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            All
          </button>
          {tags.map(({ name, count }) => (
            <button
              key={name}
              onClick={() => setActiveTag(activeTag === name ? null : name)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150",
                activeTag === name
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {name}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
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
