import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimatedDiagram } from "@/components/diagrams/animated-diagram";
import { Diagram } from "@/components/diagrams/diagram";
import { LayoutDiagram } from "@/components/diagrams/layout-diagram.client";
import { SequenceDiagram } from "@/components/diagrams/sequence-diagram.client";
import { renderHtml } from "../render-html";
import type { DiagramSpec } from "@/components/diagrams/types";
import { arch, layout, seq } from "./fixtures";

// Server render of each renderer. Effects do not run here, so this is also the first paint a reader sees before
// hydration: animation paused (data-running="false") until the IntersectionObserver reports the figure on screen.

const attr = (html: string, name: string) => [...html.matchAll(new RegExp(`${name}="([^"]+)"`, "g"))].map((m) => m[1]);
const dimmed = (html: string, kind: "node" | "edge") =>
  [...html.matchAll(new RegExp(`data-${kind}="([^"]+)"[^>]*data-dim="true"`, "g"))].map((m) =>
    m[1].replace("&gt;", ">")
  );

describe("AnimatedDiagram highlight and path", () => {
  it("dims nothing without highlight or path", () => {
    const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch }));
    expect(html).not.toContain("dg-dim");
    expect(html).not.toContain("dg-hl-ring");
  });

  it("dims every node but the highlighted ones and rings those", () => {
    const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch, highlight: ["cache", "db"] }));
    expect(dimmed(html, "node")).toEqual(["client", "lb"]);
    expect(dimmed(html, "edge")).toEqual(["client>lb", "lb>cache"]);
    expect(html.match(/class="dg-hl-ring"/g)).toHaveLength(2);
    expect(html).toContain('data-node="cache" data-hl="true"');
    // The zone holds only client and lb.
    expect(html).toMatch(/<g opacity="1" class="dg-dim" data-dim="true">/);
  });

  it("keeps the path's nodes and the edges between consecutive ids bright", () => {
    const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch, path: "client>lb>cache" }));
    expect(dimmed(html, "node")).toEqual(["db"]);
    expect(dimmed(html, "edge")).toEqual(["cache>db"]);
    expect(html).toContain('data-edge="client&gt;lb" data-hl="true"');
    expect(html).toContain('data-edge="lb&gt;cache" data-hl="true"');
  });

  it("works with a build step", () => {
    const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch, step: 2, highlight: ["cache"] }));
    expect(html).toContain("Step 2 of 2");
    expect(html).toContain('data-new="true"');
    expect(dimmed(html, "node")).toEqual(["client", "lb", "db"]);
  });

  it("keeps the figure inside the article column (no negative margins over the sidebar and outline)", () => {
    const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch }));
    const figure = html.match(/<figure[^>]*class="([^"]*)"/)?.[1] ?? "";
    expect(figure).not.toMatch(/(^|\s)([a-z0-9]+:)?-m[xlr]?-/);
  });

  it("starts paused and draws packets with the class that reduced motion hides", () => {
    const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch }));
    expect(html).toContain('data-running="false"');
    expect(html).toContain('class="dg-packet"');
  });
});

describe("SequenceDiagram", () => {
  it("draws lanes and messages top to bottom in row order", () => {
    const html = renderToStaticMarkup(createElement(SequenceDiagram, { spec: seq, alt: "Cache-aside read flow" }));
    expect(attr(html, "data-lane")).toEqual(["app", "cache", "db"]);
    expect(attr(html, "data-message").map((s) => s.replace("&gt;", ">"))).toEqual([
      "app>cache",
      "cache>app",
      "app>db",
      "db>app",
      "app>cache",
    ]);
    expect(attr(html, "data-kind")).toEqual(["call", "return", "call", "return", "async"]);
    expect(html).toContain("<desc>Cache-aside read flow</desc>");
    expect(html.match(/class="dg-packet"/g)).toHaveLength(5);
    // Packets are chained: the second leaves when the first arrives, inside one 6.3 s loop.
    expect(attr(html, "begin")).toContain("1.2s");
    expect(html).toContain('dur="6.3s"');
  });

  it("dashes return and async arrows and marks a timeout", () => {
    const spec = {
      ...seq,
      messages: [...seq.messages, { from: "app", to: "db", label: "UPDATE", kind: "timeout" as const }],
    };
    const html = renderToStaticMarkup(createElement(SequenceDiagram, { spec }));
    expect(html.match(/stroke-dasharray="6 5"/g)).toHaveLength(3);
    expect(html).toContain('class="dg-timeout"');
    expect(html).toContain("TIMEOUT");
  });

  it("shows a step's messages as new and earlier ones as old", () => {
    const html = renderToStaticMarkup(createElement(SequenceDiagram, { spec: seq, step: 2, stepper: true }));
    expect(attr(html, "data-phase")).toEqual(["old", "old", "new", "new", "new", "new"]);
    expect(html).toContain("Step 2 of 2");
    expect(html).toContain("Fill on a miss");
  });
});

