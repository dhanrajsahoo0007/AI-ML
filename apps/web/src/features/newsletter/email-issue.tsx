import { Heading, Hr, Img, Link, Text } from "@react-email/components";
import type { ComponentProps, ReactElement } from "react";
import remarkGfm from "remark-gfm";
import { renderEmail, type RenderedEmail } from "../email/render";
import { IssueEmail } from "../email/templates/issue";
import { s } from "../email/templates/styles";
import { absoluteUrl } from "../seo/site";
import { isPng } from "./links";
import type { Issue } from "./source";

// Renders an issue's MDX to the email HTML and text parts (plan §15.2: the same MDX becomes the web page and the
// email). Runs at build or send time (the send workflow), never in a request. Links become absolute; images must be
// PNG. A premium issue sent to everyone carries only its summary and a link: the full text stays behind the
// paywall.

const absolute = (href = "") => (href.startsWith("/") ? absoluteUrl(href) : href);

const emailComponents = {
  p: (props: ComponentProps<"p">) => <Text style={s.text}>{props.children}</Text>,
  a: ({ href, children }: ComponentProps<"a">) => (
    <Link href={absolute(href)} style={s.link}>
      {children}
    </Link>
  ),
  h2: (props: ComponentProps<"h2">) => (
    <Heading as="h2" style={s.h2}>
      {props.children}
    </Heading>
  ),
  h3: (props: ComponentProps<"h3">) => (
    <Heading as="h3" style={s.h3}>
      {props.children}
    </Heading>
  ),
  ul: (props: ComponentProps<"ul">) => <ul style={s.list}>{props.children}</ul>,
  ol: (props: ComponentProps<"ol">) => <ol style={s.list}>{props.children}</ol>,
  code: (props: ComponentProps<"code">) => <code style={s.code}>{props.children}</code>,
  blockquote: (props: ComponentProps<"blockquote">) => <blockquote style={s.quote}>{props.children}</blockquote>,
  hr: () => <Hr style={s.hr} />,
  img: ({ src, alt }: ComponentProps<"img">) => {
    const url = typeof src === "string" ? src : "";
    if (!isPng(url)) throw new Error(`email images must be PNG: ${url}`);
    return <Img src={absolute(url)} alt={alt ?? ""} style={{ maxWidth: "100%", height: "auto" }} />;
  },
};

export interface RenderIssueOptions {
  /** Footer unsubscribe link: Resend's {{{RESEND_UNSUBSCRIBE_URL}}} placeholder for broadcasts. */
  unsubscribeUrl: string;
}

/** True when the email may carry the full text: free issues, and premium issues sent to Pro members only. */
export const emailCarriesBody = (issue: Pick<Issue, "access" | "audience">) =>
  issue.access === "free" || issue.audience === "pro";

export async function renderIssueEmail(issue: Issue, opts: RenderIssueOptions): Promise<RenderedEmail> {
  const webUrl = absoluteUrl(issue.href);
  let body: ReactElement;
  if (emailCarriesBody(issue)) {
    // Imported on use: the send script runs as CommonJS under tsx, and the MDX toolchain is ESM-only.
    const { compileMDX } = await import("next-mdx-remote/rsc");
    const { content } = await compileMDX({
      source: issue.body,
      components: emailComponents,
      options: { parseFrontmatter: false, mdxOptions: { remarkPlugins: [remarkGfm] } },
    });
    body = content;
  } else {
    body = (
      <>
        <Text style={s.text}>{issue.summary}</Text>
        <Text style={s.text}>
          This issue is for Pro members.{" "}
          <Link href={webUrl} style={s.link}>
            Read it on the web
          </Link>
          .
        </Text>
      </>
    );
  }
  return renderEmail(
    <IssueEmail title={issue.title} summary={issue.summary} webUrl={webUrl} unsubscribeUrl={opts.unsubscribeUrl}>
      {body}
    </IssueEmail>
  );
}
