import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "./test-runner";
import {
  allSections,
  hiddenRoutes,
  isInOffHub,
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

/**
 * Runs `fn` in `env` against a registry given as YAML text instead of content/sections.yaml. The registry is
 * cached per environment, so it is read once under another environment on the way in and on the way out.
 */
function withRegistry<T>(text: string, env: AppEnv, fn: () => T): T {
  const before = process.env.SECTIONS_YAML;
  const other = APP_ENVS.find((e) => e !== env)!;
  process.env.SECTIONS_YAML = text;
  try {
    withEnv(other, () => allSections());
    return withEnv(env, fn);
  } finally {
    if (before === undefined) delete process.env.SECTIONS_YAML;
    else process.env.SECTIONS_YAML = before;
    withEnv(other, () => allSections());
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
    assert.deepEqual(states["genai-system-design"], everywhere);
    assert.deepEqual(states["system-design"], everywhere);
    assert.deepEqual(states["system-design-case-studies"], everywhere);
    assert.deepEqual(states.interviews, everywhere);
    assert.deepEqual(states.companies, everywhere);
    assert.deepEqual(states.cloud, { local: "on", preview: "on", staging: "on", production: "hidden" });
    assert.deepEqual(states.behavioral, { local: "on", preview: "on", staging: "on", production: "off" });
    assert.deepEqual(states.dsa, { local: "on", preview: "on", staging: "off", production: "off" });
    assert.deepEqual(states.newsletter, { local: "on", preview: "on", staging: "on", production: "off" });
    assert.deepEqual(states["ml-system-design"], { local: "on", preview: "on", staging: "on", production: "off" });
  });
  it("gives ML System Design its own section and parks no hub", () => {
    assert.equal(entries.find((s) => s.key === "ml-system-design")?.kind, "docs");
    assert.deepEqual(
      entries.filter((s) => s.hubRelease).map((s) => s.key),
      []
    );
  });
  it("gives each section one label", () => {
    assert.equal(entries.find((s) => s.key === "cloud")?.label, "Cloud");
  });
  it("orders sections by `order`", () => {
    const orders = resolveSections(entries, "local").map((s) => s.order);
    assert.deepEqual(
      orders,
      [...orders].sort((a, b) => a - b)
    );
  });
});

describe("parseRegistry", () => {
  const base =
    "- { key: a, kind: docs, label: A, href: /a, icon: x, navGroup: learn, order: 1, hub: { title: A, subtitle: B }, release: { local: on, preview: on, staging: on, production: on } }\n";
  it("accepts a valid entry", () => {
    assert.equal(parseRegistry(base, "t.yaml").length, 1);
  });
  it("rejects duplicate keys", () => {
    assert.throws(() => parseRegistry(base + base, "t.yaml"), /duplicate key a/);
  });
  it("rejects unknown release states and missing environments", () => {
    assert.throws(
      () => parseRegistry(base.replace("production: on", "production: maybe"), "t.yaml"),
      /release\.production/
    );
    assert.throws(() => parseRegistry(base.replace(", production: on", ""), "t.yaml"), /release\.production/);
  });
  it("requires href to be /<key>", () => {
    assert.throws(() => parseRegistry(base.replace("href: /a", "href: /b"), "t.yaml"), /href must be \/a/);
  });
  it("accepts hubRelease on docs sections only, with on/off states", () => {
    const withHub = base.replace(
      "order: 1,",
      "order: 1, hubRelease: { h: { local: on, preview: off, staging: off, production: off } },"
    );
    assert.equal(parseRegistry(withHub, "t.yaml")[0].hubRelease?.h.preview, "off");
    assert.throws(() => parseRegistry(withHub.replace("preview: off", "preview: hidden"), "t.yaml"), /hubRelease/);
    assert.throws(() => parseRegistry(withHub.replace("kind: docs", "kind: problems"), "t.yaml"), /docs sections only/);
  });
  it("resolves the hubs that are off in each environment", () => {
    const withHub = base.replace(
      "order: 1,",
      "order: 1, hubRelease: { h: { local: on, preview: off, staging: off, production: off } },"
    );
    const parsed = parseRegistry(withHub, "t.yaml");
    assert.equal(resolveSections(parsed, "local")[0].offHubs, undefined);
    assert.deepEqual(resolveSections(parsed, "production")[0].offHubs, ["h"]);
  });
  it("rejects unknown fields", () => {
    assert.throws(() => parseRegistry(base.replace("order: 1", "order: 1, colour: red"), "t.yaml"), /colour/);
  });
  it("lets at most one docs section own the glossary", () => {
    const owner = base.replace("order: 1", "order: 1, glossary: true");
    assert.equal(parseRegistry(owner, "t.yaml")[0].glossary, true);
    const second = owner.replace(/\ba\b/g, "b").replace("title: A", "title: B");
    assert.throws(() => parseRegistry(owner + second, "t.yaml"), /only one section can own the glossary/);
    assert.throws(
      () => parseRegistry(owner.replace("kind: docs", "kind: directory"), "t.yaml"),
      /glossary belongs to a docs section/
    );
  });
});

describe("release states per environment", () => {
  it("shows everything in local", () => {
    withEnv("local", () => assert.equal(visibleSections().length, allSections().length));
  });
  it("hides Cloud and drops ML System Design, Behavioral, DSA and Newsletter in production", () => {
    withEnv("production", () => {
      assert.equal(sectionState("cloud"), "hidden");
      assert.deepEqual(
        visibleSections().map((s) => s.key),
        [
          "ai-system-design",
          "genai-system-design",
          "system-design",
          "system-design-case-studies",
          "interviews",
          "companies",
        ]
      );
      assert.deepEqual(hiddenRoutes(), {
        env: "production",
        hidden: ["/cloud"],
        off: ["/ml-system-design", "/behavioral", "/dsa", "/newsletter"],
      });
      assert.equal(isPathVisible("/cloud/aws/compute"), false);
      assert.equal(isPathVisible("/cloudy"), true);
      assert.equal(isPathVisible("/system-design/databases"), true);
    });
  });
  it("keeps a parked hub (hubRelease) off outside local, and the rest of its section on", () => {
    // No section parks a hub today, so this runs against a registry that does.
    const parked =
      "- { key: docs-a, kind: docs, label: A, href: /docs-a, icon: x, navGroup: learn, order: 1, " +
      "hub: { title: A, subtitle: B }, release: { local: on, preview: on, staging: on, production: on }, " +
      "hubRelease: { parked: { local: on, preview: off, staging: off, production: off } } }\n";
    for (const env of ["preview", "staging", "production"] as const) {
      withRegistry(parked, env, () => {
        assert.equal(isInOffHub("/docs-a/parked/some-page"), true);
        assert.equal(isPathVisible("/docs-a/parked"), false);
        assert.equal(isPathVisible("/docs-a/parkedish"), true);
        assert.equal(isPathVisible("/docs-a/open/some-page"), true);
        assert.deepEqual(hiddenRoutes().off, ["/docs-a/parked"]);
      });
    }
    withRegistry(parked, "local", () => {
      assert.equal(isPathVisible("/docs-a/parked/some-page"), true);
      assert.deepEqual(hiddenRoutes().off, []);
    });
    withEnv("local", () => assert.deepEqual(hiddenRoutes().off, []));
  });
  it("throws for an unknown section key", () => {
    assert.throws(() => sectionState("nope"), /Unknown section/);
  });
});