describe("LayoutDiagram", () => {
  it("rings highlighted shapes and hides later steps", () => {
    const html = renderToStaticMarkup(createElement(LayoutDiagram, { spec: layout, step: 1 }));
    expect(attr(html, "data-shape")).toEqual(["b0", "b1", "t"]);
    expect(html).toContain('data-shape="b1" data-phase="new" data-hl="true"');
    expect(html.match(/class="dg-hl-ring"/g)).toHaveLength(1);
    expect(html).not.toContain("dg-packet");
  });

  it("draws arrows between shapes once both ends are shown", () => {
    const html = renderToStaticMarkup(createElement(LayoutDiagram, { spec: layout }));
    expect(attr(html, "data-shape")).toEqual(["a1", "b0", "b1", "k", "t"]);
    expect(html).toContain(">hash</text>");
  });
});

describe("Diagram wrapper", () => {
  it("renders an architecture spec by asset id with highlight", async () => {
    const html = await renderHtml(createElement(Diagram, { name: "messenger/architecture", highlight: ["chat"] }));
    expect(html).toContain("<svg");
    expect(html).toContain('data-dim="true"');
  });

  it("uses one server-made id prefix for the SVG defs and the markers that point at them", async () => {
    const html = await renderHtml(createElement(Diagram, { name: "messenger/architecture" }));
    const ids = [...html.matchAll(/<marker id="([^"]+)-arrow-/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(1);
    expect(html).toContain(`url(#${ids[0]}-arrow-`);
  });
});

describe("Diagram wrapper errors", () => {
  it("names unknown highlight ids instead of dimming everything (outside production)", () => {
    const html = renderToStaticMarkup(createElement(Diagram, { name: "messenger/architecture", path: "chat>nope" }));
    expect(html).toContain("unknown node ids in diagrams/animated/messenger/architecture: nope");
    expect(html).not.toContain("<svg");
  });
});

// The `cloud` prop is the Services toggle's initial state, so the server render (no effects, no clicks) must
// already show the provider's names. `text` reads the labels of one node; `pressed` the toggle button that is on.
const cloudArch: DiagramSpec = {
  ...arch,
  nodes: arch.nodes.map((n) =>
    n.id === "db" ? { ...n, cloud: { aws: "aws-dynamodb", gcp: { label: "Bigtable" }, azure: "azure-cosmos-db" } } : n
  ),
};
const cloudNames = { "aws-dynamodb": "DynamoDB", "azure-cosmos-db": "Cosmos DB" };
const text = (html: string, node: string) =>
  [
    ...(html.match(new RegExp(`data-node="${node}"[\\s\\S]*?</g></g>`))?.[0] ?? "").matchAll(/<text[^>]*>([^<]*)</g),
  ].map((m) => m[1]);
const pressed = (html: string) =>
  [...html.matchAll(/<button type="button" aria-pressed="true"[^>]*>([^<]*)</g)].map((m) => m[1]);

describe("AnimatedDiagram cloud prop", () => {
  it("shows the generic labels and starts the toggle on Generic when cloud is omitted", () => {
    const html = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: cloudArch, cloudNames }));
    expect(text(html, "db")).toEqual(["Database"]);
    expect(pressed(html)).toEqual(["Generic"]);
    expect(html).not.toContain("DynamoDB");
  });

  it("starts on the provider's short names in the first render when cloud is set", () => {
    const aws = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "aws" }));
    expect(text(aws, "db")).toEqual(["DynamoDB", "Database"]);
    expect(pressed(aws)).toEqual(["AWS"]);
    // A node without a ref for that provider keeps its generic label.
    expect(text(aws, "cache")).toEqual(["Cache"]);

    const gcp = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "gcp" }));
    expect(text(gcp, "db")).toEqual(["Bigtable", "Database"]);
    expect(pressed(gcp)).toEqual(["Google Cloud"]);

    const azure = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "azure" }));
    expect(text(azure, "db")).toEqual(["Cosmos DB", "Database"]);
    expect(pressed(azure)).toEqual(["Azure"]);
  });

  it("works with step, stepper, highlight and path", () => {
    // A single-step figure has no toggle; it still draws the provider's names.
    const stepped = renderToStaticMarkup(
      createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "aws", step: 2 })
    );
    expect(stepped).toContain("Step 2 of 2");
    // "NEW" is the marker on what step 2 added.
    expect(text(stepped, "db")).toEqual(["NEW", "DynamoDB", "Database"]);
    expect(pressed(stepped)).toEqual([]);

    const stepper = renderToStaticMarkup(
      createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "aws", step: 2, stepper: true })
    );
    expect(text(stepper, "db")).toEqual(["NEW", "DynamoDB", "Database"]);
    expect(pressed(stepper)).toContain("AWS");

    const lit = renderToStaticMarkup(
      createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "aws", highlight: ["db"] })
    );
    expect(dimmed(lit, "node")).toEqual(["client", "lb", "cache"]);
    expect(lit).toContain('data-node="db" data-hl="true"');
    expect(text(lit, "db")).toEqual(["DynamoDB", "Database"]);

    const routed = renderToStaticMarkup(
      createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "aws", path: "lb>cache>db" })
    );
    expect(dimmed(routed, "node")).toEqual(["client"]);
    expect(routed).toContain('data-edge="cache&gt;db" data-hl="true"');
    expect(text(routed, "db")).toEqual(["DynamoDB", "Database"]);
  });

  it("is ignored on an architecture spec without cloud refs", () => {
    const plain = renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch }));
    expect(renderToStaticMarkup(createElement(AnimatedDiagram, { spec: arch, cloud: "aws" }))).toBe(plain);
    expect(pressed(plain)).toEqual([]);
  });

  it("falls back to Generic for a value that is not a provider when used without the wrapper", () => {
    const html = renderToStaticMarkup(
      createElement(AnimatedDiagram, { spec: cloudArch, cloudNames, cloud: "oracle" as never })
    );
    expect(text(html, "db")).toEqual(["Database"]);
    expect(pressed(html)).toEqual(["Generic"]);
  });
});

