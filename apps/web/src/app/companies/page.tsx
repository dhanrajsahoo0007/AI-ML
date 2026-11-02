import { GroupedIndex } from "@/components/grouped-index";
import { SourceCredit } from "@/components/mdx/question-bank";
import { COMPANY_GROUPS } from "@/lib/question-bank";

export const revalidate = 3600;

export default function CompaniesIndexPage() {
  return (
    <GroupedIndex
      section="companies"
      label="Companies"
      title="Company-wise interview questions"
      lead="What top AI companies are reported to ask, with our answers. Each page summarizes the publicly reported interview loop and every question tagged with that company, linked to the deep-dive that explains it."
      areas={COMPANY_GROUPS}
      footer={<SourceCredit />}
    />
  );
}
