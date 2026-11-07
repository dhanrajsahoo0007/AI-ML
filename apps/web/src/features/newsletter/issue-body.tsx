import "server-only";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ComponentProps, ReactElement } from "react";
import remarkGfm from "remark-gfm";
import type { Issue } from "./source";

// Compiles an issue's MDX for its web page at build time. Issues are plain Markdown (validated by the kind), so
// only links need a component: internal ones use next/link.

const components = {
  a: ({ href = "", children, ...rest }: ComponentProps<"a">) =>
    href.startsWith("/") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} rel="noreferrer" {...rest}>
        {children}
      </a>
    ),
};

export async function issueBody(issue: Pick<Issue, "body">): Promise<ReactElement> {
  const { content } = await compileMDX({
    source: issue.body,
    components,
    options: { parseFrontmatter: false, mdxOptions: { remarkPlugins: [remarkGfm] } },
  });
  return content;
}
