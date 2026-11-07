import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ANY_CANARY, readCanary, scanDir, scanText } from "../e2e/support/leak-scan";
import { findLinksTo, isUnder } from "../e2e/support/registry";

// The E2E leak and section-visibility specs pass when their scanners find nothing, so the scanners themselves
// must be proven to find things.

describe("findLinksTo", () => {
  it("finds HTML links to a section and below it", () => {
    const html = `<a href="/cloud">C</a><a href="/cloud/aws?x=1">A</a><a href="/cloudy">no</a><a href="/x/cloud">no</a>`;
    expect(findLinksTo(html, "/cloud")).toEqual(["/cloud", "/cloud/aws?x=1"]);
  });

  it("finds links in the RSC payload, plain and escaped inside a script string", () => {
    const rsc = `{"href":"/cloud/gcp","children":"x"}`;
    const inlined = `self.__next_f.push([1,"{\\"href\\":\\"/cloud#top\\"}"])`;
    expect(findLinksTo(rsc, "/cloud")).toEqual(["/cloud/gcp"]);
    expect(findLinksTo(inlined, "/cloud")).toEqual(["/cloud#top"]);
  });

  it("ignores text that merely mentions the path", () => {
    expect(findLinksTo(`<p>see /cloud/aws</p><img src="/cloud.svg">`, "/cloud")).toEqual([]);
  });
});

describe("isUnder", () => {
  it.each([
    ["/cloud", true],
    ["/cloud/aws", true],
    ["/cloud?x", true],
    ["/cloudy", false],
    ["/", false],
  ])("%s under /cloud is %s", (p, expected) => expect(isUnder(p, "/cloud")).toBe(expected));
});

describe("leak scanners", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "leak-scan-"));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("the fixture canary matches the canary pattern", () => {
    expect(readCanary()).toMatch(ANY_CANARY);
  });

  it("scanText finds every occurrence with context", () => {
    const hits = scanText("a LEAK-CANARY-0123abcd b LEAK-CANARY-ffffffff", ANY_CANARY, "x");
    expect(hits.map((h) => h.excerpt.includes("LEAK-CANARY-"))).toEqual([true, true]);
  });

  it("scanDir finds a canary in nested text and binary files", () => {
    fs.mkdirSync(path.join(dir, "chunks", "app"), { recursive: true });
    fs.writeFileSync(path.join(dir, "chunks", "app", "page.js"), `var a="LEAK-CANARY-deadbeef01";`);
    fs.writeFileSync(
      path.join(dir, "font.woff2"),
      Buffer.concat([Buffer.from([0, 255, 1]), Buffer.from("LEAK-CANARY-cafebabe02")])
    );
    fs.writeFileSync(path.join(dir, "clean.css"), "body{}");
    expect(
      scanDir(dir, ANY_CANARY)
        .map((h) => path.basename(h.where))
        .sort()
    ).toEqual(["font.woff2", "page.js"]);
  });

  it("scanDir returns nothing for a missing directory", () => {
    expect(scanDir(path.join(dir, "missing"), ANY_CANARY)).toEqual([]);
  });
});
