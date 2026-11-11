import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResponsibilityGrid } from "@/components/cloud/responsibility-grid";
import { OWNER_LABEL, RESPONSIBILITY_SETS, type Owner } from "@/lib/cloud-catalog";

// The sets behind <ResponsibilityGrid set="…" />: every set brings its own layers, and every option answers
// every one of them. "aws-compute" is pinned cell by cell because two published pages embed it.

const OWNERS = Object.keys(OWNER_LABEL) as Owner[];
const sets = Object.entries(RESPONSIBILITY_SETS);

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "|")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

describe("RESPONSIBILITY_SETS", () => {
  it("has the sets the cloud pages embed", () => {
    expect(Object.keys(RESPONSIBILITY_SETS).sort()).toEqual(
      [
        "aws-compute",
        "azure-compute",
        "databases",
        "encryption-controls",
        "gcp-compute",
        "ha-controls",
        "kubernetes",
        "network-security",
        "object-storage",
        "patching",
        "shared-responsibility",
      ].sort()
    );
  });

  it.each(sets)("%s: unique ids, 5–7 layers, 3–6 options", (_name, set) => {
    const layerIds = set.layers.map((l) => l.id);
    const optionIds = set.options.map((o) => o.id);
    expect(new Set(layerIds).size).toBe(layerIds.length);
    expect(new Set(optionIds).size).toBe(optionIds.length);
    expect(layerIds.length).toBeGreaterThanOrEqual(5);
    expect(layerIds.length).toBeLessThanOrEqual(7);
    expect(optionIds.length).toBeGreaterThanOrEqual(3);
    expect(optionIds.length).toBeLessThanOrEqual(6);
    for (const s of [set.title, set.ariaLabel, set.caption]) expect(s.trim()).not.toBe("");
  });

  it.each(sets)("%s: every option names an owner for every layer of its own set, and nothing else", (_name, set) => {
    const layerIds = set.layers.map((l) => l.id).sort();
    for (const option of set.options) {
      expect(Object.keys(option.owners).sort(), option.id).toEqual(layerIds);
      for (const owner of Object.values(option.owners)) expect(OWNERS, option.id).toContain(owner);
      expect(option.label.trim(), option.id).not.toBe("");
    }
  });

  it.each(sets)("%s: labels fit the narrow columns", (_name, set) => {
    // The widest labels in aws-compute are 26 (row) and 14 (column) characters; allow a little more, wrapped.
    for (const layer of set.layers) expect(layer.label.length, layer.label).toBeLessThanOrEqual(30);
    for (const option of set.options) {
      expect(option.label.length, option.label).toBeLessThanOrEqual(21);
      expect(option.sub.length, option.sub).toBeLessThanOrEqual(22);
    }
  });

  it("gives the three per-cloud compute grids the same layers, so they compare row by row", () => {
    const aws = RESPONSIBILITY_SETS["aws-compute"].layers;
    expect(RESPONSIBILITY_SETS["gcp-compute"].layers).toEqual(aws);
    expect(RESPONSIBILITY_SETS["azure-compute"].layers).toEqual(aws);
  });

  it("keeps what is always the customer's job with the customer in every column", () => {
    const always: [string, string][] = [
      ["aws-compute", "code"],
      ["gcp-compute", "code"],
      ["azure-compute", "code"],
      ["shared-responsibility", "data"],
      ["kubernetes", "images"],
      ["object-storage", "classification"],
      ["databases", "schema"],
      ["ha-controls", "testing"],
      ["patching", "dependencies"],
    ];
    for (const [name, layer] of always) {
      for (const option of RESPONSIBILITY_SETS[name].options) {
        expect(option.owners[layer], `${name}/${option.id}/${layer}`).toBe("you");
      }
    }
  });

  it("keeps aws-compute exactly as published", () => {
    const set = RESPONSIBILITY_SETS["aws-compute"];
    expect(set.title).toBe("Who runs what");
    expect(set.ariaLabel).toBe("Who runs each layer for each compute option");
    expect(set.caption).toBe("Moving right trades control for less operational work. Your code is always yours.");
    expect(set.layers).toEqual([
      { id: "code", label: "Your code and image" },
      { id: "scaling", label: "Scaling rules" },
      { id: "upgrades", label: "Runtime / version upgrades" },
      { id: "orchestrator", label: "Scheduler / control plane" },
      { id: "capacity", label: "Servers and capacity" },
      { id: "os", label: "OS patching and images" },
    ]);
    expect(set.options).toEqual([
      {
        id: "ec2",
        label: "EC2",
        sub: "+ Auto Scaling",
        owners: { code: "you", scaling: "you", upgrades: "you", orchestrator: "you", capacity: "shared", os: "you" },
      },
      {
        id: "ecs-ec2",
        label: "ECS on EC2",
        sub: "your instances",
        owners: {
          code: "you",
          scaling: "shared",
          upgrades: "shared",
          orchestrator: "provider",
          capacity: "shared",
          os: "you",
        },
      },
      {
        id: "eks",
        label: "EKS",
        sub: "managed node groups",
        owners: {
          code: "you",
          scaling: "you",
          upgrades: "you",
          orchestrator: "provider",
          capacity: "shared",
          os: "shared",
        },
      },
      {
        id: "eks-auto",
        label: "EKS Auto Mode",
        sub: "AWS runs nodes",
        owners: {
          code: "you",
          scaling: "shared",
          upgrades: "shared",
          orchestrator: "provider",
          capacity: "provider",
          os: "provider",
        },
      },
      {
        id: "fargate",
        label: "ECS on Fargate",
        sub: "no hosts",
        owners: {
          code: "you",
          scaling: "shared",
          upgrades: "provider",
          orchestrator: "provider",
          capacity: "provider",
          os: "provider",
        },
      },
      {
        id: "lambda",
        label: "Lambda",
        sub: "functions",
        owners: {
          code: "you",
          scaling: "provider",
          upgrades: "shared",
          orchestrator: "provider",
          capacity: "provider",
          os: "provider",
        },
      },
    ]);
  });
});