describe("Diagram wrapper cloud prop", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("server-renders a real spec with the provider's names, catalog short names included", async () => {
    const generic = await renderHtml(createElement(Diagram, { spec: "animated/messenger/architecture" }));
    expect(text(generic, "store")).toEqual(["Message store", "by conversation"]);
    expect(pressed(generic)).toEqual(["Generic"]);

    const aws = await renderHtml(createElement(Diagram, { spec: "animated/messenger/architecture", cloud: "aws" }));
    // "aws-dynamodb" is a catalog id (short name from the catalog); the load balancer carries its own label.
    expect(text(aws, "store")).toEqual(["DynamoDB", "Message store"]);
    expect(text(aws, "lb")).toEqual(["NLB", "Load balancer"]);
    expect(pressed(aws)).toEqual(["AWS"]);
  });

  it("combines with step and path on a real spec", async () => {
    const html = await renderHtml(
      createElement(Diagram, { name: "messenger/architecture", cloud: "azure", stepper: true, path: "lb>chat" })
    );
    expect(text(html, "lb")).toEqual(["Load Balancer", "Load balancer"]);
    expect(pressed(html)).toContain("Azure");
    expect(html).toContain('data-edge="lb&gt;chat" data-hl="true"');
  });

  it("is ignored on sequence and layout specs and on architecture specs without cloud refs", async () => {
    for (const name of ["fundamentals/server-sent-events", "fundamentals/serialization", "databases/inverted-index"]) {
      const plain = await renderHtml(createElement(Diagram, { name }));
      const withCloud = await renderHtml(createElement(Diagram, { name, cloud: "gcp" }));
      expect(plain, name).toContain("<svg");
      expect(withCloud, name).toBe(plain);
    }
  });

  it("shows a red note for an invalid value outside production, whatever the spec kind", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const name of ["messenger/architecture", "fundamentals/server-sent-events"]) {
      const html = renderToStaticMarkup(createElement(Diagram, { name, cloud: "amazon" as never }));
      expect(html, name).toContain("border-red-500/40");
      expect(html, name).toContain("cloud must be one of &quot;aws&quot;, &quot;gcp&quot;, &quot;azure&quot;");
      expect(html, name).toContain("got &quot;amazon&quot;");
      expect(html, name).not.toContain("<svg");
    }
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("fails a production render (and so the build) on an invalid value", async () => {
    // InvalidProps reads NODE_ENV once at import, so load a fresh copy of the wrapper under the stubbed value.
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { Diagram: ProdDiagram } = await import("@/components/diagrams/diagram");
    expect(() =>
      renderToStaticMarkup(createElement(ProdDiagram, { name: "messenger/architecture", cloud: "AWS" as never }))
    ).toThrow('<AnimatedDiagram>: cloud must be one of "aws", "gcp", "azure"');
    vi.resetModules();
  });
});

describe("reduced motion", () => {
  it("hides packets and stops the rings in globals.css", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)]
      .map((m) => m[1])
      .join("\n");
    expect(reduced).toMatch(/\.dg \.dg-packet \{\s*display: none;/);
    expect(reduced).toMatch(/\.dg \.dg-hl-ring,[\s\S]*animation: none;/);
  });
});
