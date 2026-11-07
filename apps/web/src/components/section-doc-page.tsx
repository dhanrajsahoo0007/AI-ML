import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ArticleLayout } from "@/components/article-layout";
import { loadMdxFile } from "@/lib/mdx-doc";
import { getUpdatedDate } from "@/lib/doc-meta";
import { loadDocItems } from "@/features/docs/source";
import { isPremiumDoc } from "@/features/paywall/access";
import { Paywall } from "@/features/paywall/paywall";
import { getSection } from "@/features/sections/registry";
import type { BreadcrumbItem, ContentSection } from "@/types/content";

// Article page for catch-all section routes (/<section>/<hub>/<article>). A premium article (plan §9.2) is built
// twice: the full page, which middleware serves only with a Pro entitlement, and its public `preview`, which
// compiles only the first blocks of the MDX and ends with the paywall.
export async function SectionDocPage({
  section,
  label,
  slug,
  preview = false,
}: {
  section: ContentSection;
  label: string;
  slug: string[];
  preview?: boolean;
}) {
  const slugPath = slug.join("/");
  const def = getSection(section);
  const item = def && loadDocItems(def).find((i) => i.slug === slugPath);
  if (!def || !item) notFound();
  const premium = isPremiumDoc(def, item);
  if (preview && !premium) notFound();

  const blocks = typeof item.data.preview === "number" ? item.data.preview : undefined;
  const doc = await loadMdxFile(item.file, { premium: preview ? { mode: "preview", blocks } : { mode: "full" } });

  const crumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label, href: `/${section}` },
  ];
  if (slug.length > 1) {
    crumbs.push({
      label: slug[0].replaceAll("-", " "),
      href: `/${section}/${slug[0]}`,
    });
  }
  crumbs.push({ label: doc.frontmatter.title ?? slugPath });

  // Articles (pages below a hub) use the docs-style layout: table of contents, updated date, copy for LLM.
  // Hubs stay card grids, and an article can opt out with `layout: classic` in its frontmatter.
  const docsLayout = slug.length > 1 && doc.frontmatter.layout !== "classic";
  const docs = docsLayout
    ? {
        headings: doc.headings,
        updated: await getUpdatedDate(doc.filePath, doc.frontmatter.updated),
        pagePath: `/${section}/${slugPath}`,
      }
    : undefined;

  return (
    <div data-access={premium ? (preview ? "preview" : "full") : "free"}>
      <div className={`mx-auto px-4 pt-6 md:px-8 ${docsLayout ? "max-w-6xl" : "max-w-4xl"}`}>
        <Breadcrumb items={crumbs} />
      </div>
      <ArticleLayout
        title={doc.frontmatter.title ?? slugPath}
        description={doc.frontmatter.description}
        docs={docs}
      >
        {doc.body}
        {preview && <Paywall path={item.href} />}
      </ArticleLayout>
    </div>
  );
}
