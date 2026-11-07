import { Suspense } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { CompanyExplorer } from "@/components/company-explorer";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/ui/editorial";
import { questionItems, SourceCredit } from "@/components/mdx/question-bank";
import { premiumAnswerCategories } from "@/features/paywall/access";
import { COMPANY_GROUPS, getCategories, getCompanies, getQuestions } from "@/lib/question-bank";
import { routeSection } from "@/features/sections/route-helpers";
import { directoryRefs } from "@/features/sections/kinds";
import { getSection } from "@/features/sections/registry";
import { JsonLd } from "@/features/seo/json-ld-script";
import { listingPageSeo } from "@/features/seo/pages";

function companiesSeo() {
  const section = routeSection("directory");
  return listingPageSeo({
    kind: "directory",
    path: section.href,
    title: "Interview questions by company",
    description: "Interview questions publicly reported at top AI companies, with our answers.",
    crumbs: [{ label: "Home", href: "/" }, { label: section.label }],
  });
}

// The social image comes from ./opengraph-image.tsx in this folder (Next merges it into this page).
export function generateMetadata() {
  return companiesSeo().metadata;
}

export default async function CompaniesPage() {
  const section = routeSection("directory");
  // Counts and questions come only from the aggregated sections that are `on` (Interview Practice
  // today; DSA later).
  const refs = await directoryRefs(section);
  const fromBank = (section.aggregates ?? []).some((key) => {
    const s = getSection(key);
    return s?.kind === "question-bank" && s.state === "on";
  });
  const tagged = fromBank ? getQuestions().filter((q) => q.companies.length > 0) : [];
  const companies = getCompanies().map((c) => ({
    ...c,
    count: refs.filter((r) => r.company === c.slug).length,
  }));
  const categoryTitles = new Map(getCategories().map((c) => [c.slug, c.title]));
  // Answers of premium-answer categories stay on their (gated) category pages, never on this public one.
  const premiumAnswers = new Set(premiumAnswerCategories().map((c) => c.slug));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <JsonLd data={companiesSeo().jsonLd} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: section.label }]} />
      <FadeIn>
        <PageHeader
          className="mt-10 mb-12 border-b border-hairline pb-12"
          title="Interview questions by company"
          lead="Pick a company to see the questions it is publicly reported to ask, across every topic, along with the reported roles and interview loop. Every question also carries its company tags in the topic pages."
        />
      </FadeIn>
      <Suspense>
      <CompanyExplorer groups={COMPANY_GROUPS} companies={companies} footer={<SourceCredit />}>
        {questionItems(
          tagged,
          (q) => categoryTitles.get(q.category)!,
          (q) => premiumAnswers.has(q.category)
        )}
      </CompanyExplorer>
      </Suspense>
    </div>
  );
}
