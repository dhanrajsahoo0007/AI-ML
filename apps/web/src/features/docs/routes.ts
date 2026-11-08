import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isPremiumDoc } from "../paywall/access";
import { PREVIEW_SEGMENT } from "../paywall/constants";
import { builtSectionsOfKind, getSection } from "../sections/registry";
import type { SectionDef } from "../sections/schema";
import { docsKind } from "./kind";

// Helpers for the shared docs routes, app/(content)/[section]/…: one route pair serves every docs
// section that is built in this environment (`on` or `hidden`); `off` sections are never generated.

export type SectionParams = Promise<{ section: string }>;
export type DocParams = Promise<{ section: string; slug: string[] }>;

export function docsSectionParams() {
  return builtSectionsOfKind("docs").map((s) => ({ section: s.key }));
}

/** The built docs section for a [section] param, or a 404. */
export function docsSection(param: string): SectionDef {
  const section = getSection(param);
  if (!section || section.kind !== "docs" || section.state === "off") notFound();
  return section;
}

export async function docsItems(section: SectionDef) {
  return docsKind.load(section);
}

export async function docSlugParams(param: string) {
  const section = getSection(param);
  if (!section || section.kind !== "docs" || section.state === "off") return [];
  const items = await docsKind.load(section);
  // Every premium page also gets its public preview, `<path>/_preview`, which middleware serves to visitors
  // without Pro (plan §9.2).
  const previews = items
    .filter((i) => isPremiumDoc(section, i))
    .map((i) => ({ slug: [...i.segments, PREVIEW_SEGMENT] }));
  return [...(docsKind.staticParams(section, items) as { slug: string[] }[]), ...previews];
}

/** Splits a docs route's slug into the page and its variant (`[..., "_preview"]` is the public preview). */
export function docVariant(slug: string[]): { slug: string[]; preview: boolean } {
  return slug.at(-1) === PREVIEW_SEGMENT && slug.length > 1
    ? { slug: slug.slice(0, -1), preview: true }
    : { slug, preview: false };
}

/** `hidden` sections are built for review but kept out of search engines. */
export function sectionRobots(section: SectionDef): Metadata["robots"] | undefined {
  return section.state === "hidden" ? { index: false, follow: false } : undefined;
}
