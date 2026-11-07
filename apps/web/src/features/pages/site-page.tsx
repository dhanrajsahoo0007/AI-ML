import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/ui/editorial";
import { loadPageDoc } from "./page-doc";

// Layout for simple site pages (legal, contact, security). These pages stay copyable and printable on purpose
// (`data-copy-ok="page"`, see features/content-protection): people need to quote the terms and copy our emails.
export async function SitePage({
  slug,
  crumb,
  contents = true,
}: {
  slug: string;
  /** Label of the parent crumb, e.g. "Legal". */
  crumb?: string;
  /** Show the "Contents" list of h2 headings. */
  contents?: boolean;
}) {
  const doc = await loadPageDoc(slug);
  const sections = doc.headings.filter((h) => h.level === 2);
  return (
    <div data-copy-ok="page" className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, ...(crumb ? [{ label: crumb }] : []), { label: doc.title }]}
      />
      <PageHeader
        className="mt-10 mb-10 border-b border-hairline pb-10"
        title={doc.title}
        lead={doc.description}
      />
      {contents && sections.length > 3 && (
        <nav aria-label="Contents" className="mb-12 rounded-2xl border border-hairline bg-paper-2/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Contents</p>
          <ol className="mt-4 grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
            {sections.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="text-ink-2 transition-colors hover:text-primary">
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="prose-editorial max-w-[72ch] [&_:is(h2,h3)]:scroll-mt-24">
        {doc.body}
      </div>
    </div>
  );
}
