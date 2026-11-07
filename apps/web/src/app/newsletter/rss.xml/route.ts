import { NEWSLETTER_KIND } from "@/features/newsletter/kind";
import { buildRss } from "@/features/newsletter/rss";
import { ARCHIVE_DESCRIPTION } from "@/features/newsletter/seo";
import { loadIssues } from "@/features/newsletter/source";
import { sectionOfKind } from "@/features/sections/registry";
import { SITE_NAME } from "@/features/seo/site";

// /newsletter/rss.xml: titles, links and summaries of sent issues, never their text (plan §11.10). Built once at
// build time. Only while the section is `on`: a hidden or off section has no public feed.

export const dynamic = "force-static";

export function GET() {
  const section = sectionOfKind(NEWSLETTER_KIND);
  if (section.state !== "on") return new Response("Not found", { status: 404 });
  const xml = buildRss(
    { title: `${SITE_NAME} newsletter`, description: ARCHIVE_DESCRIPTION, path: section.href },
    loadIssues(section)
  );
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
