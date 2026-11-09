import "server-only";
import React from "react";
import type { CompanyTag } from "@/components/company-logo";
import { getCompanies } from "@/lib/question-bank";
import { InterviewQuestions } from "@/components/mdx/interview-qa";

type Props = React.ComponentProps<typeof InterviewQuestions>;

// <InterviewQuestions> as article MDX uses it. Authors tag a question with company names from
// content/companies/companies.yaml (`companies={["Meta"]}`), but the list renders company tags ({ slug, name }).
// This server wrapper resolves the names before handing the questions on. Unknown names are also reported by
// content-check (the question library validates article questions), so the throw here is a last line of defence.
export function ArticleInterviewQuestions({ children, ...props }: Props) {
  const byName = new Map(getCompanies().map((c) => [c.name, { slug: c.slug, name: c.name }]));
  const resolve = (company: unknown, question: string): CompanyTag => {
    if (typeof company !== "string") return company as CompanyTag;
    const tag = byName.get(company);
    if (!tag) throw new Error(`<InterviewQuestion question="${question}">: unknown company "${company}"`);
    return tag;
  };
  const questions = React.Children.map(children, (child) => {
    if (!React.isValidElement<{ question?: string; companies?: unknown }>(child)) return child;
    const { companies, question = "" } = child.props;
    if (!Array.isArray(companies)) return child;
    return React.cloneElement(child, { companies: companies.map((c) => resolve(c, question)) });
  });
  return <InterviewQuestions {...props}>{questions}</InterviewQuestions>;
}
