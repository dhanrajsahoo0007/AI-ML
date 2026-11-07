import { describe, expect, it } from "vitest";
import { serialize } from "next-mdx-remote/serialize";
import { remarkAssetRefs } from "@/lib/remark-asset-refs";

// React Server Components reject a `ref` prop ("Refs cannot be used in Server Components"), which broke the
// production build for `<Mermaid ref="…" />`; the plugin must rename it before the MDX becomes JSX.
describe("remarkAssetRefs", () => {
  const compile = async (source: string) =>
    (await serialize(source, { mdxOptions: { remarkPlugins: [remarkAssetRefs] } })).compiledSource;

  it("renames ref to id on <Mermaid>, block and inline", async () => {
    const code = await compile('<Mermaid ref="system-design/wal" caption="WAL" />\n\nText <Mermaid ref="a/b" /> here.');
    expect(code).toContain('id: "system-design/wal"');
    expect(code).toContain('id: "a/b"');
    expect(code).not.toMatch(/\bref:/);
  });

  it("leaves other components alone", async () => {
    expect(await compile('<Img id="images/a/b" />')).toContain('id: "images/a/b"');
  });
});
