import { isBuilt, loadIssues, NEWSLETTER_KIND, newsletterKind } from "@/features/newsletter";
import { coverPng, PNG_VARIANTS, type PngVariant } from "@/features/newsletter/cover/social-card";
import { isRouteBuilt, routeSection, sectionOfKind } from "@/features/sections";

// PNG renditions of an issue's cover, built once at build time: /newsletter/<slug>/share/<variant>.png.
//   email.png     the email header (no text)
//   portrait.png  1080×1350, LinkedIn single image and carousel slide 1
//   square.png    1080×1080
// The link preview is the segment's opengraph-image. Only issues with a cover get files.

export const dynamic = "force-static";
export const dynamicParams = false;

const FILES = PNG_VARIANTS.filter((v) => v !== "og").map((v) => `${v}.png`);

export function generateStaticParams() {
  if (!isRouteBuilt(NEWSLETTER_KIND)) return [];
  const section = sectionOfKind(NEWSLETTER_KIND);
  const built = new Set(newsletterKind.staticParams(section, loadIssues(section)).map((p) => p.slug));
  return loadIssues(section)
    .filter((i) => built.has(i.slug) && i.cover)
    .flatMap((i) => FILES.map((file) => ({ slug: i.slug, file })));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await params;
  const issue = loadIssues(routeSection(NEWSLETTER_KIND)).find((i) => i.slug === slug && isBuilt(i));
  const variant = file.replace(/\.png$/, "") as PngVariant;
  if (!issue?.cover || !FILES.includes(file)) return new Response("Not found", { status: 404 });
  return coverPng({ ...issue, cover: issue.cover }, variant);
}
