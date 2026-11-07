import { notFound } from "next/navigation";
import { CategoryView, categorySeo } from "@/components/interviews/category-view";
import { isRouteBuilt } from "@/features/sections/route-helpers";
import { getCategories, getCategory } from "@/lib/question-bank";

export function generateStaticParams() {
  if (!isRouteBuilt("question-bank")) return [];
  return getCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  return categorySeo((await params).category)?.metadata ?? {};
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  return <CategoryView category={category} />;
}
