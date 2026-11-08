import "server-only";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getUpdatedDate } from "@/lib/doc-meta";
import { docsKind, loadDocItems } from "../docs";
import { getSection, frontmatterSchema, type SectionDef } from "../sections";
import {
  articleNode,
  breadcrumbNode,
  collectionPageNode,
  jsonLdGraph,
  type Crumb,
  type JsonLdDocument,
} from "./json-ld";
import { pageMetadata } from "./metadata";

// SEO for the shared docs routes, app/(content)/[section]/…: metadata and JSON-LD from the page's frontmatter,
// its section's registry entry and the build-time content dates. Build time only (pages are static).

export interface PageSeo {
  metadata: Metadata;
  jsonLd: JsonLdDocument;
}

const seoField = frontmatterSchema.shape.seo;

function builtDocsSection(param: string): SectionDef | undefined {
  const section = getSection(param);
  return section && section.kind === "docs" && section.state !== "off" ? section : undefined;
}

function sectionDescription(section: SectionDef) {
  return section.hub?.subtitle ?? siteConfig.description;
}

/** The section's index page, e.g. /system-design. */
export function docsSectionSeo(param: string): PageSeo | null {
  const section = builtDocsSection(param);
  if (!section) return null;
  const title = section.hub?.title ?? section.label;
  const description = sectionDescription(section);
  return {
    metadata: pageMetadata({ path: section.href, title, description, sectionState: section.state }),
    jsonLd: jsonLdGraph(
      collectionPageNode({ path: section.href, name: title, description }),
      breadcrumbNode([{ label: "Home", href: "/" }, { label: section.label }], section.href)
    ),
  };
}

/** A hub (/system-design/databases) or an article (/system-design/databases/b-trees). */
export async function docPageSeo(param: string, slug: string[]): Promise<PageSeo | null> {
  const section = builtDocsSection(param);
  if (!section) return null;
  const items = loadDocItems(section);
  const slugPath = slug.join("/");
  const item = items.find((i) => i.slug === slugPath);
  if (!item) return null;

  const seo = seoField.safeParse(item.data.seo);
  const title = (seo.success && seo.data?.title) || item.title;
  const description = item.description ?? sectionDescription(section);
  const noindex = seo.success && seo.data?.noindex === true;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: section.label, href: section.href },
  ];
  if (!item.isHub) {
    const hub = items.find((i) => i.isHub && i.slug === item.hub);
    crumbs.push({ label: hub?.title ?? item.hub.replaceAll("-", " "), href: `${section.href}/${item.hub}` });
  }
  crumbs.push({ label: item.title });
  const breadcrumbs = breadcrumbNode(crumbs, item.href);

  if (item.isHub) {
    return {
      metadata: pageMetadata({ path: item.href, title, description, sectionState: section.state, noindex }),
      jsonLd: jsonLdGraph(collectionPageNode({ path: item.href, name: item.title, description }), breadcrumbs),
    };
  }

  const updated = item.data.updated;
  const dateModified = await getUpdatedDate(
    item.file,
    typeof updated === "string" || updated instanceof Date ? updated : undefined
  );
  return {
    metadata: pageMetadata({
      path: item.href,
      title,
      description,
      type: "article",
      modifiedTime: dateModified,
      sectionState: section.state,
      noindex,
    }),
    jsonLd: jsonLdGraph(
      articleNode({
        path: item.href,
        headline: item.title,
        description,
        dateModified,
        access: docsKind.access(section, item),
      }),
      breadcrumbs
    ),
  };
}
