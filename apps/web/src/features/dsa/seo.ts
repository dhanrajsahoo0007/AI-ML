import "server-only";
import { getUpdatedDate } from "@/lib/doc-meta";
import type { SectionDef } from "../sections";
import type { PageSeo } from "../seo";
import { articleNode, breadcrumbNode, collectionPageNode, jsonLdGraph, type Crumb, pageMetadata } from "../seo/public";
import { problemListHref } from "./kind";
import type { ValidProblem, ValidTopic } from "./source";

// Metadata and JSON-LD for the problems-kind routes, built with the shared helpers in src/features/seo.
// `hidden` sections get noindex through pageMetadata's sectionState.

export const HUB_TITLE = "Data structures and algorithms";
export const HUB_DESCRIPTION =
  "Coding interview patterns explained from first principles, with problems you can solve and test in the browser.";
export const LIST_TITLE = "DSA problems";
export const LIST_DESCRIPTION = "Coding interview problems by difficulty, pattern and company, with in-browser tests.";

export const hubCrumbs = (section: SectionDef): Crumb[] => [
  { label: "Home", href: "/" },
  { label: section.label, href: section.href },
];

function listing(section: SectionDef, path: string, title: string, description: string, crumbs: Crumb[]): PageSeo {
  return {
    metadata: pageMetadata({ path, title, description, sectionState: section.state }),
    jsonLd: jsonLdGraph(collectionPageNode({ path, name: title, description }), breadcrumbNode(crumbs, path)),
  };
}

export function hubSeo(section: SectionDef): PageSeo {
  return listing(section, section.href, HUB_TITLE, HUB_DESCRIPTION, [
    { label: "Home", href: "/" },
    { label: section.label },
  ]);
}

export function listSeo(section: SectionDef): PageSeo {
  return listing(section, problemListHref(section), LIST_TITLE, LIST_DESCRIPTION, [
    ...hubCrumbs(section),
    { label: "Problems" },
  ]);
}

async function articleSeo(
  section: SectionDef,
  item: { href: string; title: string; file: string; description: string },
  access: "free" | "premium",
  crumbs: Crumb[],
  updated?: string | Date
): Promise<PageSeo> {
  const dateModified = await getUpdatedDate(item.file, updated);
  return {
    metadata: pageMetadata({
      path: item.href,
      title: item.title,
      description: item.description,
      type: "article",
      modifiedTime: dateModified,
      sectionState: section.state,
    }),
    jsonLd: jsonLdGraph(
      articleNode({ path: item.href, headline: item.title, description: item.description, dateModified, access }),
      breadcrumbNode(crumbs, item.href)
    ),
  };
}

export function topicSeo(section: SectionDef, topic: ValidTopic) {
  const item = { href: topic.href, title: topic.fm.title, file: topic.file, description: topic.fm.description };
  return articleSeo(section, item, "free", [...hubCrumbs(section), { label: topic.fm.title }], topic.fm.updated);
}

/** A premium problem carries the paywalled-content markup: its editorial sits in the paywall container. */
export function problemSeo(section: SectionDef, problem: ValidProblem, access: "free" | "premium") {
  const item = { href: problem.href, title: problem.fm.title, file: problem.file, description: problem.fm.description };
  const crumbs = [
    ...hubCrumbs(section),
    { label: "Problems", href: problemListHref(section) },
    { label: problem.fm.title },
  ];
  return articleSeo(section, item, access, crumbs);
}
