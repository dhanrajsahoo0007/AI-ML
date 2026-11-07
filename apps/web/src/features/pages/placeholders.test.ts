import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { business } from "../../config/business";
import { placeholderKeys, resolvePlaceholders } from "./placeholders";

describe("resolvePlaceholders", () => {
  it("replaces every placeholder", () => {
    expect(resolvePlaceholders("Hi {{BRAND}}, {{ DOMAIN }}.", { BRAND: "A", DOMAIN: "b.test" })).toBe("Hi A, b.test.");
  });

  it("escapes MDX syntax in values", () => {
    expect(resolvePlaceholders("{{X}}", { X: "<b>{y}</b>" })).toBe("\\<b\\>\\{y\\}\\</b\\>");
    expect(resolvePlaceholders("{{X}}", { X: "<b>" }, { escape: false })).toBe("<b>");
  });

  it("throws on an unknown placeholder", () => {
    expect(() => resolvePlaceholders("{{NOPE}}", {})).toThrow("{{NOPE}}");
  });
});

describe("content/pages", () => {
  const root = fileURLToPath(new URL("../../../content/pages", import.meta.url));
  const files = fs.readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".mdx"));

  it.each(files)("%s only uses placeholders defined in config/business.ts", (file) => {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const { data } = matter(source);
    expect(typeof data.title).toBe("string");
    for (const k of placeholderKeys(source)) expect(business).toHaveProperty(k);
    expect(resolvePlaceholders(source, business)).not.toContain("{{");
  });
});
