import Link from "next/link";
import { Lock } from "lucide-react";
import { PAYWALL_CONTAINER_CLASS } from "../seo/public";
import { DIFFICULTY_LABELS, type Difficulty } from "./constants";
import { DIFFICULTY_CLASS } from "./difficulty";

// Server components shared by the problems-kind pages.

export function DifficultyLabel({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`text-sm font-semibold ${DIFFICULTY_CLASS[difficulty]}`}>{DIFFICULTY_LABELS[difficulty]}</span>
  );
}

export function Tags({ label, items }: { label: string; items: { slug: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      {items.map((t) => (
        <span key={t.slug} className="rounded-full border border-hairline px-2.5 py-0.5 text-ink-2">
          {t.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Stands in for a premium editorial. The container carries PAYWALL_CONTAINER_CLASS, the selector the
 * JSON-LD paywall markup points at; the editorial itself is not in the page. Phase 5 serves it to Pro
 * subscribers (plan §9.2).
 */
export function ProEditorial() {
  return (
    <div className={PAYWALL_CONTAINER_CLASS} data-premium="editorial">
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-hairline bg-paper-2 px-5 py-6 text-sm text-ink-2">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold text-ink">Pro</span> The editorial walks through the approaches, the complexity
          and a tested solution in every language.{" "}
          <Link href="/pricing" className="underline underline-offset-2">
            Available with Pro
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/** A link to the same problem on LeetCode, for a problem whose frontmatter names its LeetCode slug. */
export function LeetCodeLink({ slug, id }: { slug?: string; id?: number }) {
  if (!slug) return null;
  return (
    <a
      href={`https://leetcode.com/problems/${slug}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-ink underline underline-offset-4"
      data-dsa-leetcode
    >
      {id ? `LeetCode ${id}` : "On LeetCode"}
    </a>
  );
}
