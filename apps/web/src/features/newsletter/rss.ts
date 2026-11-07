import { absoluteUrl } from "../seo/site";
import { isPublished, type Issue } from "./source";

// The newsletter feed: titles, links and summaries of sent issues only. Never the body (plan §11.10: feeds carry
// titles and summaries, never full text), so it is safe for premium issues too.

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export interface FeedInfo {
  title: string;
  description: string;
  /** Site path of the archive, e.g. the section href. */
  path: string;
}

export function buildRss(
  feed: FeedInfo,
  issues: Pick<Issue, "title" | "href" | "date" | "summary" | "status">[]
): string {
  const link = absoluteUrl(feed.path);
  const items = issues.filter(isPublished).map((i) => {
    const url = absoluteUrl(i.href);
    return [
      "    <item>",
      `      <title>${escapeXml(i.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <pubDate>${new Date(`${i.date}T00:00:00Z`).toUTCString()}</pubDate>`,
      `      <description>${escapeXml(i.summary)}</description>`,
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(feed.title)}</title>`,
    `    <link>${escapeXml(link)}</link>`,
    `    <description>${escapeXml(feed.description)}</description>`,
    "    <language>en</language>",
    `    <atom:link href="${escapeXml(`${link}/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
