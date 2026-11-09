import { Heading, Hr, Img, Link, Text } from "@react-email/components";
import { createElement as h, Fragment, type ComponentProps, type ReactElement } from "react";
import remarkGfm from "remark-gfm";
import { renderEmail, type RenderedEmail, IssueEmail, s } from "../email";
import { absoluteUrl } from "../seo/public";
import { CALLOUT_ATTR, CALLOUTS, isCalloutType, remarkCallouts } from "./callouts";
import { figurePng, resolveFigure } from "./figures";
import { ASSET_SCHEME, isFigureOnly, isPng } from "./links";
import type { Issue } from "./source";

// Renders an issue's MDX to the email HTML and text parts (plan §15.2: the same MDX becomes the web page and the
// email). Runs at send time (the send workflow) and in tests, never in a request. Links become absolute; images
// must be PNG. A premium issue sent to everyone carries only its summary and a link: the full text stays behind
// the paywall. createElement instead of JSX, like the templates (see email/templates/layout.ts).

const absolute = (href = "") => (href.startsWith("/") ? absoluteUrl(href) : href);

const emailComponents = {
  // A figure is an image alone in a paragraph; its caption is a paragraph of its own, so don't nest it in one.
  p: ({ children }: ComponentProps<"p">) =>
    isFigureOnly(children) ? h(Fragment, null, children) : h(Text, { style: s.text }, children),
  a: ({ href, children }: ComponentProps<"a">) => h(Link, { href: absolute(href), style: s.link }, children),
  h2: ({ children }: ComponentProps<"h2">) => h(Heading, { as: "h2", style: s.h2 }, children),
  h3: ({ children }: ComponentProps<"h3">) => h(Heading, { as: "h3", style: s.h3 }, children),
  ul: ({ children }: ComponentProps<"ul">) => h("ul", { style: s.list }, children),
  ol: ({ children }: ComponentProps<"ol">) => h("ol", { style: s.list }, children),
  code: ({ children }: ComponentProps<"code">) => h("code", { style: s.code }, children),
  blockquote: ({ children, ...rest }: ComponentProps<"blockquote">) => {
    const type = (rest as Record<string, unknown>)[CALLOUT_ATTR];
    if (typeof type === "string" && isCalloutType(type)) {
      // A callout: a tinted, labelled box (email clients ignore most CSS, so it stays simple).
      return h(
        "div",
        { style: s.callout },
        h(Text, { style: s.calloutLabel }, CALLOUTS[type].label.toUpperCase()),
        children
      );
    }
    return h("blockquote", { style: s.quote }, children);
  },
  hr: () => h(Hr, { style: s.hr }),
  img: ({ src, alt }: ComponentProps<"img">) => {
    const url = typeof src === "string" ? src : "";
    if (url.startsWith(ASSET_SCHEME)) return figureImg(url);
    if (!isPng(url)) throw new Error(`email images must be PNG: ${url}`);
    return h(Img, { src: absolute(url), alt: alt ?? "", style: { maxWidth: "100%", height: "auto" } });
  },
};

/** An `asset:` figure: its PNG (of the step, for a build-up figure) with the caption under it. */
function figureImg(src: string): ReactElement {
  const fig = resolveFigure(src);
  const png = figurePng(fig);
  if (!png?.url) {
    throw new Error(`figure ${src}: no public PNG; the issue must be visible in this build (npm run assets -w web)`);
  }
  return h(
    Fragment,
    null,
    h(Img, { src: absoluteUrl(png.url), alt: fig.alt, width: 536, style: s.figure }),
    fig.caption ? h(Text, { style: s.figureCaption }, fig.caption) : null
  );
}

interface RenderIssueOptions {
  /** Footer unsubscribe link: Resend's {{{RESEND_UNSUBSCRIBE_URL}}} placeholder for broadcasts. */
  unsubscribeUrl: string;
}

/** True when the email may carry the full text: free issues, and premium issues sent to Pro members only. */
export const emailCarriesBody = (issue: Pick<Issue, "access" | "audience">) =>
  issue.access === "free" || issue.audience === "pro";

async function compileBody(source: string): Promise<ReactElement> {
  // Imported on use: the send script runs as CommonJS under tsx, and the MDX toolchain is ESM-only.
  const { compileMDX } = await import("next-mdx-remote/rsc");
  const { content } = await compileMDX({
    source,
    components: emailComponents,
    options: { parseFrontmatter: false, mdxOptions: { remarkPlugins: [remarkGfm, remarkCallouts] } },
  });
  return content;
}

export async function renderIssueEmail(issue: Issue, opts: RenderIssueOptions): Promise<RenderedEmail> {
  const webUrl = absoluteUrl(issue.href);
  const body = emailCarriesBody(issue)
    ? await compileBody(issue.body)
    : h(
        Fragment,
        null,
        h(Text, { style: s.text }, issue.summary),
        h(
          Text,
          { style: s.text },
          "This issue is for Pro members. ",
          h(Link, { href: webUrl, style: s.link }, "Read it on the web"),
          "."
        )
      );
  const kicker = [issue.number !== undefined && `Issue #${issue.number}`, `${issue.readingTime} min read`]
    .filter(Boolean)
    .join(" · ");
  return renderEmail(
    h(
      IssueEmail,
      {
        title: issue.title,
        summary: issue.summary,
        webUrl,
        unsubscribeUrl: opts.unsubscribeUrl,
        // The cover PNG route (app/newsletter/[slug]/share/[file]); built for every issue with a cover.
        coverUrl: issue.cover ? absoluteUrl(`${issue.href}/share/email.png`) : undefined,
        kicker,
        takeaways: emailCarriesBody(issue) ? issue.takeaways : [],
      },
      body
    )
  );
}
