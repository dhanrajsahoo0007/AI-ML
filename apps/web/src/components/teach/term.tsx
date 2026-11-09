import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { getTerm, loadGlossary, sortByTerm, termHref } from "@/lib/glossary";
import { parseProps } from "./parse-props";
import { TermRoot } from "./lazy.client";
import { InvalidProps } from "./props";

// Inline glossary term: a link to the glossary page with a hover/focus definition shown by CSS. A tiny lazy
// island (term.client.tsx) adds Escape to hide it. While the glossary's section is not `on`, the term is a
// focusable span instead of a link (a hidden or off section is a 404 for readers).
// Usage in MDX: <Term id="latency" /> or <Term id="latency">slow</Term>
//
// An unknown id shows a red note in dev and fails the production build (tests/unit/teach/term-ids.test.ts
// catches it earlier).

const termSchema = z.object({ id: z.string().min(1) }).strict();

export function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const tipId = React.useId();
  const parsed = parseProps("Term", termSchema, { id });
  const entry = parsed.ok ? getTerm(parsed.data.id) : undefined;
  if (!entry) {
    return <InvalidProps message={parsed.ok ? `<Term id="${id}">: unknown glossary id` : parsed.message} />;
  }
  const href = termHref(entry.id);
  const label = children ?? entry.term;
  const underline =
    "!text-inherit !underline !decoration-dotted !underline-offset-4 [text-decoration-color:var(--dg-green)] hover:[text-decoration-color:var(--ink)]";
  return (
    <TermRoot>
      {href ? (
        <Link href={href} aria-describedby={tipId} className={underline}>
          {label}
        </Link>
      ) : (
        <span
          tabIndex={0}
          aria-describedby={tipId}
          className={`${underline} focus-visible:outline-2 focus-visible:outline-ring`}
        >
          {label}
        </span>
      )}
      {/* display:none while closed. On phones it is a fixed card above the bottom edge, so it never runs off the
          right side or widens the page however far along the line the term sits. From sm up it hangs below the
          term; the padding (not a margin) bridges the gap, so the pointer can move onto it without it closing.
          Escape hides it (data-dismissed, set by TermRoot). */}
      <span
        role="tooltip"
        id={tipId}
        className="absolute left-0 top-full z-20 hidden w-[min(18rem,calc(100vw-2rem))] pt-1.5 group-hover/term:block group-focus-within/term:block group-data-[dismissed=true]/term:!hidden max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:pt-0"
      >
        <span className="block whitespace-normal rounded-lg border border-hairline bg-paper p-3 text-left text-sm font-normal not-italic leading-snug text-ink-2 shadow-lg">
          <span className="block font-semibold text-ink">{entry.term}</span>
          {entry.short}
        </span>
      </span>
    </TermRoot>
  );
}

// The whole glossary with one anchor per entry, for /system-design/glossary. Usage in MDX: <Glossary />
export function Glossary() {
  const entries = sortByTerm(loadGlossary());
  return (
    <dl className="my-8 divide-y divide-hairline border-y border-hairline">
      {entries.map((e) => (
        <div key={e.id} id={e.id} className="scroll-mt-24 py-4 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-6">
          <dt className="font-display font-semibold text-ink">
            <a href={`#${e.id}`} className="!text-inherit !no-underline hover:!underline">
              {e.term}
            </a>
          </dt>
          <dd className="mt-1 text-[15px] leading-relaxed text-ink-2 sm:mt-0">
            <p>{e.short}</p>
            {e.long && <p className="mt-2">{e.long}</p>}
            {e.related && e.related.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                See also:{" "}
                {e.related.map((r, i) => (
                  <React.Fragment key={r}>
                    {i > 0 && ", "}
                    <a href={`#${r}`}>{getTerm(r)?.term ?? r}</a>
                  </React.Fragment>
                ))}
              </p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
