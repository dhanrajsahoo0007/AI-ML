import type { Metadata, ResolvingMetadata } from "next";
import type { ReleaseState } from "../sections/schema";
import { absoluteUrl, SITE_NAME } from "./site";

/** Size of every opengraph-image route (features/seo/og-image.tsx). */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Builds the per-page <head> metadata (plan §6 P11): title, description, canonical, Open Graph, Twitter and
// robots. Each page passes its own path; nothing here reads the request.

interface PageSeoInput {
  /** Site path of the page, e.g. "/system-design/databases". Becomes the canonical URL and og:url. */
  path: string;
  /** Page title without the brand; the root layout's template appends " · <brand>". */
  title: string;
  description: string;
  /** "article" for articles, "website" for everything else. */
  type?: "website" | "article";
  /** ISO date of the last change (articles). */
  modifiedTime?: string | null;
  /** Release state of the page's section; `hidden` pages are built for review but never indexed. */
  sectionState?: ReleaseState;
  /** Frontmatter `seo.noindex`. */
  noindex?: boolean;
  /** Skip the title template (the home page shows the brand on its own). */
  absoluteTitle?: boolean;
  /**
   * Site path of a static opengraph-image route (e.g. "/interviews/opengraph-image"), for pages that sit more
   * than one level below it, where Next does not pass the image down.
   */
  image?: { path: string; alt: string };
}

export function pageRobots({ sectionState, noindex }: Pick<PageSeoInput, "sectionState" | "noindex">) {
  if (sectionState === "hidden") return { index: false, follow: false };
  if (noindex) return { index: false, follow: true };
  return { index: true, follow: true };
}

export function pageMetadata(input: PageSeoInput): Metadata {
  const url = absoluteUrl(input.path);
  const type = input.type ?? "website";
  // Open Graph and Twitter titles carry no template, so add the brand unless the title is the brand.
  const socialTitle = input.title === SITE_NAME ? SITE_NAME : `${input.title} · ${SITE_NAME}`;
  const images = input.image
    ? [
        {
          url: absoluteUrl(input.image.path),
          width: OG_WIDTH,
          height: OG_HEIGHT,
          alt: input.image.alt,
          type: "image/png",
        },
      ]
    : undefined;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: pageRobots(input),
    openGraph: {
      title: socialTitle,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      ...(images ? { images } : {}),
      ...(type === "article"
        ? { type: "article", ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}) }
        : { type: "website" }),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: input.description,
      ...(images ? { images } : {}),
    },
  };
}

/**
 * Keeps the Open Graph and Twitter images of the nearest opengraph-image file (root, section or route folder).
 * A page that sets its own `openGraph` replaces the parent's whole object, images included, so each page's
 * generateMetadata passes its `parent` here.
 */
export async function withParentImages(meta: Metadata, parent: ResolvingMetadata): Promise<Metadata> {
  const resolved = await parent;
  const ogImages = resolved.openGraph?.images;
  const twitterImages = resolved.twitter?.images;
  return {
    ...meta,
    openGraph: { ...meta.openGraph, ...(ogImages?.length ? { images: ogImages } : {}) },
    twitter: { ...meta.twitter, ...(twitterImages?.length ? { images: twitterImages } : {}) },
  };
}
