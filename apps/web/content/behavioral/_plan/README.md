# Behavioral & Leadership: how the section is built

Section `/behavioral` (`apps/web/content/behavioral/`), with its questions in the `leadership` track of Interview
Practice (`apps/web/content/question-bank/`). This file is the template for its pages. It replaces the first plan
(a single nine-section template for every page), after the 2026-11 audit found the pages read-only, the diagrams
recycled and company claims unsourced.

## Principles

1. **The reader produces something on every page.** Each article has exactly one scored exercise (`SpotTheFlag`,
   `GuessTheLevel` or `WhichPrinciple`) and a "Build your own" link into the Story Builder. The heavier tools live
   in the Practice Lab hub (story builder, story matrix, mock loop, prep plans) and are linked, not embedded.
2. **Each page owns its main diagram.** A diagram is drawn for one page and used there. Do not reuse another
   page's diagram because it is roughly related.
3. **Company facts are sourced.** A statement about a company's process needs an official page or a named
   first-hand account in the page's `## Sources`. What cannot be sourced is dropped or written as "candidates
   commonly report". The research ledgers list the popular claims that have no source.
4. **Weak answers are shown, and examples are not all heroes.** Every concept page puts a weak answer beside the
   fixed one. Examples vary the role and the size of the result, and include modest wins and partial failures.
5. **Originality.** Everything is written in our own words with our own examples and numbers.

## Page shapes

**Concept or competency page:** In one sentence · The story · What the interviewer scores (own diagram) ·
`<PremiumBreak />` · A weak answer, then the fix · The same answer at three levels · Try it (the scored exercise)
· Build your own (link to the Story Builder with `?for=<competency>`) · Red flags (three or more) · Common
questions (optional `Quiz`) · Related · Sources.

**Company page:** In one sentence · The loop (timeline diagram, sourced facts only) · What they score ·
`<PremiumBreak />` · How the decision is made · The level bar · The company's values in a story · Try it ·
Worked answers · Red flags · Common questions about this round · Related · Sources.

The approved examples are `foundations/star-plus-l-framework.mdx` and `company-playbooks/meta-jedi-interview.mdx`.

## Questions

- Real interviewer prompts are in the bank YAML with `topics:` pointing at the page, so they list under the page
  ("Asked in interviews") and get practice mode. Each has `signals` (what it tests) and two or three follow-ups.
- Pages do not carry `<InterviewQuestion>` blocks. Candidate FAQs stay on the page as a `Quiz` titled "Common
  questions" and are not in the bank, so they never get a company tag.
- A company tag needs two independent reports or one detailed first-hand report from 2023 or later.

## Rules that the checks enforce

No em dash anywhere in this folder (`scripts/content-check.ts`). At most two widgets per page; the scored
exercises and `DecisionTree` count. Do not change the id of a published question: practice ratings are keyed by it.
