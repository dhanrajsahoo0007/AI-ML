import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

// CI trust boundaries (security review M4, M5). actionlint checks syntax; this checks who gets which secret.

const dir = path.resolve(__dirname, "../../../../.github/workflows");
type Step = { uses?: string; run?: string; with?: Record<string, unknown>; env?: Record<string, string> };
type Job = { if?: string; environment?: unknown; permissions?: unknown; steps?: Step[]; env?: Record<string, string> };
type Workflow = { on: Record<string, unknown>; jobs: Record<string, Job> };
const load = (file: string) => yaml.load(fs.readFileSync(path.join(dir, file), "utf8")) as Workflow;
const raw = (file: string) => fs.readFileSync(path.join(dir, file), "utf8");

describe("preview: PR code never meets the deploy token (M4)", () => {
  it("builds on pull_request without secrets or an environment", () => {
    const wf = load("preview.yml");
    expect(Object.keys(wf.on)).toEqual(["pull_request"]);
    expect(raw("preview.yml")).not.toMatch(/secrets\./);
    for (const job of Object.values(wf.jobs)) expect(job.environment).toBeUndefined();
  });

  it("deploys from workflow_run with the default branch's code, never the PR head, and never for forks", () => {
    const wf = load("preview-deploy.yml");
    expect(Object.keys(wf.on)).toEqual(["workflow_run"]);
    const job = wf.jobs.deploy!;
    expect(job.if).toContain("head_repository.full_name == github.repository");
    const checkouts = job.steps!.filter((s) => s.uses?.startsWith("actions/checkout@"));
    expect(checkouts).toHaveLength(1);
    // No `ref:` means the default branch for workflow_run.
    expect(checkouts[0]!.with?.ref).toBeUndefined();
    expect(job.steps!.some((s) => s.run?.includes("npm ci --ignore-scripts"))).toBe(true);
    // The artifact's compiled config (PR code) is removed before populateCache would import it.
    const text = raw("preview-deploy.yml");
    expect(text.indexOf("open-next.config.edge.mjs")).toBeGreaterThan(-1);
    expect(text.indexOf("rm -f apps/web/.open-next/.build/open-next.config.edge.mjs")).toBeLessThan(
      text.indexOf("populateCache remote")
    );
  });
});

describe("newsletter-send runs only from main (M5)", () => {
  it("guards every job that gets production secrets", () => {
    const wf = load("newsletter-send.yml");
    for (const [name, job] of Object.entries(wf.jobs)) {
      if (job.environment === "production") expect(job.if, name).toContain("github.ref == 'refs/heads/main'");
    }
    expect(wf.jobs.refuse?.if).toBe("github.ref != 'refs/heads/main'");
    expect(wf.jobs.refuse?.environment).toBeUndefined();
  });
});
