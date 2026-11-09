// Rules for interview question answers written as MDX. Pure helpers with no React, so the question
// library loader (lib/question-bank.ts) and content-check can run them in plain Node. The compile step that
// turns an answer into React lives in components/mdx/question-answer.tsx.
//
// An answer may use Markdown (GFM tables, code fences, math) and these components only; any other JSX
// component is a content-check error. Mermaid fences are not pre-rendered for answers, so they are errors too.

/** JSX components allowed inside an answer, in both article <InterviewQuestion> bodies and YAML `a:` fields. */
export const ANSWER_COMPONENTS = ["AnimatedDiagram", "Callout", "Compare", "KeyIdea", "Tabs", "Tab"] as const;

export type AnswerComponent = (typeof ANSWER_COMPONENTS)[number];

const ALLOWED = new Set<string>(ANSWER_COMPONENTS);

// Fenced code blocks (``` or ~~~, any fence length) and inline code, so a `<Tag>` in code is not a component.
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\2[ \t]*$/gm;
const INLINE_CODE_RE = /`+[^`\n]*`+/g;
const JSX_TAG_RE = /<([A-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*)(?=[\s/>])/g;
const MERMAID_FENCE_RE = /^[ \t]*(?:`{3,}|~{3,})[ \t]*mermaid\b/m;

/** The source without code fences and inline code. */
function withoutCode(source: string): string {
  return source.replace(FENCE_RE, "").replace(INLINE_CODE_RE, "");
}

/** Distinct JSX component names (capitalised tags) used in an answer, in order of first use. Code is ignored. */
export function answerComponents(source: string): string[] {
  const names: string[] = [];
  for (const m of withoutCode(source).matchAll(JSX_TAG_RE)) if (!names.includes(m[1])) names.push(m[1]);
  return names;
}

/** Problems with an answer's MDX: components outside ANSWER_COMPONENTS and Mermaid fences. Empty when fine. */
export function checkAnswerMdx(source: string): string[] {
  const problems: string[] = [];
  for (const name of answerComponents(source)) {
    if (!ALLOWED.has(name)) {
      problems.push(`unknown component <${name}> in answer (allowed: ${ANSWER_COMPONENTS.join(", ")})`);
    }
  }
  if (MERMAID_FENCE_RE.test(source)) {
    problems.push("mermaid fences are not supported in answers; use <AnimatedDiagram> instead");
  }
  return problems;
}

interface ArticleQuestion {
  question: string;
  /** The raw `level` attribute; the caller checks it. */
  level?: string;
  /** Company names from `companies={["Meta", ...]}`; the caller resolves them against companies.yaml. */
  companies?: string[];
  /** The answer as MDX (see dedentAnswer). */
  answer: string;
}

const QUESTION_RE = /<InterviewQuestion\s+((?:[^>"]|"[^"]*")*)>([\s\S]*?)<\/InterviewQuestion>/g;

function attr(attrs: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
}

const COMPANIES_RE = /\bcompanies=\{\[([^\]]*)\]\}/;

/** The string literals of a `companies={["A", "B"]}` attribute, or undefined when there is none. */
function companiesAttr(attrs: string): string[] | undefined {
  const list = COMPANIES_RE.exec(attrs)?.[1];
  return list === undefined ? undefined : [...list.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
}

/** The <InterviewQuestion> blocks of an article body that have a `question` attribute, in order. */
export function extractInterviewQuestions(mdx: string): ArticleQuestion[] {
  const out: ArticleQuestion[] = [];
  for (const m of mdx.matchAll(QUESTION_RE)) {
    const question = attr(m[1], "question");
    if (!question) continue;
    const companies = companiesAttr(m[1]);
    out.push({ question, level: attr(m[1], "level"), answer: dedentAnswer(m[2]), ...(companies && { companies }) });
  }
  return out;
}

/**
 * The MDX of an <InterviewQuestion> body as the library stores it: leading and trailing blank lines dropped and
 * the common indentation removed, so bullets, tables and code fences keep their structure. Lines are never
 * joined, so the text compiles exactly like it does inside the article.
 */
function dedentAnswer(raw: string): string {
  const lines = raw
    .replace(/^(?:[ \t]*\r?\n)+/, "")
    .trimEnd()
    .split(/\r?\n/);
  const indents = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)![0].length);
  const indent = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(Math.min(indent, /^[ \t]*/.exec(l)![0].length)))
    .join("\n")
    .trim();
}
