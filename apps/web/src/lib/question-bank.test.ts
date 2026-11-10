import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { interviewRedirects, SPLIT_SUBSECTIONS } from "@/features/interviews/redirects";
import {
  getCategories,
  getQuestions,
  getQuestionsForTopic,
  parseYamlQuestions,
  subsectionProblem,
  validateLibrary,
  type RawQuestion,
} from "./question-bank";

describe("subsectionProblem", () => {
  it("accepts slug, title and description strings", () => {
    expect(subsectionProblem({ slug: "apis", title: "APIs", description: "REST, gRPC and webhooks." })).toBeNull();
  });

  it("reports an unquoted comma in a flow mapping, which splits the description into extra keys", () => {
    const [parsed] = yaml.load("- { slug: apis, title: APIs, description: REST, gRPC and webhooks. }") as unknown[];
    expect(subsectionProblem(parsed)).toMatch(/quote values that contain commas/);
  });

  it("reports a missing title", () => {
    expect(subsectionProblem({ slug: "apis", description: "x" })).not.toBeNull();
  });
});

describe("the question library (real content)", () => {
  it("validates, including every answer's MDX components", () => {
    expect(validateLibrary()).toEqual([]);
  });

  it("splits system design into four categories of the system-design track, each with its subsections", () => {
    const sd = getCategories().filter((c) => c.track === "design");
    expect(sd.map((c) => c.slug)).toEqual([
      "system-design-questions",
      "system-design-fundamentals",
      "system-design-databases",
      "system-design-patterns",
    ]);
    const subs = (slug: string) => sd.find((c) => c.slug === slug)!.subsections.map((s) => s.slug);
    expect(subs("system-design-fundamentals")).toEqual([
      "fundamentals",
      "networking",
      "apis",
      "realtime-communication",
      "security",
    ]);
    expect(subs("system-design-databases")).toContain("partitioning");
    expect(subs("system-design-questions")).toContain("messaging-realtime");
  });

  it("gives every category a track, and keeps the tracks apart", () => {
    const all = getQuestions().length;
    const ai = getQuestions({ track: "ai" });
    const sd = getQuestions({ track: "design" });
    expect(ai.length + sd.length).toBe(all);
    expect(sd.length).toBeGreaterThan(0);
    expect(sd.every((q) => q.category.startsWith("system-design-"))).toBe(true);
    expect(ai.some((q) => q.category.startsWith("system-design-"))).toBe(false);
  });

  it("redirects every old distributed-systems-patterns URL to a page that exists", () => {
    const pages = new Set(getCategories().flatMap((c) => [c.slug, ...c.subsections.map((s) => `${c.slug}/${s.slug}`)]));
    expect(getCategories().some((c) => c.slug === "distributed-systems-patterns")).toBe(false);
    for (const to of Object.values(SPLIT_SUBSECTIONS)) expect(pages, to).toContain(to);
    const sources = interviewRedirects().map((r) => r.source);
    expect(sources).toContain("/interviews/distributed-systems-patterns");
    expect(sources).toContain("/interviews/distributed-systems-patterns/fundamentals");
    expect(interviewRedirects().every((r) => r.permanent)).toBe(true);
  });

  it("stores every answer trimmed, with the file it comes from", () => {
    for (const q of getQuestions()) {
      expect(q.a, q.id).toBe(q.a.trim());
      expect(q.file, q.id).toMatch(/^question-bank\/.+\.yaml$|\.mdx$/);
    }
  });
});

