import "server-only";
import { siteConfig } from "@/config/site";
import { sectionOfKind } from "../sections/registry";
import type { SectionKindName } from "../sections/schema";
import type { PageSeo } from "./docs";
import { breadcrumbNode, collectionPageNode, jsonLdGraph, organizationNode, websiteNode, type Crumb } from "./json-ld";
import { pageMetadata } from "./metadata";
import { SITE_NAME } from "./site";

// SEO for pages outside the docs routes: the home page and the listing pages of the sections that have
// their own route folder (app/interviews for question-bank, app/companies for directory).

export function homeSeo(): PageSeo {
  return {
    metadata: pageMetadata({ path: "/", title: SITE_NAME, description: siteConfig.description, absoluteTitle: true }),
    jsonLd: jsonLdGraph(websiteNode(siteConfig.description), organizationNode()),
  };
}

interface ListingPageInput {
  kind: SectionKindName;
  path: string;
  title: string;
  description: string;
  /** Breadcrumb trail; the last item is the page itself. */
  crumbs: Crumb[];
  /** Static opengraph-image route to use, for pages nested below the folder that holds it. */
  image?: { path: string; alt: string };
}

/** A listing page of a route-folder section; `hidden` sections get noindex. */
export function listingPageSeo({ kind, path, title, description, crumbs, image }: ListingPageInput): PageSeo {
  const section = sectionOfKind(kind);
  return {
    metadata: pageMetadata({ path, title, description, sectionState: section.state, image }),
    jsonLd: jsonLdGraph(collectionPageNode({ path, name: title, description }), breadcrumbNode(crumbs, path)),
  };
}
