import * as React from "react";
import { z } from "zod";
import { getCategories, getCompanies, getQuestions, getSignals } from "@/lib/question-bank";
import type { MockQuestion } from "@/lib/mock-loop";
import { MockLoopClient, PrepChecklistClient, StoryBuilderClient, StoryMatrixClient } from "./lazy.client";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Server wrappers for the Practice Lab tools. They read what the tools need from the question bank on the
// server (the list of competencies, the prompts for a mock loop) and hand it to lazy client islands.
// Answers are never passed to an island. Usage in MDX: <StoryBuilder />, <StoryMatrix builder="/…" />, <MockLoop />,
// <PrepChecklist id="two-week-plan" title="Two-week plan" groups={[{ title: "Week 1", items: [...] }]} />.

/** The family of signals shown as the default "what a story covers" list. */
const COMPETENCIES = "Competencies";

const noProps = z.object({}).strict();
const slim = (s: { slug: string; title: string }) => ({ slug: s.slug, title: s.title });

export function StoryBuilder(props: z.input<typeof noProps>) {
  const parsed = parseProps("StoryBuilder", noProps, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const competencies = getSignals()
    .filter((s) => s.group === COMPETENCIES)
    .map(slim);
  return <StoryBuilderClient competencies={competencies} />;
}

/** `builder`: the page that holds <StoryBuilder />, linked from the matrix while the reader has no stories. */
const storyMatrixSchema = z.object({ builder: z.string().startsWith("/") }).strict();

export function StoryMatrix(props: z.input<typeof storyMatrixSchema>) {
  const parsed = parseProps("StoryMatrix", storyMatrixSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  // One view per family of signals, the competencies first.
  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const s of getSignals()) groups.set(s.group, [...(groups.get(s.group) ?? []), slim(s)]);
  const views = [...groups.entries()]
    .sort(([a], [b]) => Number(b === COMPETENCIES) - Number(a === COMPETENCIES))
    .map(([label, signals]) => ({ key: label, label, signals }));
  return <StoryMatrixClient views={views} builderHref={parsed.data.builder} />;
}

/** A company is offered in the mock loop once the bank has this many prompts tagged to it. */
const MIN_COMPANY_PROMPTS = 3;

export function MockLoop(props: z.input<typeof noProps>) {
  const parsed = parseProps("MockLoop", noProps, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const leadership = new Set(
    getCategories()
      .filter((c) => c.track === "leadership")
      .map((c) => c.slug)
  );
  // Interviewer prompts only: questions written in the bank files (article FAQs are not prompts), top level.
  const questions: MockQuestion[] = getQuestions()
    .filter((q) => leadership.has(q.category) && !q.parent && q.source !== "article")
    .map((q) => ({
      id: q.id,
      q: q.q,
      ...(q.level ? { level: q.level } : {}),
      companies: q.companies,
      signals: q.signals,
      area: `${q.category}/${q.subcategory}`,
      followUps: q.followUps.map((f) => f.q),
    }));
  const count = new Map<string, number>();
  for (const q of questions) for (const slug of q.companies) count.set(slug, (count.get(slug) ?? 0) + 1);
  const companies = getCompanies()
    .filter((c) => (count.get(c.slug) ?? 0) >= MIN_COMPANY_PROMPTS)
    .map((c) => ({ slug: c.slug, name: c.name }));
  const signals = Object.fromEntries(getSignals().map((s) => [s.slug, s.title]));
  return <MockLoopClient questions={questions} companies={companies} signals={signals} />;
}

const itemId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase letters, digits and dashes");

const prepChecklistSchema = z
  .object({
    /** Names the list in the browser's storage. Do not change it once the page is published. */
    id: itemId,
    title: z.string().min(1),
    groups: z
      .array(
        z
          .object({
            title: z.string().min(1),
            items: z
              .array(
                z.object({ id: itemId, text: z.string().min(1), href: z.string().startsWith("/").optional() }).strict()
              )
              .min(1)
              .max(20),
          })
          .strict()
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine(
    (p) => {
      const ids = p.groups.flatMap((g) => g.items.map((i) => i.id));
      return new Set(ids).size === ids.length;
    },
    { message: "items: every `id` must be different across the whole list" }
  );

export function PrepChecklist(props: z.input<typeof prepChecklistSchema>) {
  const parsed = parseProps("PrepChecklist", prepChecklistSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  return <PrepChecklistClient {...parsed.data} />;
}
