import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ArticleLayout } from "@/components/article-layout";
import { TierBadge } from "@/components/patterns/tier-badge";
import { SectionProgressBanner } from "@/components/section-progress-banner.client";
import { loadMdxFile } from "@/lib/mdx-doc";
import { getUpdatedDate } from "@/lib/doc-meta";
import { sectionLeafItems } from "@/lib/progress-stats";
import { docsKind } from "./kind";
import { loadDocItems } from "./source";
import { TopicQuestions } from "@/components/mdx/question-bank";
import { isPremiumDoc, premiumAnswerCategories } from "@/features/paywall";
import { Paywall } from "@/features/paywall/public";
import { ArticleCompletedBadge, ProgressActions } from "@/features/progress/progress-actions.client";
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
  const items = def ? loadDocItems(def) : [];
  const item = items.find((i) => i.slug === slugPath);
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
    const hubExists = items.some((i) => i.isHub && i.slug === slug[0]);
    crumbs.push({
      label: slug[0].replaceAll("-", " "),
      ...(hubExists ? { href: `/${section}/${slug[0]}` } : {}),
    });
  }
  crumbs.push({ label: doc.frontmatter.title ?? slugPath });

  const leafItems = sectionLeafItems(docsKind.nav(def, items));
  const sectionHrefs = leafItems.map((i) => i.href);
  const currentIdx = !item.isHub ? leafItems.findIndex((i) => i.href === item.href) : -1;
  const prev =
    currentIdx > 0 ? { title: leafItems[currentIdx - 1].title, href: leafItems[currentIdx - 1].href } : undefined;
  const next =
    currentIdx >= 0 && currentIdx < leafItems.length - 1
      ? { title: leafItems[currentIdx + 1].title, href: leafItems[currentIdx + 1].href }
      : undefined;

  // Articles (pages below a hub) use the docs-style layout: table of contents, updated date, copy for LLM.
  // Hubs stay card grids, and an article can opt out with `layout: classic` in its frontmatter.
  const docsLayout = slug.length > 1 && doc.frontmatter.layout !== "classic";
  // Advanced pattern pages carry the tier pill in the header, in the paywalled preview too.
  const tierBadge = !item.isHub && item.data.tier === "advanced" ? <TierBadge className="ml-3 align-middle" /> : null;
  const docs = docsLayout
    ? {
        headings: doc.headings,
        updated: await getUpdatedDate(doc.filePath, doc.frontmatter.updated),
        pagePath: `/${section}/${slugPath}`,
        statusBadge:
          tierBadge || (!preview && !item.isHub) ? (
            <>
              {tierBadge}
              {!preview && !item.isHub && (
                <ArticleCompletedBadge
                  contentKey={item.href.slice(1)}
                  sectionLabel={def.label}
                  sectionHrefs={sectionHrefs}
                />
              )}
            </>
          ) : undefined,
      }
    : undefined;

  // Library questions tagged to this page. The public preview of a premium page ends at the paywall, so it lists
  // none. On a free page the answers of premium-answer categories stay locked, as on the companies page; a
  // premium page is served only with Pro, so there they are open.
  const premiumAnswers = new Set(premium ? [] : premiumAnswerCategories().map((c) => c.slug));

  return (
    <div data-access={premium ? (preview ? "preview" : "full") : "free"}>
      <div
        className={`mx-auto px-4 pt-6 md:px-8 min-[1440px]:max-w-none min-[1440px]:px-12 min-[1920px]:px-16 ${docsLayout ? "max-w-6xl" : "max-w-4xl"}`}
      >
        <Breadcrumb items={crumbs} />
      </div>
      <ArticleLayout
        title={doc.frontmatter.title ?? slugPath}
        description={doc.frontmatter.description}
        docs={docs}
        after={
          preview ? (
            <Paywall path={item.href} />
          ) : !item.isHub ? (
            <ProgressActions
              contentKey={item.href.slice(1)}
              sectionLabel={def.label}
              sectionHref={def.href}
              sectionHrefs={sectionHrefs}
              prev={prev}
              next={next}
            />
          ) : undefined
        }
      >
        {item.isHub && <SectionProgressBanner sectionLabel={def.label} items={leafItems} />}
        {doc.body}
        {!preview && <TopicQuestions href={item.href} locked={(q) => premiumAnswers.has(q.category)} />}
      </ArticleLayout>
    </div>
  );
}
