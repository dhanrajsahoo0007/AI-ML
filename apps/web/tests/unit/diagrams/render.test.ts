import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedDiagram } from "@/components/diagrams/animated-diagram";
import { Diagram } from "@/components/diagrams/diagram";
import { LayoutDiagram } from "@/components/diagrams/layout-diagram.client";
import { SequenceDiagram } from "@/components/diagrams/sequence-diagram.client";
import { renderHtml } from "../render-html";
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
