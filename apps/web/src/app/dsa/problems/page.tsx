import type { ResolvingMetadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/ui/editorial";
import { ProblemList } from "@/features/dsa/problem-list.client";
import { dsaContent, dsaSection, problemIndex } from "@/features/dsa/routes";
import { hubCrumbs, LIST_DESCRIPTION, LIST_TITLE, listSeo } from "@/features/dsa/seo";
import { JsonLd } from "@/features/seo/json-ld-script";
import { withParentImages } from "@/features/seo/metadata";

export function generateMetadata(_props: unknown, parent: ResolvingMetadata) {
  return withParentImages(listSeo(dsaSection()).metadata, parent);
}

// The problem list: the build-time index is passed to a client component, which filters it in the browser.
export default function ProblemListPage() {
  const { section, problems } = dsaContent();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      <JsonLd data={listSeo(section).jsonLd} />
      <Breadcrumb items={[...hubCrumbs(section), { label: "Problems" }]} />
      <PageHeader className="mt-10 mb-10 border-b border-hairline pb-10" title={LIST_TITLE} lead={LIST_DESCRIPTION} />
      <ProblemList index={problemIndex(section, problems)} />
    </div>
  );
}
