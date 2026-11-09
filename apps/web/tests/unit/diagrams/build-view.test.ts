import { describe, expect, it } from "vitest";
import {
  buildView,
  edgeEmphasised,
  layoutView,
  nodeEmphasised,
  parseEmphasis,
  phaseOf,
  unknownEmphasisIds,
  zoneEmphasised,
} from "@/components/diagrams/build-view";
import { arch, layout } from "./fixtures";

describe("phaseOf", () => {
  it("is full without a step, new for the step's own elements, old otherwise", () => {
    expect(phaseOf(2, undefined)).toBe("full");
    expect(phaseOf(2, 2)).toBe("new");
    expect(phaseOf(1, 2)).toBe("old");
  });
});

describe("buildView", () => {
  it("shows the full diagram without edges that a later step replaces", () => {
    const v = buildView(arch, undefined);
    expect(v.nodes.map((n) => n.phase)).toEqual(["full", "full", "full", "full"]);
    expect(v.edges.map((e) => `${e.edge.from}>${e.edge.to}`)).toEqual(["client>lb", "lb>cache", "cache>db"]);
    expect(v.zones.map((z) => z.phase)).toEqual(["full"]);
  });

  it("shows step 1 with its nodes and the edge that lasts until step 1", () => {
    const v = buildView(arch, 1);
    expect(v.nodes.map((n) => n.node.id)).toEqual(["client", "lb"]);
    expect(v.nodes.every((n) => n.phase === "new")).toBe(true);
    // lb>db needs db, which arrives in step 2, so step 1 has only client>lb.
    expect(v.edges.map((e) => `${e.edge.from}>${e.edge.to}`)).toEqual(["client>lb"]);
  });

  it("marks step 2 additions new, carries step 1 over as old, and re-bases new packets to start together", () => {
    const v = buildView(arch, 2);
    const phases = Object.fromEntries(v.nodes.map((n) => [n.node.id, n.phase]));
    expect(phases).toEqual({ client: "old", lb: "old", cache: "new", db: "new" });
    const edges = Object.fromEntries(v.edges.map((e) => [`${e.edge.from}>${e.edge.to}`, e]));
    expect(edges["lb>db"]).toBeUndefined();
    expect(edges["lb>cache"].phase).toBe("new");
    expect(edges["lb>cache"].delay).toBe(0);
    expect(edges["cache>db"].delay).toBe(1);
    expect(edges["client>lb"].phase).toBe("old");
    expect(v.zones[0].phase).toBe("old");
  });
});

describe("parseEmphasis", () => {
  it("returns undefined when nothing is named", () => {
    expect(parseEmphasis(undefined, undefined)).toBeUndefined();
    expect(parseEmphasis([], " ")).toBeUndefined();
  });

  it("keeps highlighted nodes and the edges between two of them", () => {
    const em = parseEmphasis(["cache", "db"]);
    expect(nodeEmphasised(em, "cache")).toBe(true);
    expect(nodeEmphasised(em, "lb")).toBe(false);
    expect(edgeEmphasised(em, "cache", "db")).toBe(true);
    expect(edgeEmphasised(em, "lb", "cache")).toBe(false);
  });

  it("emphasises only consecutive path edges, in either direction", () => {
    const em = parseEmphasis(undefined, "client > lb>cache");
    expect([...(em?.nodes ?? [])]).toEqual(["client", "lb", "cache"]);
    expect(edgeEmphasised(em, "client", "lb")).toBe(true);
    expect(edgeEmphasised(em, "cache", "lb")).toBe(true);
    expect(edgeEmphasised(em, "client", "cache")).toBe(false);
  });

  it("keeps a zone bright when it holds a highlighted node", () => {
    const zone = arch.zones[0];
    expect(zoneEmphasised(parseEmphasis(["lb"]), zone, arch.nodes)).toBe(true);
    expect(zoneEmphasised(parseEmphasis(["db"]), zone, arch.nodes)).toBe(false);
    expect(zoneEmphasised(undefined, zone, arch.nodes)).toBe(true);
  });
});

describe("unknownEmphasisIds", () => {
  it("lists ids that are not nodes of the spec", () => {
    expect(unknownEmphasisIds(arch, ["cache", "redis"], "client>lb>dbb")).toEqual(["redis", "dbb"]);
    expect(unknownEmphasisIds(arch, undefined, "client>lb")).toEqual([]);
    expect(unknownEmphasisIds(arch)).toEqual([]);
  });
});

describe("layoutView", () => {
  it("hides later shapes and arrows whose ends are not shown yet", () => {
    const v = layoutView(layout, 1);
    expect(v.shapes.map((s) => s.shape.id)).toEqual(["b0", "b1", "t"]);
    expect(v.groups.map((g) => g.phase)).toEqual(["new"]);
  });

  it("marks the step's shapes new and the rest old", () => {
    const v = layoutView(layout, 2);
    const phases = Object.fromEntries(v.shapes.map((s) => [s.shape.id, s.phase]));
    expect(phases).toEqual({ b0: "old", b1: "old", k: "new", a1: "new", t: "old" });
    expect(v.groups[0].phase).toBe("old");
  });

  it("shows everything in the full view", () => {
    const v = layoutView(layout, undefined);
    expect(v.shapes).toHaveLength(5);
    expect(v.shapes.every((s) => s.phase === "full")).toBe(true);
  });
});
