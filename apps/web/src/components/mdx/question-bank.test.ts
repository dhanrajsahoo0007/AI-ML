import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderHtml } from "../../../tests/unit/render-html";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LibraryQuestion } from "@/lib/question-bank";
import { InterviewQuestions } from "./interview-qa";
import { questionItems, TopicQuestions } from "./question-bank";
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
  topics: [],
  refs: [],
  source: "original",
  followUps: [],
};

// A design question with one follow-up, as the loader returns them: the follow-up nested and also in the flat list.
const FOLLOW_SECRET = "Sequence numbers per conversation give a total order";
const followUp: LibraryQuestion = {
  ...fixture,
  id: "design-chat--how-do-you-order-messages",
  q: "How do you keep messages in order?",
  a: `${FOLLOW_SECRET}.`,
  level: "Mid",
  topics: [{ href: "/system-design/fundamentals/websockets", title: "WebSockets" }],
  parent: { id: "design-chat", q: "Design a chat app" },
};
const parent: LibraryQuestion = {
  ...fixture,
  id: "design-chat",
  q: "Design a chat app",
  topics: [
    { href: "/system-design/case-studies/facebook-messenger", title: "Design Facebook Messenger" },
    { href: "/system-design/patterns/caching", title: "Caching" },
  ],
  followUps: [followUp],
};

const topicQuestions = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("@/lib/question-bank", async (original) => ({
  ...(await original<typeof import("@/lib/question-bank")>()),
  getQuestionsForTopic: () => topicQuestions.list,
}));

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

describe("follow-ups", () => {
  const listHtml = (questions: LibraryQuestion[], locked?: () => boolean) =>
    renderHtml(createElement(InterviewQuestions, null, questionItems(questions, undefined, locked)));

  it("nests a follow-up under its question and counts both", async () => {
    const items = questionItems([parent, followUp]);
    expect(items).toHaveLength(1);
    const html = await listHtml([parent, followUp]);
    expect(html.match(/data-qa-item/g)).toHaveLength(1);
    expect(html).toContain('data-qa-weight="2"');
    expect(html).toMatch(/data-qa-count="true">2</);
    expect(html).toContain("Interviewers then ask");
    expect(html.match(/data-qa-followup="true"/g)).toHaveLength(1);
    expect(html).toContain(FOLLOW_SECRET);
    expect(html).not.toContain("Follow-up to:");
  });

  it("lists a question's topics in place of the single deep-dive link", async () => {
    const html = await listHtml([parent]);
    expect(html.replaceAll("<!-- -->", "")).toContain("Topics: ");
    expect(html).toContain('href="/system-design/patterns/caching"');
    expect(html).not.toContain("Deep-dive");
  });

  it("names the question when a follow-up is listed on its own", async () => {
    const html = await listHtml([followUp]);
    expect(html.replaceAll("<!-- -->", "")).toContain("Follow-up to: Design a chat app");
    expect(html).toContain('data-qa-weight="1"');
  });

  it("locks the follow-up answers with the question's", async () => {
    const html = await listHtml([parent, followUp], () => true);
    expect(html.match(/data-premium="answer"/g)).toHaveLength(2);
    expect(html).not.toContain(FOLLOW_SECRET);
    expect(html).not.toContain(SECRET);
  });
});

describe("TopicQuestions", () => {
  it("renders nothing for a page with no tagged question", async () => {
    topicQuestions.list = [];
    expect(await renderHtml(createElement(TopicQuestions, { href: "/system-design/patterns/caching" }))).toBe("");
  });

  it("lists the tagged questions under 'Asked in interviews', locked where asked", async () => {
    topicQuestions.list = [parent];
    const open = await renderHtml(createElement(TopicQuestions, { href: "/system-design/patterns/caching" }));
    expect(open).toContain("Asked in interviews");
    expect(open).toContain("Design a chat app");
    expect(open).toContain(SECRET);
    const locked = await renderHtml(
      createElement(TopicQuestions, { href: "/system-design/patterns/caching", locked: () => true })
    );
    expect(locked).toContain("Design a chat app");
    expect(locked).not.toContain(SECRET);
    expect(locked).not.toContain(FOLLOW_SECRET);
  });
});
