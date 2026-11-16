import { describe, expect, it } from "vitest";
import {
  computeProgressStats,
  groupHrefs,
  groupLeafItems,
  isCompleted,
  sectionHrefs,
  sectionLeafItems,
  type ProgressNavSection,
} from "./progress-stats";

describe("computeProgressStats", () => {
  it("returns 0% when empty or when nothing is completed", () => {
    const done = new Set(["track-b/hub/one"]);
    expect(computeProgressStats(done, [])).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
      nextHref: null,
    });
    expect(computeProgressStats(done, ["/track-a/hub/one", "/track-a/hub/two"])).toEqual({
      completed: 0,
      total: 2,
      percent: 0,
      nextHref: "/track-a/hub/one",
    });
  });

  it("isolates progress per tab and computes percentage and nextHref in reading order", () => {
    const done = new Set(["track-a/hub/one", "track-a/hub/three", "track-b/hub/only"]);
    const trackA = ["/track-a/hub/one", "/track-a/hub/two", "/track-a/hub/three", "/track-a/hub/four"];
    const trackB = ["/track-b/hub/only", "/track-b/hub/second"];

    expect(computeProgressStats(done, trackA)).toEqual({
      completed: 2,
      total: 4,
      percent: 50,
      nextHref: "/track-a/hub/two",
    });
    expect(computeProgressStats(done, trackB)).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
      nextHref: "/track-b/hub/second",
    });
  });

  it("clamps partial progress to [1, 99] so 0% means not started and 100% means all done", () => {
    const many = Array.from({ length: 200 }, (_, i) => `/track-a/hub/p-${i}`);
    const oneDone = new Set(["track-a/hub/p-0"]);
    expect(computeProgressStats(oneDone, many).percent).toBe(1);

    const almostAllDone = new Set(many.slice(0, 199).map((h) => h.slice(1)));
    expect(computeProgressStats(almostAllDone, many)).toEqual({
      completed: 199,
      total: 200,
      percent: 99,
      nextHref: "/track-a/hub/p-199",
    });

    const allDone = new Set(many.map((h) => h.slice(1)));
    expect(computeProgressStats(allDone, many)).toEqual({
      completed: 200,
      total: 200,
      percent: 100,
      nextHref: null,
    });
  });

  it("deduplicates hrefs and strips hash fragments", () => {
    const done = new Set(["track-a/hub/one"]);
    expect(computeProgressStats(done, ["/track-a/hub/one#intro", "/track-a/hub/one", "/track-a/hub/two"])).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
      nextHref: "/track-a/hub/two",
    });
    expect(isCompleted(done, "/track-a/hub/one#section")).toBe(true);
  });
});

describe("sectionLeafItems and groupLeafItems", () => {
  const sampleSection: ProgressNavSection = {
    groups: [
      {
        categories: [
          {
            items: [
              { title: "One", href: "/track-a/hub/one" },
              { title: "Two", href: "/track-a/hub/two" },
            ],
          },
        ],
        items: [{ title: "Three", href: "/track-a/hub/three" }],
      },
      {
        items: [
          { title: "Two duplicate", href: "/track-a/hub/two" },
          { title: "Four", href: "/track-a/hub/four" },
        ],
      },
    ],
  };

  it("extracts deduplicated leaf items in reading order for groups and sections", () => {
    expect(groupLeafItems(sampleSection.groups[0]).map((i) => i.href)).toEqual([
      "/track-a/hub/one",
      "/track-a/hub/two",
      "/track-a/hub/three",
    ]);
    expect(groupHrefs(sampleSection.groups[0])).toEqual(["/track-a/hub/one", "/track-a/hub/two", "/track-a/hub/three"]);
    expect(sectionLeafItems(sampleSection).map((i) => i.title)).toEqual(["One", "Two", "Three", "Four"]);
    expect(sectionHrefs(sampleSection)).toEqual([
      "/track-a/hub/one",
      "/track-a/hub/two",
      "/track-a/hub/three",
      "/track-a/hub/four",
    ]);
  });
});
