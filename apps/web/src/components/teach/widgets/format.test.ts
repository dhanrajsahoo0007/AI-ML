import { describe, expect, it } from "vitest";
import { formatBytes, formatCompact, formatInt, formatNs, formatPercent, formatRatio, formatSeconds } from "./format";

describe("formatInt", () => {
  it("groups thousands and rounds", () => {
    expect(formatInt(1234567.6)).toBe("1,234,568");
    expect(formatInt(0)).toBe("0");
  });
});

describe("formatCompact", () => {
  it.each([
    [0, "0"],
    [7.5, "7.5"],
    [999, "999"],
    [1000, "1K"],
    [1234, "1.23K"],
    [12345, "12.3K"],
    [123456, "123K"],
    [2_500_000, "2.5M"],
    [3_000_000_000, "3B"],
    [4.2e12, "4.2T"],
  ])("%s -> %s", (n, out) => {
    expect(formatCompact(n)).toBe(out);
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1000, "1 kB"],
    [1536, "1.54 kB"],
    [2.5e6, "2.5 MB"],
    [1e9, "1 GB"],
    [123e12, "123 TB"],
    [5e15, "5 PB"],
  ])("%s -> %s", (n, out) => {
    expect(formatBytes(n)).toBe(out);
  });
});

describe("formatNs", () => {
  it.each([
    [1, "1 ns"],
    [100, "100 ns"],
    [2000, "2 µs"],
    [150_000, "150 µs"],
    [1e7, "10 ms"],
    [1.5e8, "150 ms"],
    [2.5e9, "2.5 s"],
  ])("%s -> %s", (n, out) => {
    expect(formatNs(n)).toBe(out);
  });
});

describe("formatSeconds", () => {
  it.each([
    [0, "0 s"],
    [8.64, "8.64 s"],
    [52.56, "52.6 s"],
    [263, "4m 23s"],
    [3600 * 8.76, "8h 45m"],
    [86400 * 3.65, "3d 15h"],
  ])("%s -> %s", (n, out) => {
    expect(formatSeconds(n)).toBe(out);
  });
});

describe("formatPercent", () => {
  it("prints a fraction as a percentage", () => {
    expect(formatPercent(0.1234)).toBe("12.3%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0.00123, 2)).toBe("0.12%");
  });
});

describe("formatRatio", () => {
  it("handles both directions", () => {
    expect(formatRatio(10000)).toBe("10,000×");
    expect(formatRatio(2.5)).toBe("2.5×");
    expect(formatRatio(1)).toBe("1×");
    expect(formatRatio(0.001)).toBe("1/1,000");
    expect(formatRatio(0.25)).toBe("1/4");
  });
});
