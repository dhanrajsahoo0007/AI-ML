import { notFound } from "next/navigation";
import { CategoryView, categorySeo, resolveSubsection, SubsectionView, subsectionSeo } from "@/features/interviews";
import { premiumAnswerCategories, PREVIEW_SEGMENT } from "@/features/paywall";
import { isRouteBuilt } from "@/features/sections";
import { getCategories, getCategory } from "@/lib/question-bank";

type Params = Promise<{ category: string; subsection: string }>;

// `/interviews/<category>/_preview` is the public preview of a category whose answers are premium (plan §9.1,
// §9.2); middleware serves it at the category's URL to visitors without Pro.
export function generateStaticParams() {
  if (!isRouteBuilt("question-bank")) return [];
  return [
    ...getCategories().flatMap((c) => c.subsections.map((s) => ({ category: c.slug, subsection: s.slug }))),
    ...premiumAnswerCategories().map((c) => ({ category: c.slug, subsection: PREVIEW_SEGMENT })),
  ];
}

const isCategoryPreview = (p: Awaited<Params>) =>
  p.subsection === PREVIEW_SEGMENT && premiumAnswerCategories().some((c) => c.slug === p.category);

export async function generateMetadata({ params }: { params: Params }) {
  const p = await params;
  if (isCategoryPreview(p)) return categorySeo(p.category)?.metadata ?? {};
  const found = resolveSubsection(p.category, p.subsection);
  return found ? subsectionSeo(found).metadata : {};
}

export default async function SubsectionPage({ params }: { params: Params }) {
  const p = await params;
  if (isCategoryPreview(p)) {
    const category = getCategory(p.category);
    if (!category) notFound();
    return <CategoryView category={category} preview />;
  }
  const found = resolveSubsection(p.category, p.subsection);
  if (!found) notFound();
  return <SubsectionView found={found} />;
}
