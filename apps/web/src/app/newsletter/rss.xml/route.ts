import { NEWSLETTER_KIND, buildRss, ARCHIVE_DESCRIPTION, loadIssues } from "@/features/newsletter";
import { sectionOfKind } from "@/features/sections";
import { SITE_NAME } from "@/features/seo/public";

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
