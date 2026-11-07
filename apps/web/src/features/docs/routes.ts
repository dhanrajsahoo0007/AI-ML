import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
  return docsKind.staticParams(section, await docsKind.load(section)) as { slug: string[] }[];
}

/** `hidden` sections are built for review but kept out of search engines. */
export function sectionRobots(section: SectionDef): Metadata["robots"] | undefined {
  return section.state === "hidden" ? { index: false, follow: false } : undefined;
}
