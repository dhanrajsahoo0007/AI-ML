import { notFound } from "next/navigation";
import { isBuilt, loadIssues, NEWSLETTER_KIND, newsletterKind } from "@/features/newsletter";
import { coverPng } from "@/features/newsletter/cover/social-card";
import { isRouteBuilt, routeSection, sectionOfKind } from "@/features/sections";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/features/seo";

// The issue's link preview (LinkedIn, X, Slack): its generative cover with the issue number and title. Issues
// without a cover yet (drafts) get the site's plain card. Rendered once at build, like the page.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Newsletter issue cover";

export const dynamicParams = false;

export function generateStaticParams() {
  if (!isRouteBuilt(NEWSLETTER_KIND)) return [];
  const section = sectionOfKind(NEWSLETTER_KIND);
  return newsletterKind.staticParams(section, loadIssues(section));
}

export default async function IssueOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = loadIssues(routeSection(NEWSLETTER_KIND)).find((i) => i.slug === slug && isBuilt(i));
  if (!issue) notFound();
  const { cover } = issue;
  return cover ? coverPng({ ...issue, cover }, "og") : ogImage({ title: issue.title, subtitle: issue.summary });
}
