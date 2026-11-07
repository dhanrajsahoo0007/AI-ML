import { business, SITE_URL } from "../../config/business";
import { absoluteUrl, PAYWALL_CONTAINER_CLASS, SITE_NAME } from "./site";

// schema.org JSON-LD builders (plan §6 P11). Pure functions: each page renders the result with <JsonLd>.

export type JsonLdNode = { "@type": string; [key: string]: unknown };
export type JsonLdDocument = { "@context": "https://schema.org"; "@graph": JsonLdNode[] };

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationNode(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    founder: { "@type": "Person", name: business.FOUNDER_NAME },
  };
}

export function websiteNode(description: string): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export interface Crumb {
  label: string;
  /** Site path; the last crumb (the page itself) may leave it out and gets `currentPath`. */
  href?: string;
}

export function breadcrumbNode(crumbs: Crumb[], currentPath: string): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: absoluteUrl(c.href ?? currentPath),
    })),
  };
}

interface ArticleInput {
  path: string;
  headline: string;
  description: string;
  /** ISO date from the build-time content dates; omitted when unknown. */
  dateModified?: string | null;
  access: "free" | "premium";
}

/**
 * An `Article`. Premium articles carry Google's paywalled-content markup: `isAccessibleForFree: false` and a
 * `hasPart` whose `cssSelector` matches the container that wraps the premium part (PAYWALL_CONTAINER_CLASS).
 */
export function articleNode(input: ArticleInput): JsonLdNode {
  const url = absoluteUrl(input.path);
  const premium = input.access === "premium";
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: input.headline.length > 110 ? `${input.headline.slice(0, 109)}…` : input.headline,
    description: input.description,
    url,
    mainEntityOfPage: url,
    inLanguage: "en",
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    isAccessibleForFree: !premium,
    ...(premium
      ? {
          hasPart: {
            "@type": "WebPageElement",
            isAccessibleForFree: false,
            cssSelector: `.${PAYWALL_CONTAINER_CLASS}`,
          },
        }
      : {}),
  };
}

/** A listing page: section index, hub, interview category or subsection, company directory. */
export function collectionPageNode({ path, name, description }: { path: string; name: string; description: string }) {
  const url = absoluteUrl(path);
  return {
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    name,
    description,
    url,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
  } satisfies JsonLdNode;
}

/** Several nodes in one document, so `@id` references resolve within the page. */
export function jsonLdGraph(...nodes: JsonLdNode[]): JsonLdDocument {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/**
 * JSON for an inline <script type="application/ld+json">. `<`, `>` and `&` are escaped so a value can never
 * close the script element; U+2028/2029 are escaped for old parsers.
 */
export function serializeJsonLd(doc: JsonLdDocument): string {
  return JSON.stringify(doc)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
