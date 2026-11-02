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

// Answers are plain paragraphs separated by blank lines, with `inline code`.
function renderAnswer(text: string) {
  return text.split(/\n\s*\n/).map((para, i) => (
    <p key={i}>
      {para.split(/(`[^`]+`)/g).map((part, j) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={j}>{part.slice(1, -1)}</code>
        ) : (
          <React.Fragment key={j}>{part}</React.Fragment>
        )
      )}
    </p>
  ));
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
