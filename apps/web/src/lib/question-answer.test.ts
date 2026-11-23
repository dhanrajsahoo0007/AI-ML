import { describe, expect, it } from "vitest";
import {
  ANSWER_COMPONENTS,
  answerComponents,
  checkAnswerMdx,
  extractInterviewQuestions,
  hasInterviewQuestions,
} from "./question-answer";

describe("answerComponents", () => {
  it("lists capitalised JSX tags once each, in order", () => {
    const src = `Text.\n\n<AnimatedDiagram name="messenger/architecture" highlight={["chat"]} />\n\n<Callout title="x">a</Callout>\n<AnimatedDiagram name="y" />`;
    expect(answerComponents(src)).toEqual(["AnimatedDiagram", "Callout"]);
  });

  it("ignores lowercase HTML tags, comparisons and tags inside code", () => {
    const src = [
      "Latency < 100 ms and a <br /> break.",
      "Inline `<Widget />` code.",
      "```tsx",
      "<Chart data={x} />",
      "```",
      "~~~",
      "<Other />",
      "~~~",
    ].join("\n");
    expect(answerComponents(src)).toEqual([]);
  });

  it("sees member expressions as one component", () => {
    expect(answerComponents("<Foo.Bar />")).toEqual(["Foo.Bar"]);
  });
});

describe("checkAnswerMdx", () => {
  it("accepts plain text, bullets, tables, code and every allowed component", () => {
    const src = [
      "**Short answer.** Use a cache.",
      "",
      "- one",
      "- two",
      "",
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "```python",
      "print(1)",
      "```",
      "",
      ...ANSWER_COMPONENTS.map((c) => `<${c} />`),
    ].join("\n");
    expect(checkAnswerMdx(src)).toEqual([]);
  });

  it("reports a component outside the allowed list, with the list", () => {
    const problems = checkAnswerMdx("<DatabasePicker />");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("<DatabasePicker>");
    expect(problems[0]).toContain("AnimatedDiagram");
  });

  it("reports a mermaid fence", () => {
    expect(checkAnswerMdx("```mermaid\ngraph TD; a-->b\n```")).toEqual([
      expect.stringContaining("mermaid fences are not supported"),
    ]);
  });
});

const wrap = (body: string, attrs = 'question="Why?" level="Mid"') =>
  `<InterviewQuestions>\n  <InterviewQuestion ${attrs}>${body}</InterviewQuestion>\n</InterviewQuestions>`;

describe("extractInterviewQuestions", () => {
  it("reads the question and level attributes and every block in order", () => {
    const mdx = [
      wrap("\n    First.\n  "),
      wrap("\n    Second.\n  ", 'level="Senior" question="Say \'hi\' > 2?" category="X"'),
    ].join("\n");
    expect(extractInterviewQuestions(mdx)).toEqual([
      { question: "Why?", level: "Mid", answer: "First." },
      { question: "Say 'hi' > 2?", level: "Senior", answer: "Second." },
    ]);
  });

  it("skips blocks without a question attribute", () => {
    expect(extractInterviewQuestions(wrap("Text", 'level="Mid"'))).toEqual([]);
  });

  it("drops the common indentation and surrounding blank lines but keeps line breaks", () => {
    const raw = "\n    **Short answer.** Yes.\n\n    - one\n    - two\n\n    ```js\n    const x = 1;\n    ```\n  ";
    expect(extractInterviewQuestions(wrap(raw))[0].answer).toBe(
      "**Short answer.** Yes.\n\n- one\n- two\n\n```js\nconst x = 1;\n```"
    );
  });

  it("keeps deeper indentation relative to the shallowest line", () => {
    expect(extractInterviewQuestions(wrap("\n  - a\n    - nested\n"))[0].answer).toBe("- a\n  - nested");
  });

  it("reads company names from a companies={[...]} attribute", () => {
    const [q] = extractInterviewQuestions(wrap("A.", `question="Why?" level="Mid" companies={["Meta", 'Uber']}`));
    expect(q.companies).toEqual(["Meta", "Uber"]);
    expect(extractInterviewQuestions(wrap("A."))[0].companies).toBeUndefined();
  });

  it("handles text that starts on the opening tag's line", () => {
    expect(extractInterviewQuestions(wrap("First line.\n    Second line.\n  "))[0].answer).toBe(
      "First line.\n    Second line."
    );
  });

  it("keeps a diagram component in the answer", () => {
    const body = '\n    Text.\n\n    <AnimatedDiagram name="messenger/architecture" highlight={["chat"]} />\n  ';
    expect(extractInterviewQuestions(wrap(body))[0].answer).toBe(
      'Text.\n\n<AnimatedDiagram name="messenger/architecture" highlight={["chat"]} />'
    );
  });
});

// content-check uses this to find articles that hold questions but are missing from articles.yaml. It used to
// look for the tag followed by a space, so pages that put each attribute on its own line were never flagged.
describe("hasInterviewQuestions", () => {
  it("finds a block whose attributes start on the next line", () => {
    const src = `<InterviewQuestions>\n  <InterviewQuestion\n    question="Q?"\n    level="Mid"\n  >\n    A.\n  </InterviewQuestion>\n</InterviewQuestions>`;
    expect(hasInterviewQuestions(src)).toBe(true);
    expect(extractInterviewQuestions(src)).toHaveLength(1);
  });

  it("finds a block written on one line", () => {
    expect(hasInterviewQuestions(`<InterviewQuestion question="Q?">A.</InterviewQuestion>`)).toBe(true);
  });

  it("does not count the wrapper on its own", () => {
    expect(hasInterviewQuestions("<InterviewQuestions>\n</InterviewQuestions>")).toBe(false);
    expect(hasInterviewQuestions("No questions here.")).toBe(false);
  });
});
