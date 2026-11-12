import Link from "next/link";
import type { ResolvingMetadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  DifficultyLabel,
  LeetCodeLink,
  ProEditorial,
  Tags,
  problemListHref,
  findOutline,
  outlineNotes,
  outlineStatement,
  problemEditorial,
  problemStatement,
  getProblem,
  problemLabels,
  problemParams,
  relatedLinks,
  workspaceProps,
  type ProblemParams,
  hubCrumbs,
  problemSeo,
  showsPremiumEditorialLocally,
} from "@/features/dsa";
import { ProblemWorkspace } from "@/features/dsa/problem-workspace.client";
import { withParentImages } from "@/features/seo/public";
import { JsonLd } from "@/features/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return problemParams();
}

export async function generateMetadata({ params }: { params: ProblemParams }, parent: ResolvingMetadata) {
  const found = findOutline((await params).slug);
  if (found) {
    const { title, description } = found.outline.fm;
    return withParentImages({ title, description, alternates: { canonical: found.outline.href } }, parent);
  }
  const { section, problem, access } = getProblem((await params).slug);
  return withParentImages((await problemSeo(section, problem, access)).metadata, parent);
}

// A problem: the statement (free), the in-browser workspace with the public tests, then the editorial, which
// a premium problem replaces with a Pro placeholder (its MDX is never compiled for this page). The one exception
// is the owner's local review on `next dev` (features/dsa/local-view.ts), which no other build can reach.
export default async function ProblemPage({ params }: { params: ProblemParams }) {
  const found = findOutline((await params).slug);
  if (found) return <OutlinePage section={found.section} outline={found.outline} />;
  const { section, problem, access } = getProblem((await params).slug);
  const { fm } = problem;
  const seo = await problemSeo(section, problem, access);
  const labels = problemLabels(section, problem);
  const editorial =
    access === "free" || (await showsPremiumEditorialLocally()) ? await problemEditorial(problem) : null;
  const related = relatedLinks(section, problem);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      <JsonLd data={seo.jsonLd} />
      <Breadcrumb
        items={[...hubCrumbs(section), { label: "Problems", href: problemListHref(section) }, { label: fm.title }]}
      />

      <header className="mt-10 mb-8 space-y-4 border-b border-hairline pb-8">
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">{fm.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <DifficultyLabel difficulty={fm.difficulty} />
          <span className="text-sm text-muted-foreground">
            {access === "free" ? "Free editorial" : "Pro editorial"}
          </span>
          <LeetCodeLink slug={fm.leetcode} id={fm.leetcodeId} />
        </div>
        <Tags label="Patterns" items={labels.patterns} />
        <Tags label="Asked at" items={labels.companies} />
      </header>

      <article className="prose-editorial" data-dsa-statement>
        {await problemStatement(problem)}
      </article>

      <ProblemWorkspace title={fm.title} {...workspaceProps(section, problem)} />

      <section aria-labelledby="editorial-heading" className="mt-12">
        <h2 id="editorial-heading" className="font-display text-2xl font-semibold text-ink">
          Editorial
        </h2>
        {editorial ? (
          <article className="prose-editorial mt-6" data-dsa-editorial>
            {editorial}
            <h2>Complexity</h2>
            <p>
              Time {fm.complexity.time}, extra space {fm.complexity.space}.
            </p>
          </article>
        ) : (
          <div className="mt-6">
            <ProEditorial />
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-12 border-t border-hairline pt-8">
          <h2 id="related-heading" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Related
          </h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {related.map((r) => (
              <li key={r.label}>
                {r.href ? (
                  <Link href={r.href} className="text-sm text-ink underline underline-offset-4">
                    {r.label}
                  </Link>
                ) : (
                  <span className="text-sm text-ink-2">{r.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// A statement-only outline: the problem as written in the owner's notes, before its starter code, tests and
// editorial exist. Same URL as the full problem will have.
async function OutlinePage({
  section,
  outline,
}: Pick<NonNullable<ReturnType<typeof findOutline>>, "section" | "outline">) {
  // The notes hold the solution, so they follow the editorial rule: compiled only for the owner's local review
  // (features/dsa/local-view.ts) until Pro delivery exists; every other build shows the Pro placeholder.
  const notes = outline.hasBreak && (await showsPremiumEditorialLocally()) ? await outlineNotes(outline.file) : null;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20 md:px-8">
      <Breadcrumb
        items={[
          ...hubCrumbs(section),
          { label: "Problems", href: problemListHref(section) },
          { label: outline.fm.title },
        ]}
      />
      <header className="mt-10 mb-8 space-y-4 border-b border-hairline pb-8">
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
          {outline.fm.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Outline{outline.fm.group ? ` · ${outline.fm.group}` : ""}
          {outline.fm.number ? ` · problem ${outline.fm.number}` : ""} · the editor, tests and editorial are still to
          come
        </p>
        <LeetCodeLink slug={outline.fm.leetcode} id={outline.fm.leetcodeId} />
      </header>
      <article className="prose-editorial" data-dsa-statement>
        {await outlineStatement(outline.file)}
      </article>
      {outline.hasBreak && (
        <section aria-labelledby="notes-heading" className="mt-12">
          <h2 id="notes-heading" className="font-display text-2xl font-semibold text-ink">
            Notes and solution
          </h2>
          {notes ? (
            <article className="prose-editorial mt-6" data-dsa-outline-notes>
              {notes}
            </article>
          ) : (
            <div className="mt-6">
              <ProEditorial />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
