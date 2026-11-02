import * as React from "react";
import Link from "next/link";
import { InterviewQuestions, InterviewQuestion } from "@/components/mdx/interview-qa";
import {
  getCompany,
  getQuestions,
  TOPICS,
  type BankQuestion,
  type TopicKey,
} from "@/lib/question-bank";

const SOURCE_URL =
  "https://github.com/pallavi-shekhar/ai-engineering-interview-questions-company-wise";

export function SourceCredit() {
  return (
    <p>
      Questions adapted from{" "}
      <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        AI Engineering Interview Questions Company Wise
      </a>{" "}
      by{" "}
      <a href="https://outcomeschool.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        Outcome School
      </a>{" "}
      (Apache 2.0), compiled from publicly reported interviews. Answers are written by Origins AI Learn.
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

function QuestionList({
  questions,
  title,
  categoryOf,
}: {
  questions: BankQuestion[];
  title: string;
  categoryOf: (q: BankQuestion) => string | undefined;
}) {
  if (questions.length === 0) return null;
  return (
    <InterviewQuestions title={title} footer={<SourceCredit />}>
      {questions.map((q) => (
        <InterviewQuestion
          key={q.id}
          question={q.q}
          category={categoryOf(q)}
          level={q.level}
          companies={q.companies}
          related={q.related}
          refs={q.refs}
        >
          {renderAnswer(q.a)}
        </InterviewQuestion>
      ))}
    </InterviewQuestions>
  );
}

// Imported questions for one topic bank, filterable by company.
export function BankQuestions({ topic }: { topic: TopicKey }) {
  const questions = getQuestions({ topic });
  return (
    <QuestionList
      questions={questions}
      title="Asked at top AI companies"
      categoryOf={() => undefined}
    />
  );
}

// Every imported question tagged with a company, categorized by topic.
export function CompanyQuestions({ company }: { company: string }) {
  const c = getCompany(company);
  if (!c) throw new Error(`Unknown company: ${company}`);
  const questions = getQuestions({ company: c.name }).sort(
    (a, b) =>
      Object.keys(TOPICS).indexOf(a.topic) - Object.keys(TOPICS).indexOf(b.topic)
  );
  const topics = [...new Set(questions.map((q) => q.topic))];
  return (
    <>
      <p>
        Practice by topic:{" "}
        {topics.map((t, i) => (
          <React.Fragment key={t}>
            {i > 0 && " · "}
            <Link href={`/interviews/${TOPICS[t].bank}`}>{TOPICS[t].label}</Link>
          </React.Fragment>
        ))}
      </p>
      <QuestionList
        questions={questions}
        title={`Reported ${c.name} questions`}
        categoryOf={(q) => TOPICS[q.topic].label}
      />
    </>
  );
}

// Roles and interview loop summary for a company page.
export function CompanyOverview({ company }: { company: string }) {
  const c = getCompany(company);
  if (!c) throw new Error(`Unknown company: ${company}`);
  return (
    <>
      <p>
        <strong>Roles:</strong> {c.roles}
      </p>
      <p>
        <strong>Interview loop (as publicly reported):</strong> {c.loop}
      </p>
    </>
  );
}
