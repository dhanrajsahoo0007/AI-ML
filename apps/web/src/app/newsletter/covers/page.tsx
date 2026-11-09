import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/ui/editorial";
import { NEWSLETTER_KIND } from "@/features/newsletter";
import { CoverGallery } from "@/features/newsletter/cover/cover-gallery.client";
import { resolveAppEnv, routeSection } from "@/features/sections";

// Cover gallery for authors (plan §2): pick an issue's cover by eye. Built on local, preview and staging only;
// never in production, never indexed.

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Cover gallery",
  robots: { index: false, follow: false },
};

export default function CoverGalleryPage() {
  if (resolveAppEnv() === "production") notFound();
  const section = routeSection(NEWSLETTER_KIND);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: section.label, href: section.href }, { label: "Covers" }]}
      />
      <PageHeader
        className="mt-10 mb-8"
        title="Cover gallery"
        lead="Every motif in every palette. Step the seed until a cover fits the issue, then put its cover line in the issue's frontmatter."
      />
      <CoverGallery />
    </div>
  );
}
