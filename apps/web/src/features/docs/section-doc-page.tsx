import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ArticleLayout } from "@/components/article-layout";
import { loadMdxFile } from "@/lib/mdx-doc";
import { getUpdatedDate } from "@/lib/doc-meta";
import { loadDocItems } from "./source";
import { TopicQuestions } from "@/components/mdx/question-bank";
import { isPremiumDoc, premiumAnswerCategories } from "@/features/paywall";
import { Paywall } from "@/features/paywall/public";
import { ProgressActions } from "@/features/progress/progress-actions.client";
import { getSection } from "@/features/sections";
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
    // Link the hub only when it exists (test fixtures have no hub page).
    const hubExists = loadDocItems(def).some((i) => i.isHub && i.slug === slug[0]);
    crumbs.push({
      label: slug[0].replaceAll("-", " "),
      ...(hubExists ? { href: `/${section}/${slug[0]}` } : {}),
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

  // Library questions tagged to this page. The public preview of a premium page ends at the paywall, so it lists
  // none. On a free page the answers of premium-answer categories stay locked, as on the companies page; a
  // premium page is served only with Pro, so there they are open.
  const premiumAnswers = new Set(premium ? [] : premiumAnswerCategories().map((c) => c.slug));

  return (
    <div data-access={premium ? (preview ? "preview" : "full") : "free"}>
      <div className={`mx-auto px-4 pt-6 md:px-8 ${docsLayout ? "max-w-6xl" : "max-w-4xl"}`}>
        <Breadcrumb items={crumbs} />
      </div>
      <ArticleLayout
        title={doc.frontmatter.title ?? slugPath}
        description={doc.frontmatter.description}
        docs={docs}
        after={preview ? <Paywall path={item.href} /> : <ProgressActions contentKey={item.href.slice(1)} />}
      >
        {doc.body}
        {!preview && <TopicQuestions href={item.href} locked={(q) => premiumAnswers.has(q.category)} />}
      </ArticleLayout>
    </div>
  );
}
