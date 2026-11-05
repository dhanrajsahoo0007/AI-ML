"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { InterviewQuestions } from "@/components/mdx/interview-qa";
import { Eyebrow } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";

export interface ExplorerCompany {
  slug: string;
  name: string;
  group: string;
  roles: string;
  loop: string;
  count: number;
}

// Logo grid that filters the company-tagged question list; the choice is kept in ?company=.
export function CompanyExplorer({
  groups,
  companies,
  footer,
  children,
}: {
  groups: string[];
  companies: ExplorerCompany[];
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState("");
  const params = useSearchParams();

  // Follows ?company= so links from the header menu work while already on this page.
  useEffect(() => {
    const slug = params.get("company") ?? "";
    if (companies.some((c) => c.slug === slug)) setSelected(slug);
  }, [companies, params]);

  function choose(slug: string) {
    setSelected(slug);
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("company", slug);
    else url.searchParams.delete("company");
    window.history.replaceState(null, "", url);
    if (slug) document.getElementById("company-questions")?.scrollIntoView({ behavior: "smooth" });
  }

  const current = companies.find((c) => c.slug === selected);

  return (
    <>
      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group}>
            <Eyebrow className="mb-4">{group}</Eyebrow>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {companies
                .filter((c) => c.group === group)
                .map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => choose(selected === c.slug ? "" : c.slug)}
                    aria-pressed={selected === c.slug}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                      selected === c.slug
                        ? "border-ink bg-paper-2"
                        : "border-hairline bg-paper hover:border-ink/30"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-background">
                      <CompanyLogo company={c} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.count} questions</span>
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>

      <div id="company-questions" className="scroll-mt-24">
        {current && (
          <div className="mt-14 rounded-xl border border-hairline bg-paper-2/50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg border border-hairline bg-background">
                  <CompanyLogo company={current} className="size-6" />
                </span>
                <div>
                  <h2 className="font-display text-2xl leading-tight text-ink">{current.name}</h2>
                  <p className="text-xs text-muted-foreground">{current.group}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => choose("")}
                className="inline-flex items-center gap-1 rounded-full border border-hairline px-3 py-1 text-xs text-ink-2 hover:border-ink/40"
              >
                <X aria-hidden className="size-3.5" />
                All companies
              </button>
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
              <strong className="text-ink">Roles:</strong> {current.roles}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              <strong className="text-ink">Interview loop (as publicly reported):</strong> {current.loop}
            </p>
          </div>
        )}
        <InterviewQuestions
          title={current ? `Reported ${current.name} questions` : "Questions tagged with a company"}
          company={selected}
          footer={footer}
        >
          {children}
        </InterviewQuestions>
      </div>
    </>
  );
}
