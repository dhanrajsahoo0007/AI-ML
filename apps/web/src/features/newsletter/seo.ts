import "server-only";
import { articleNode, breadcrumbNode, jsonLdGraph, pageMetadata } from "../seo/public";
// By path: the seo index carries JSX, and this module is reached by the API routes' server-only integration test.
import { listingPageSeo } from "../seo/pages";
import type { PageSeo } from "../seo";
import type { SectionDef } from "../sections";
import { seriesHref } from "./catalog";
import { NEWSLETTER_KIND, newsletterKind } from "./kind";
import { isPublished, type Issue } from "./source";

// Metadata and JSON-LD for the newsletter pages, through features/seo. Drafts and scheduled issues are built for
// review outside production only, and never indexed.

export const ARCHIVE_TITLE = "Newsletter";
export { NEWSLETTER_NAME, NEWSLETTER_PROMISE } from "./brand";
export const ARCHIVE_DESCRIPTION =
  "A short email digest on system design and AI engineering: one theme, three articles from the library and a question to take into your next design review.";

export function archiveSeo(section: SectionDef): PageSeo {
  return listingPageSeo({
    kind: NEWSLETTER_KIND,
    path: section.href,
    title: ARCHIVE_TITLE,
    description: ARCHIVE_DESCRIPTION,
    crumbs: [{ label: "Home", href: "/" }, { label: section.label }],
  });
}

export function issueSeo(section: SectionDef, issue: Issue): PageSeo {
  return {
    metadata: pageMetadata({
      path: issue.href,
      title: issue.title,
      description: issue.summary,
      type: "article",
      modifiedTime: issue.date,
      sectionState: section.state,
      noindex: !isPublished(issue),
      // The issue's own cover card (src/app/newsletter/[slug]/opengraph-image.tsx), not the site's.
      image: { path: `${issue.href}/opengraph-image`, alt: `${issue.title}: issue cover` },
    }),
    jsonLd: jsonLdGraph(
      articleNode({
        path: issue.href,
        headline: issue.title,
        description: issue.summary,
        dateModified: issue.date,
        access: newsletterKind.access(section, issue),
      }),
      breadcrumbNode(
        [{ label: "Home", href: "/" }, { label: section.label, href: section.href }, { label: issue.title }],
        issue.href
      )
    ),
  };
}

/** Utility pages (confirm, unsubscribe): never indexed. */
export function utilityPageMetadata(section: SectionDef, path: string, title: string, description: string) {
  return pageMetadata({
    path: `${section.href}/${path}`,
    title,
    description,
    sectionState: section.state,
    noindex: true,
  });
}

/** A series page: indexed once the series holds a sent issue. */
export function seriesSeo(
  section: SectionDef,
  series: { key: string; title: string; description: string },
  hasSent: boolean
): PageSeo {
  const path = seriesHref(section.href, series.key);
  return {
    metadata: pageMetadata({
      path,
      title: `${series.title}: a newsletter series`,
      description: series.description,
      sectionState: section.state,
      noindex: !hasSent,
    }),
    jsonLd: jsonLdGraph(
      breadcrumbNode(
        [{ label: "Home", href: "/" }, { label: section.label, href: section.href }, { label: series.title }],
        path
      )
    ),
  };
}
