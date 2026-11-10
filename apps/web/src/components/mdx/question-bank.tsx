import Link from "next/link";
import { getIconComponent } from "@/lib/icons";
import { INTERVIEW_AREAS } from "@/lib/interview-areas";
import { InterviewQuestions, InterviewQuestion, type QuestionIcons } from "@/components/mdx/interview-qa";
import { AnswerBody } from "@/components/mdx/question-answer";
import { getCompanies, type LibraryQuestion, getCategories } from "@/lib/question-bank";

const SOURCE_URL = "https://github.com/pallavi-shekhar/ai-engineering-interview-questions-company-wise";

export function SourceCredit() {
  return (
    <p>
      Company-tagged questions are adapted from{" "}
      <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        AI Engineering Interview Questions Company Wise
      </a>{" "}
      by{" "}
      <a
        href="https://outcomeschool.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        Outcome School
      </a>{" "}
      (Apache 2.0), compiled from publicly reported interviews. Answers are written by TokensToScale. Company names and
      logos are trademarks of their owners and imply no affiliation.
    </p>
  );
}

// Stands in for a Pro answer on public pages (plan §9.1): the answer text is not in the page at all.
function LockedAnswer() {
  return (
    <p data-premium="answer" className="text-muted-foreground">
      This answer is part of Pro.{" "}
      <Link href="/pricing" className="text-primary underline underline-offset-2">
        See plans
      </Link>
    </p>
  );
}

// Library questions as <InterviewQuestion> elements; `tagOf` labels each one for the topic chips. Answers are
// MDX compiled by AnswerBody (components/mdx/question-answer.tsx). An answer for which `locked` is true is
// replaced by the Pro placeholder and is never compiled, so its text and diagrams are not in the page.
/** The icons a question list shows, rendered here on the server: one per area and one per topic title. */
export function questionIcons(): QuestionIcons {
  const icons: QuestionIcons = {};
  const add = (key: string, name: string) => {
    const Component = getIconComponent(name);
    if (Component) icons[key] = <Component aria-hidden />;
  };
  for (const area of INTERVIEW_AREAS) add(`area:${area.name}`, area.icon);
  for (const c of getCategories()) add(`topic:${c.title}`, c.icon);
  return icons;
}

export function questionItems(
  questions: LibraryQuestion[],
  tagOf?: (q: LibraryQuestion) => string,
  locked?: (q: LibraryQuestion) => boolean
) {
  // Every question carries its area (LLM, GenAI, System Design), shown on the question and used by the Area filter.
  const areas = new Map(getCategories().map((c) => [c.slug, c.group]));
  const companies = new Map(getCompanies().map((c) => [c.slug, { slug: c.slug, name: c.name }]));
  return questions.map((q) => (
    <InterviewQuestion
      key={q.id}
      question={q.q}
      category={tagOf?.(q)}
      area={areas.get(q.category)}
      level={q.level}
      companies={q.companies.map((slug) => companies.get(slug)!)}
      related={q.related}
      refs={q.refs}
    >
      {locked?.(q) ? <LockedAnswer /> : <AnswerBody question={q} />}
    </InterviewQuestion>
  ));
}

// A filterable list of library questions.
export function QuestionList({
  questions,
  title,
  tagOf,
  locked,
}: {
  questions: LibraryQuestion[];
  title: string;
  tagOf?: (q: LibraryQuestion) => string;
  locked?: (q: LibraryQuestion) => boolean;
}) {
  if (questions.length === 0) return null;
  const credited = questions.some((q) => q.source === "outcome-school");
  return (
    <InterviewQuestions title={title} footer={credited ? <SourceCredit /> : undefined} icons={questionIcons()}>
      {questionItems(questions, tagOf, locked)}
    </InterviewQuestions>
  );
}
