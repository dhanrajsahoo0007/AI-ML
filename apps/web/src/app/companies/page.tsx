import { Breadcrumb } from "@/components/breadcrumb";
import { CompanyExplorer } from "@/components/company-explorer";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/ui/editorial";
import { questionItems, SourceCredit } from "@/components/mdx/question-bank";
import { COMPANY_GROUPS, getCategories, getCompanies, getQuestions } from "@/lib/question-bank";

export const revalidate = 3600;

export const metadata = {
  title: "Interview questions by company",
  description: "Interview questions publicly reported at top AI companies, with our answers.",
};

export default function CompaniesPage() {
  const tagged = getQuestions().filter((q) => q.companies.length > 0);
  const companies = getCompanies().map((c) => ({
    ...c,
    count: tagged.filter((q) => q.companies.includes(c.slug)).length,
  }));
  const categoryTitles = new Map(getCategories().map((c) => [c.slug, c.title]));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Companies" }]} />
      <FadeIn>
        <PageHeader
          className="mt-10 mb-12 border-b border-hairline pb-12"
          title="Interview questions by company"
          lead="Pick a company to see the questions it is publicly reported to ask, across every topic, along with the reported roles and interview loop. Every question also carries its company tags in the topic pages."
        />
      </FadeIn>
      <CompanyExplorer groups={COMPANY_GROUPS} companies={companies} footer={<SourceCredit />}>
        {questionItems(tagged, (q) => categoryTitles.get(q.category)!)}
      </CompanyExplorer>
    </div>
  );
}
