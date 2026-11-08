import { notFound } from "next/navigation";
import { resolveSubsection, SubsectionView, subsectionSeo } from "@/features/interviews";
import { premiumAnswerCategories } from "@/features/paywall/access";
import { PREVIEW_SEGMENT } from "@/features/paywall/constants";

// `/interviews/<category>/<subsection>/_preview`: the public preview of a subsection whose answers are premium
// (plan §9.1, §9.2). Only built for premium-answer categories while the paywall is on.

type Params = Promise<{ category: string; subsection: string; variant: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return premiumAnswerCategories().flatMap((c) =>
    c.subsections.map((s) => ({ category: c.slug, subsection: s, variant: PREVIEW_SEGMENT }))
  );
}

function resolvePreview(p: Awaited<Params>) {
  if (p.variant !== PREVIEW_SEGMENT || !premiumAnswerCategories().some((c) => c.slug === p.category)) return null;
  return resolveSubsection(p.category, p.subsection);
}

export async function generateMetadata({ params }: { params: Params }) {
  const found = resolvePreview(await params);
  return found ? subsectionSeo(found).metadata : {};
}

export default async function SubsectionPreviewPage({ params }: { params: Params }) {
  const found = resolvePreview(await params);
  if (!found) notFound();
  return <SubsectionView found={found} preview />;
}