describe("<ResponsibilityGrid>", () => {
  it.each(sets)("renders %s: one column per option, one row per layer", (name, set) => {
    const html = renderToStaticMarkup(createElement(ResponsibilityGrid, { set: name }));
    expect(html).not.toContain("Unknown option set");
    expect(html).toContain(`aria-label="${set.ariaLabel}"`);
    expect(html.match(/role="columnheader"/g)).toHaveLength(set.options.length + 1);
    expect(html.match(/role="rowheader"/g)).toHaveLength(set.layers.length);
    expect(html.match(/role="cell"/g)).toHaveLength(set.options.length * set.layers.length);
    expect(html).toContain(`repeat(${set.options.length}, minmax(0, 1fr))`);
    const words = text(html);
    expect(words[0]).toBe(set.title);
    for (const layer of set.layers) expect(words).toContain(layer.label);
  });

  it("renders aws-compute with the published heading, cells and caption, in order", () => {
    const words = text(renderToStaticMarkup(createElement(ResponsibilityGrid, { set: "aws-compute" })));
    expect(words).toEqual([
      "Who runs what",
      "You",
      "You configure, cloud runs",
      "Cloud provider",
      ...["EC2", "+ Auto Scaling", "ECS on EC2", "your instances", "EKS", "managed node groups"],
      ...["EKS Auto Mode", "AWS runs nodes", "ECS on Fargate", "no hosts", "Lambda", "functions"],
      ...["Your code and image", "You", "You", "You", "You", "You", "You"],
      ...["Scaling rules", "You", "Configure", "You", "Configure", "Configure", "Cloud"],
      ...["Runtime / version upgrades", "You", "Configure", "You", "Configure", "Cloud", "Configure"],
      ...["Scheduler / control plane", "You", "Cloud", "Cloud", "Cloud", "Cloud", "Cloud"],
      ...["Servers and capacity", "Configure", "Configure", "Configure", "Cloud", "Cloud", "Cloud"],
      ...["OS patching and images", "You", "You", "Configure", "Cloud", "Cloud", "Cloud"],
      "Moving right trades control for less operational work. Your code is always yours.",
    ]);
  });

  it("says so when the set is unknown", () => {
    expect(renderToStaticMarkup(createElement(ResponsibilityGrid, { set: "nope" }))).toContain(
      "Unknown option set: nope"
    );
  });
});
