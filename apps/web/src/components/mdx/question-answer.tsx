import "server-only";
import * as React from "react";
import type { ReactElement } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Root as MdastRoot } from "mdast";
import { Diagram } from "@/components/diagrams/diagram";
import { Callout } from "@/components/db/callouts";
import { Compare, KeyIdea, Tabs, Tab } from "@/components/teach";
import { KatexStyles } from "@/components/article/katex-styles";
import { cn } from "@/lib/utils";
import { checkAnswerMdx, type AnswerComponent } from "@/lib/question-answer";
import type { LibraryQuestion } from "@/lib/question-bank";

// Compiles an interview question answer written as MDX (plan §6.2) for the question library pages
// (/interviews category and subsection pages, /companies). Article pages compile the same text as part of
// the article with the full component map; here the map is restricted to ANSWER_COMPONENTS
// (lib/question-answer.ts) plus GFM tables, code fences and math. Build time only: pages are prerendered.
//
// Math: article answers keep the article's syntax ($x$ inline, $$x$$ display), so they render the same in both
// places. YAML answers turn single-dollar math off, so prices like "$2.50/hour" stay text; they write $$x$$.
//
// A locked (Pro) answer must never reach this module: question-bank.tsx renders LockedAnswer instead of
// <AnswerBody>, so the answer text is not compiled into the public variant at all.

type Props = Record<string, unknown> & { children?: React.ReactNode };

// Flow components come with article margins (my-8, my-10, negative margins at xl); inside an answer they sit
// in a narrow panel, so they are wrapped and their outer margins reset.
function Block({ children }: { children: React.ReactNode }) {
  return <div className="[&>*]:mx-0 [&>*]:my-3">{children}</div>;
}

// Same look the hand-written answer renderer had: paragraphs, disc/decimal lists, bold in ink.
const elements = {
  p: (props: Props) => <p {...props} />,
  ul: (props: Props) => <ul {...props} className="list-disc space-y-1 pl-5" />,
  ol: (props: Props) => <ol {...props} className="list-decimal space-y-1 pl-5" />,
  strong: (props: Props) => <strong {...props} className="font-semibold text-ink" />,
  a: (props: Props) => <a {...props} className="text-primary underline underline-offset-2" />,
  // Inline code; inside a fenced block the <pre> below resets the pill styling.
  code: ({ className, ...props }: Props & { className?: string }) => (
    <code
      {...props}
      className={cn(
        "rounded-[3px] bg-paper-2 px-[0.35em] py-[0.1em] font-mono text-[0.875em] [font-variant-ligatures:none]",
        className
      )}
    />
  ),
  pre: (props: Props) => (
    <pre
      {...props}
      className="overflow-x-auto rounded-lg border border-hairline bg-paper-2 p-4 font-mono text-[13px] leading-relaxed [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[1em]"
    />
  ),
  blockquote: (props: Props) => <blockquote {...props} className="border-l-2 border-primary/60 pl-4 text-ink-2" />,
  hr: () => <hr className="border-hairline" />,
  table: (props: Props) => (
    <div className="overflow-x-auto">
      <table {...props} className="w-full border-collapse text-sm" />
    </div>
  ),
  th: (props: Props) => (
    <th
      {...props}
      className="border-b border-ink py-2 pr-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
    />
  ),
  td: (props: Props) => <td {...props} className="border-b border-hairline py-2 pr-3 align-top" />,
};

// Headings would break the page outline from inside a <details> answer, so they render as bold lead-ins.
const heading = (props: Props) => <p {...props} className="font-display font-semibold text-ink" />;

// The JSX components an answer may use. `satisfies` keeps this map and ANSWER_COMPONENTS in step: a component
// the check allows must render here, and nothing else is in the map.
const allowedComponents = {
  AnimatedDiagram: (props: React.ComponentProps<typeof Diagram>) => (
    <Block>
      <Diagram {...props} />
    </Block>
  ),
  Callout: (props: React.ComponentProps<typeof Callout>) => (
    <Block>
      <Callout {...props} />
    </Block>
  ),
  Compare: (props: React.ComponentProps<typeof Compare>) => (
    <Block>
      <Compare {...props} />
    </Block>
  ),
  KeyIdea: (props: React.ComponentProps<typeof KeyIdea>) => (
    <Block>
      <KeyIdea {...props} />
    </Block>
  ),
  Tabs: (props: React.ComponentProps<typeof Tabs>) => (
    <Block>
      <Tabs {...props} />
    </Block>
  ),
  Tab,
} satisfies Record<AnswerComponent, unknown>;

const components = {
  ...elements,
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
  ...allowedComponents,
};

// Records whether the answer has any math, so the KaTeX stylesheet is only loaded where it is needed.
function remarkDetectMath(flags: { math: boolean }) {
  return (tree: MdastRoot) => {
    const visit = (node: { type: string; children?: unknown[] }): boolean =>
      node.type === "math" || node.type === "inlineMath" || (node.children ?? []).some((c) => visit(c as typeof node));
    flags.math = visit(tree);
  };
}

interface CompileOptions {
  /** `$x$` is inline math (article answers). Off: only `$$x$$` is math (YAML answers). */
  singleDollarMath?: boolean;
}

// The same answer renders on up to three pages (category, subsection, companies); compile it once per build.
const compiled = new Map<string, Promise<ReactElement>>();

/**
 * Compiles one answer. `where` names the question (file and id) in errors. Rejects when the answer uses a
 * component outside ANSWER_COMPONENTS (content-check reports the same problem before the build).
 */
export function compileAnswer(source: string, where: string, options: CompileOptions = {}): Promise<ReactElement> {
  const singleDollarMath = options.singleDollarMath ?? false;
  const key = `${singleDollarMath ? 1 : 0}${source}`;
  let hit = compiled.get(key);
  if (!hit) {
    hit = compile(source, where, singleDollarMath);
    compiled.set(key, hit);
  }
  return hit;
}

async function compile(source: string, where: string, singleDollarMath: boolean): Promise<ReactElement> {
  const problems = checkAnswerMdx(source);
  if (problems.length) throw new Error(`${where}: ${problems.join("; ")}`);
  const flags = { math: false };
  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: singleDollarMath }], [remarkDetectMath, flags]],
        rehypePlugins: [rehypeKatex],
      },
    },
    components,
  });
  if (!flags.math) return content;
  return (
    <>
      <KatexStyles />
      {content}
    </>
  );
}

/**
 * The compiled answer of a library question (async server component). Render it only for an unlocked answer:
 * the locked path renders LockedAnswer and never calls this.
 */
export async function AnswerBody({ question }: { question: LibraryQuestion }) {
  return compileAnswer(question.a, `${question.file} ${question.id}`, {
    singleDollarMath: question.source === "article",
  });
}
