import { describe, expect, it } from "vitest";
import { lintSpec } from "@/components/diagrams/spec-lint";
import { ANIMATED_SPECS } from "@/components/diagrams/animated-specs";
import type { CloudRef, DiagramSpec } from "@/components/diagrams/types";

// lintSpec's cloud rule: a `cloud` ref on an architecture node must point at the cloud catalog, so the diagram's
// Services toggle and <CloudMapping> never show a name that leads nowhere.

const withCloud = (cloud: Partial<Record<"aws" | "gcp" | "azure", CloudRef>>): DiagramSpec => ({
  title: "One node",
  width: 400,
  height: 200,
  zones: [],
  nodes: [{ id: "queue", label: "Queue", x: 200, y: 100, cloud }],
  edges: [],
});

describe("lintSpec: cloud catalog ids", () => {
  it("passes catalog ids in the string form and the { label, id } form", () => {
    expect(lintSpec(withCloud({ aws: "aws-sqs", gcp: "gcp-pubsub", azure: "azure-service-bus" }))).toEqual([]);
    expect(lintSpec(withCloud({ aws: { id: "aws-elb", label: "NLB" } }))).toEqual([]);
  });

  it("passes a plain label with no id", () => {
    expect(lintSpec(withCloud({ gcp: { label: "Cloud NAT" }, azure: { label: "NAT Gateway" } }))).toEqual([]);
  });

  it("flags a string ref that is not a catalog id, and says how to write a plain name", () => {
    expect(lintSpec(withCloud({ aws: "aws-sqz" }))).toEqual([
      'node "queue": cloud.aws "aws-sqz" is not a cloud catalog id (for a plain name use { label: "aws-sqz" })',
    ]);
    expect(lintSpec(withCloud({ gcp: "Cloud NAT" }))).toEqual([
      'node "queue": cloud.gcp "Cloud NAT" is not a cloud catalog id (for a plain name use { label: "Cloud NAT" })',
    ]);
  });

  it("flags an unknown id in the { label, id } form", () => {
    expect(lintSpec(withCloud({ azure: { id: "azure-nope", label: "Something" } }))).toEqual([
      'node "queue": cloud.azure "azure-nope" is not a cloud catalog id',
    ]);
  });

  it("flags a service listed under another provider", () => {
    expect(lintSpec(withCloud({ aws: "gcp-pubsub" }))).toEqual([
      'node "queue": cloud.aws "gcp-pubsub" is a gcp service',
    ]);
  });

  it("passes every cloud ref in the shipped specs", () => {
    let refs = 0;
    for (const [id, spec] of Object.entries(ANIMATED_SPECS)) {
      if (spec.kind === "sequence" || spec.kind === "layout") continue;
      refs += spec.nodes.reduce((n, node) => n + Object.keys(node.cloud ?? {}).length, 0);
      expect(
        lintSpec(spec).filter((problem) => problem.includes("cloud.")),
        id
      ).toEqual([]);
    }
    // messenger/architecture alone maps more than a dozen nodes to three clouds.
    expect(refs).toBeGreaterThan(30);
  });
});