// Topics and follow-ups, on entries shaped like a library YAML file.
describe("parseYamlQuestions", () => {
  const CACHING = "/system-design/patterns/caching";
  const MESSENGER = "/system-design/case-studies/facebook-messenger";
  const categories = new Map([
    ["sd", { track: "design" as const, subsections: [{ slug: "chat", title: "Chat", description: "x" }] }],
    ["ai", { track: "ai" as const, subsections: [{ slug: "rag", title: "RAG", description: "x" }] }],
  ]);
  const companies = new Map([["Meta", "meta"]]);
  const base: RawQuestion = {
    id: "design-chat",
    q: "Design a chat app",
    a: "Use WebSockets.",
    level: "Senior",
    category: "sd",
    subcategory: "chat",
    topics: [MESSENGER, CACHING],
  };
  const parse = (entry: RawQuestion, file = "sd.yaml") => {
    const errors: string[] = [];
    return { questions: parseYamlQuestions(file, [entry], categories, companies, errors), errors };
  };

  it("resolves topics and uses the first as the deep-dive link", () => {
    const { questions, errors } = parse(base);
    expect(errors).toEqual([]);
    expect(questions[0].topics.map((t) => t.href)).toEqual([MESSENGER, CACHING]);
    expect(questions[0].related?.href).toBe(MESSENGER);
    expect(questions[0].topics[0].title).not.toBe(MESSENGER);
  });

  it("rejects a topic that is not a page, and a repeated topic", () => {
    expect(parse({ ...base, topics: ["/system-design/patterns/nope"] }).errors.join()).toMatch(/topic page not found/);
    expect(parse({ ...base, topics: [CACHING, CACHING] }).errors.join()).toMatch(/duplicate topic/);
    expect(parse({ ...base, topics: CACHING }).errors.join()).toMatch(/topics must be a list/);
  });

  it("requires a topic on a system design question but not on an AI one", () => {
    expect(parse({ ...base, topics: undefined }).errors.join()).toMatch(/needs at least one topic/);
    const ai = parse({ ...base, category: "ai", subcategory: "rag", topics: undefined }, "ai.yaml");
    expect(ai.errors).toEqual([]);
  });

  it("returns follow-ups as questions of their own, after the parent, with ids from the parent", () => {
    const { questions, errors } = parse({
      ...base,
      followUps: [
        { q: "How do you order messages?", a: "Per-conversation sequence numbers.", level: "Mid", companies: ["Meta"] },
        { q: "What do you cache?", a: "Recent messages.", level: "Senior", topics: [CACHING] },
      ],
    });
    expect(errors).toEqual([]);
    expect(questions.map((q) => q.id)).toEqual([
      "design-chat",
      "design-chat--how-do-you-order-messages",
      "design-chat--what-do-you-cache",
    ]);
    const [parent, first, second] = questions;
    expect(parent.followUps).toEqual([first, second]);
    expect(first.parent).toEqual({ id: "design-chat", q: "Design a chat app" });
    expect(first.companies).toEqual(["meta"]);
    expect(first.category).toBe("sd");
    expect(first.subcategory).toBe("chat");
    // No topic of its own: the link is the parent's main topic. With one: its own.
    expect(first.related?.href).toBe(MESSENGER);
    expect(second.related?.href).toBe(CACHING);
  });

  it("allows one level of follow-ups only, and checks each follow-up like a question", () => {
    const nested = parse({
      ...base,
      followUps: [{ q: "Why?", a: "Because.", level: "Mid", followUps: [{ q: "And?", a: "So.", level: "Mid" }] }],
    });
    expect(nested.errors.join()).toMatch(/a follow-up cannot have followUps/);
    const bad = parse({ ...base, followUps: [{ q: "Why?", level: "Expert", companies: ["Nope"] }] });
    expect(bad.errors.join("\n")).toMatch(/design-chat--why: missing a/);
    expect(bad.errors.join("\n")).toMatch(/bad level Expert/);
    expect(bad.errors.join("\n")).toMatch(/unknown company Nope/);
    expect(parse({ ...base, followUps: "x" }).errors.join()).toMatch(/followUps must be a list/);
  });
});

describe("getQuestionsForTopic", () => {
  it("returns nothing for a page no library question is tagged to", () => {
    expect(getQuestionsForTopic("/system-design/nope")).toEqual([]);
  });

  it("returns only questions tagged to the page, never a follow-up whose parent is already in the list", () => {
    for (const q of getQuestions().filter((x) => x.topics.length > 0)) {
      const list = getQuestionsForTopic(q.topics[0].href);
      const ids = new Set(list.map((x) => x.id));
      expect(list.every((x) => x.topics.some((t) => t.href === q.topics[0].href))).toBe(true);
      expect(list.every((x) => !x.parent || !ids.has(x.parent.id))).toBe(true);
    }
  });
});
