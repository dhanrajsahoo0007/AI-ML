import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CloudDecisionTree } from "@/components/cloud/cloud-decision-tree";
import { DECISION_TREES, SERVICE_BY_ID, type DecisionTree, type ProviderId } from "@/lib/cloud-catalog";

// Every tree behind <CloudDecisionTree topic="…" /> must be walkable: each branch ends on a question or a result,
// nothing is orphaned, and every result names something on all three clouds.

const PROVIDERS: ProviderId[] = ["aws", "gcp", "azure"];
const NEW_TOPICS = ["database", "storage", "connectivity", "load-balancer", "dr-strategy"];
const trees = Object.entries(DECISION_TREES);
/** An answer written like a catalog id ("aws-s3") must be one; anything else is a plain name. */
const looksLikeId = (s: string) => /^(aws|gcp|azure)-[a-z0-9-]+$/.test(s);

/** Ids reachable from the start, following every option. Throws on a loop. */
function reachable(tree: DecisionTree): Set<string> {
  const questions = new Map(tree.questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const walk = (id: string, trail: string[]) => {
    if (trail.includes(id)) throw new Error(`loop: ${[...trail, id].join(" > ")}`);
    seen.add(id);
    for (const option of questions.get(id)?.options ?? []) walk(option.next, [...trail, id]);
  };
  walk(tree.start, []);
  return seen;
}

describe("DECISION_TREES", () => {
  it("has the two original topics and the five cloud-neutral ones", () => {
    expect(Object.keys(DECISION_TREES).sort()).toEqual(["compute", "messaging", ...NEW_TOPICS].sort());
  });

  it.each(trees)("%s: ids are unique and the start is a question", (_topic, tree) => {
    const ids = [...tree.questions.map((q) => q.id), ...tree.results.map((r) => r.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(tree.questions.map((q) => q.id)).toContain(tree.start);
    expect(tree.title.trim()).not.toBe("");
  });

  it.each(trees)("%s: every branch resolves to a question or a result", (_topic, tree) => {
    const ids = new Set([...tree.questions.map((q) => q.id), ...tree.results.map((r) => r.id)]);
    for (const question of tree.questions) {
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(2);
      const labels = question.options.map((o) => o.label);
      // The component keys option buttons by label.
      expect(new Set(labels).size, question.id).toBe(labels.length);
      for (const option of question.options) expect(ids, `${question.id}: ${option.label}`).toContain(option.next);
    }
  });

  it.each(trees)("%s: no loops, and every question and result can be reached", (_topic, tree) => {
    const seen = reachable(tree);
    for (const question of tree.questions) expect(seen, question.id).toContain(question.id);
    for (const result of tree.results) expect(seen, result.id).toContain(result.id);
  });

  it.each(trees)("%s: every result answers for all three clouds, with real catalog ids", (_topic, tree) => {
    for (const result of tree.results) {
      expect(Object.keys(result.answer).sort(), result.id).toEqual([...PROVIDERS].sort());
      for (const provider of PROVIDERS) {
        const answers = result.answer[provider];
        expect(answers.length, `${result.id}/${provider}`).toBeGreaterThan(0);
        expect(new Set(answers).size, `${result.id}/${provider}`).toBe(answers.length);
        for (const answer of answers) {
          if (!looksLikeId(answer)) continue;
          expect(SERVICE_BY_ID[answer], `${result.id}/${provider}: ${answer}`).toBeDefined();
          expect(SERVICE_BY_ID[answer].provider, `${result.id}/${provider}: ${answer}`).toBe(provider);
        }
      }
      for (const s of [result.headline, result.why, result.tradeoff]) expect(s.trim(), result.id).not.toBe("");
    }
  });

  it.each(NEW_TOPICS)("%s: 3–5 questions, 4–7 results, and a headline that names no single vendor", (topic) => {
    const tree = DECISION_TREES[topic];
    expect(tree.questions.length).toBeGreaterThanOrEqual(3);
    expect(tree.questions.length).toBeLessThanOrEqual(5);
    expect(tree.results.length).toBeGreaterThanOrEqual(4);
    expect(tree.results.length).toBeLessThanOrEqual(7);
    for (const result of tree.results) expect(result.headline).not.toMatch(/\b(AWS|Amazon|Google|Azure|Microsoft)\b/);
  });
});

describe("<CloudDecisionTree>", () => {
  it.each(trees)("renders the first question of %s", (topic, tree) => {
    const html = renderToStaticMarkup(createElement(CloudDecisionTree, { topic }));
    const first = tree.questions.find((q) => q.id === tree.start)!;
    expect(html).not.toContain("Unknown decision tree");
    expect(html).toContain(tree.title);
    expect(html).toContain("Question 1");
    expect(html.match(/<button/g)).toHaveLength(first.options.length);
  });

  it("says so when the topic is unknown", () => {
    expect(renderToStaticMarkup(createElement(CloudDecisionTree, { topic: "nope" }))).toContain(
      "Unknown decision tree: nope"
    );
  });
});
