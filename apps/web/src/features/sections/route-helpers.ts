import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sectionOfKind } from "./registry";
import type { SectionDef, SectionKindName } from "./schema";

// For kinds with their own route folder (app/interviews for question-bank, app/companies for
// directory): resolve the section, 404 when it is off, and keep hidden ones out of search engines.

export function routeSection(kind: SectionKindName): SectionDef {
  const section = sectionOfKind(kind);
  if (section.state === "off") notFound();
  return section;
}

/** generateStaticParams helper: no pages for a section that is off. */
export function isRouteBuilt(kind: SectionKindName): boolean {
  return sectionOfKind(kind).state !== "off";
}

export function routeMetadata(kind: SectionKindName): Metadata {
  return sectionOfKind(kind).state === "hidden" ? { robots: { index: false, follow: false } } : {};
}
