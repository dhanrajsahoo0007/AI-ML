import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderHtml } from "../../../tests/unit/render-html";
import { describe, expect, it } from "vitest";
import type { LibraryQuestion } from "@/lib/question-bank";
import { questionItems } from "./question-bank";
import { AnswerBody, compileAnswer } from "./question-answer";

// A premium answer with a diagram (plan §6.2). The locked path must not compile it: neither the answer text
// nor the diagram SVG may be in the rendered markup. The e2e leak suite checks the same on built pages when a
// premium interview category exists (tests/e2e/leak.spec.ts).

const SECRET = "Fan-out on write keeps the inbox hot for every recipient";
const fixture: LibraryQuestion = {
  id: "premium-diagram-fixture",
  q: "How does Messenger deliver a message to an online user?",
  a: `**Short answer.** ${SECRET}.\n\n<AnimatedDiagram name="messenger/architecture" highlight={["chat"]} />`,
  file: "question-bank/fixture.yaml",
  level: "Senior",
  category: "fixture",
  subcategory: "fixture",
  companies: [],
  refs: [],
  source: "original",
};

const answerOf = (item: ReactElement) => (item.props as { children: ReactNode }).children;

describe("questionItems", () => {
  it("compiles the fixture answer when unlocked, so the locked check below is meaningful", async () => {
    const [item] = questionItems([fixture]);
    const answer = answerOf(item);
    expect(isValidElement(answer) && answer.type).toBe(AnswerBody);
    const html = await renderHtml(await compileAnswer(fixture.a, fixture.id));
    expect(html).toContain(SECRET);
    expect(html).toContain("<svg");
  });

  it("renders a locked answer as the Pro placeholder without its text or diagram", async () => {
    const [item] = questionItems([fixture], undefined, () => true);
    const answer = answerOf(item);
    expect(isValidElement(answer) && answer.type).not.toBe(AnswerBody);
    const html = await renderHtml(answer);
    expect(html).toContain('data-premium="answer"');
    expect(html).not.toContain(SECRET);
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("messenger");
    expect(JSON.stringify(item.props, (k, v) => (k === "_owner" ? undefined : v))).not.toContain(SECRET);
  });
});
