import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { getCategories, getQuestions, subsectionProblem, validateLibrary } from "./question-bank";

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

  it("files system-design subsections in the order and with the slugs of the curriculum plan", () => {
    const slugs = getCategories()
      .find((c) => c.slug === "distributed-systems-patterns")
      ?.subsections.map((s) => s.slug);
    for (const slug of [
      "fundamentals",
      "networking",
      "apis",
      "realtime-communication",
      "security",
      "database-foundations",
      "replication",
    ]) {
      expect(slugs).toContain(slug);
    }
  });

  it("stores every answer trimmed, with the file it comes from", () => {
    for (const q of getQuestions()) {
      expect(q.a, q.id).toBe(q.a.trim());
      expect(q.file, q.id).toMatch(/^question-bank\/.+\.yaml$|\.mdx$/);
    }
  });
});
