import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "./test-runner";
import {
  allSections,
  hiddenRoutes,
  isPathVisible,
  parseRegistry,
  REGISTRY_FILE,
  resolveAppEnv,
  resolveSections,
  sectionState,
  visibleSections,
} from "./registry";
import { APP_ENVS, type AppEnv } from "./schema";

const entries = parseRegistry(fs.readFileSync(REGISTRY_FILE, "utf8"));

function withEnv<T>(env: AppEnv, fn: () => T): T {
  const before = process.env.APP_ENV;
  process.env.APP_ENV = env;
  try {
    return fn();
  } finally {
    if (before === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = before;
  }
}

describe("resolveAppEnv", () => {
  it("uses APP_ENV when set", () => {
    for (const env of APP_ENVS) assert.equal(resolveAppEnv(env, "production"), env);
  });
  it("treats a production build without APP_ENV as production, anything else as local", () => {
    assert.equal(resolveAppEnv(undefined, "production"), "production");
    assert.equal(resolveAppEnv(undefined, "development"), "local");
    assert.equal(resolveAppEnv(undefined, undefined), "local");
  });
  it("rejects unknown environments", () => {
    assert.throws(() => resolveAppEnv("prod", undefined), /APP_ENV must be one of/);
  });
});

describe("content/sections.yaml", () => {
  it("declares the planned sections with today's release states", () => {
    const states = Object.fromEntries(entries.map((s) => [s.key, s.release]));
    const everywhere = { local: "on", preview: "on", staging: "on", production: "on" };
    assert.deepEqual(states["ai-system-design"], everywhere);
    assert.deepEqual(states["system-design"], everywhere);
    assert.deepEqual(states.interviews, everywhere);
    assert.deepEqual(states.companies, everywhere);
    assert.deepEqual(states.cloud, { local: "on", preview: "on", staging: "on", production: "hidden" });
    assert.deepEqual(states.dsa, { local: "on", preview: "on", staging: "on", production: "off" });
    assert.deepEqual(states.newsletter, { local: "on", preview: "on", staging: "on", production: "off" });
    assert.deepEqual(states["ml-system-design"], { local: "on", preview: "off", staging: "off", production: "off" });
  });
  it("gives each section one label", () => {
    assert.equal(entries.find((s) => s.key === "cloud")?.label, "Cloud");
  });
  it("orders sections by `order`", () => {
    const orders = resolveSections(entries, "local").map((s) => s.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  });
});

describe("parseRegistry", () => {
  const base = "- { key: a, kind: docs, label: A, href: /a, icon: x, navGroup: learn, order: 1, hub: { title: A, subtitle: B }, release: { local: on, preview: on, staging: on, production: on } }\n";
  it("accepts a valid entry", () => {
    assert.equal(parseRegistry(base, "t.yaml").length, 1);
  });
  it("rejects duplicate keys", () => {
    assert.throws(() => parseRegistry(base + base, "t.yaml"), /duplicate key a/);
  });
  it("rejects unknown release states and missing environments", () => {
    assert.throws(() => parseRegistry(base.replace("production: on", "production: maybe"), "t.yaml"), /release\.production/);
    assert.throws(() => parseRegistry(base.replace(", production: on", ""), "t.yaml"), /release\.production/);
  });
  it("requires href to be /<key>", () => {
    assert.throws(() => parseRegistry(base.replace("href: /a", "href: /b"), "t.yaml"), /href must be \/a/);
  });
  it("rejects unknown fields", () => {
    assert.throws(() => parseRegistry(base.replace("order: 1", "order: 1, colour: red"), "t.yaml"), /colour/);
  });
});

describe("release states per environment", () => {
  it("shows everything in local", () => {
    withEnv("local", () => assert.equal(visibleSections().length, allSections().length));
  });
  it("hides Cloud and drops DSA, Newsletter and ML System Design in production", () => {
    withEnv("production", () => {
      assert.equal(sectionState("cloud"), "hidden");
      assert.deepEqual(
        visibleSections().map((s) => s.key),
        ["ai-system-design", "system-design", "interviews", "companies"]
      );
      assert.deepEqual(hiddenRoutes(), {
        env: "production",
        hidden: ["/cloud"],
        off: ["/dsa", "/newsletter", "/ml-system-design"],
      });
      assert.equal(isPathVisible("/cloud/aws/compute"), false);
      assert.equal(isPathVisible("/cloudy"), true);
      assert.equal(isPathVisible("/system-design/databases"), true);
    });
  });
  it("keeps ML System Design off outside local", () => {
    for (const env of ["preview", "staging", "production"] as const) {
      withEnv(env, () => assert.equal(sectionState("ml-system-design"), "off"));
    }
  });
  it("throws for an unknown section key", () => {
    assert.throws(() => sectionState("nope"), /Unknown section/);
  });
});
