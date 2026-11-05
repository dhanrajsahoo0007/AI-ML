import * as React from "react";
import { InterviewQuestions, InterviewQuestion } from "@/components/mdx/interview-qa";
import { getCompanies, type LibraryQuestion } from "@/lib/question-bank";

const SOURCE_URL =
  "https://github.com/pallavi-shekhar/ai-engineering-interview-questions-company-wise";

export function SourceCredit() {
  return (
    <p>
      Company-tagged questions are adapted from{" "}
      <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        AI Engineering Interview Questions Company Wise
      </a>{" "}
      by{" "}
      <a href="https://outcomeschool.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        Outcome School
      </a>{" "}
      (Apache 2.0), compiled from publicly reported interviews. Answers are written by Origins AI Learn.
      Company names and logos are trademarks of their owners and imply no affiliation.
    </p>
  );
}

function renderInline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, j) => {
    if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) return <code key={j}>{part.slice(1, -1)}</code>;
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**"))
      return <strong key={j} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    return <React.Fragment key={j}>{part}</React.Fragment>;
  });
}

// Answers are blocks separated by blank lines: paragraphs, "- " bullet lists or "1. " numbered
// lists, with `inline code` and **bold**.
function renderAnswer(text: string) {
  return text.trim().split(/\n\s*\n/).map((block, i) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => l.startsWith("- ")))
      return (
        <ul key={i} className="list-disc space-y-1 pl-5">
          {lines.map((l, j) => <li key={j}>{renderInline(l.slice(2))}</li>)}
        </ul>
      );
    if (lines.every((l) => /^\d+\. /.test(l)))
      return (
        <ol key={i} className="list-decimal space-y-1 pl-5">
          {lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\d+\. /, ""))}</li>)}
        </ol>
      );
    return <p key={i}>{renderInline(block)}</p>;
  });
}

// Library questions as <InterviewQuestion> elements; `tagOf` labels each one for the topic chips.
export function questionItems(questions: LibraryQuestion[], tagOf?: (q: LibraryQuestion) => string) {
  const companies = new Map(getCompanies().map((c) => [c.slug, { slug: c.slug, name: c.name }]));
  return questions.map((q) => (
    <InterviewQuestion
      key={q.id}
      question={q.q}
      category={tagOf?.(q)}
      level={q.level}
      companies={q.companies.map((slug) => companies.get(slug)!)}
      related={q.related}
      refs={q.refs}
    >
      {renderAnswer(q.a)}
    </InterviewQuestion>
  ));
}

// A filterable list of library questions.
export function QuestionList({
  questions,
  title,
  tagOf,
}: {
  questions: LibraryQuestion[];
  title: string;
  tagOf?: (q: LibraryQuestion) => string;
}) {
  if (questions.length === 0) return null;
  const credited = questions.some((q) => q.source === "outcome-school");
  return (
    <InterviewQuestions title={title} footer={credited ? <SourceCredit /> : undefined}>
      {questionItems(questions, tagOf)}
    </InterviewQuestions>
  );
}
