import "server-only";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ComponentProps, ReactElement } from "react";
import remarkGfm from "remark-gfm";
import { Callout } from "@/components/db/callouts";
import { CALLOUT_ATTR, CALLOUTS, isCalloutType, remarkCallouts } from "./callouts";
import { IssueFigure } from "./figure";
import { resolveFigure } from "./figures";
import { ASSET_SCHEME, isFigureOnly } from "./links";
import type { Issue } from "./source";

// Compiles an issue's MDX for its web page at build time. Issues are plain Markdown (validated by the kind); the
// components here give that Markdown its web look: internal links use next/link, `asset:` images become numbered
// figures, `> [!TYPE]` quotes become callouts.

function components() {
  // Figures are numbered in reading order; one counter per compile (server render is sequential). The steps of
  // one build-up figure share its number ("Figure 2 · step 3 of 5").
  let figure = 0;
  let lastStepped: string | null = null;
  return {
    a: ({ href = "", children, ...rest }: ComponentProps<"a">) =>
      href.startsWith("/") ? (
        <Link href={href}>{children}</Link>
      ) : (
        <a href={href} rel="noreferrer" {...rest}>
          {children}
        </a>
      ),
    img: ({ src, alt }: ComponentProps<"img">) => {
      const url = typeof src === "string" ? src : "";
      // eslint-disable-next-line @next/next/no-img-element -- raw PNGs in issues are already final files
      if (!url.startsWith(ASSET_SCHEME)) return <img src={url} alt={alt ?? ""} className="mx-auto rounded-xl" />;
      const fig = resolveFigure(url);
      if (!(fig.step && fig.asset.id === lastStepped)) figure += 1;
      lastStepped = fig.step ? fig.asset.id : null;
      return <IssueFigure fig={fig} number={figure} />;
    },
    // A figure is an image alone in a paragraph; <figure> can't sit inside <p>.
    p: ({ children, ...rest }: ComponentProps<"p">) =>
      isFigureOnly(children) ? <>{children}</> : <p {...rest}>{children}</p>,
    blockquote: ({ children, ...rest }: ComponentProps<"blockquote">) => {
      const type = (rest as Record<string, unknown>)[CALLOUT_ATTR];
      if (typeof type === "string" && isCalloutType(type)) {
        const c = CALLOUTS[type];
        return (
          <Callout tone={c.tone} title={c.label} icon={c.icon}>
            {children}
          </Callout>
        );
      }
      return <blockquote {...rest}>{children}</blockquote>;
    },
  };
}

export async function issueBody(issue: Pick<Issue, "body">): Promise<ReactElement> {
  const { content } = await compileMDX({
    source: issue.body,
    components: components(),
    options: { parseFrontmatter: false, mdxOptions: { remarkPlugins: [remarkGfm, remarkCallouts] } },
  });
  return content;
}
