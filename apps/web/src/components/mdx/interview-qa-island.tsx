"use client";

import { useEffect, useRef } from "react";
import type { CompanyTag } from "@/components/company-logo";

export type Level = "Junior" | "Mid" | "Senior";

export interface InterviewQuestionProps {
  question: string;
  category?: string;
  /** The area the question's topic belongs to (LLM, GenAI, System Design); a list with several gets an Area filter. */
  area?: string;
  level?: Level;
  companies?: CompanyTag[];
  related?: { href: string; title: string };
  refs?: { title: string; url: string }[];
  children: React.ReactNode;
}

// Marker element: <InterviewQuestions> reads its props and renders the question itself. It is a client
// reference so its props (including the answer) still reach InterviewQuestions when that is rendered
// inside a client component (the companies page).
export function InterviewQuestion(props: InterviewQuestionProps) {
  void props;
  return null;
}

type Filters = { tag: string; area: string; level: string; company: string; query: string; allCompanies: boolean };
type FilterGroup = "tag" | "area" | "level" | "company";

// Search, filters and "Expand all" for the server-rendered list in interview-qa.tsx. It works on the
// markup through data attributes instead of re-rendering it, so the answers never ship as JS props.
export function QaController({ company }: { company?: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const apply = useRef<(() => void) | null>(null);
  const fixedCompany = useRef(company);

  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>("[data-qa]");
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLDetailsElement>("details[data-qa-item]"));
    const meta = items.map((el) => ({
      cat: el.dataset.cat ?? "",
      area: el.dataset.area ?? "",
      level: el.dataset.level ?? "",
      companies: (el.dataset.companies ?? "").split(" ").filter(Boolean),
    }));
    const one = <T extends Element>(sel: string) => root.querySelector<T>(sel);
    const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
    const search = one<HTMLInputElement>("[data-qa-search]");
    let text: string[] | null = null;
    const f: Filters = { tag: "", area: "", level: "", company: "", query: search?.value ?? "", allCompanies: false };

    const syncExpand = () => {
      const visible = items.filter((el) => !el.hidden);
      const allOpen = visible.length > 0 && visible.every((el) => el.open);
      const label = one("[data-qa-expand-label]");
      if (label) label.textContent = allOpen ? "Collapse all" : "Expand all";
      return allOpen;
    };

    const update = () => {
      const company = fixedCompany.current ?? f.company;
      const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length && !text) text = items.map((el) => (el.textContent ?? "").toLowerCase());
      const byCompany = (i: number) => !company || meta[i].companies.includes(company);
      let shown = 0;
      items.forEach((el, i) => {
        const m = meta[i];
        const match =
          (!f.tag || m.cat === f.tag) &&
          (!f.area || m.area === f.area) &&
          (!f.level || m.level === f.level) &&
          byCompany(i) &&
          terms.every((t) => text![i].includes(t));
        el.hidden = !match;
        if (match) shown++;
      });

      const count = one("[data-qa-count]");
      if (count) count.textContent = String(shown);
      const of = one<HTMLElement>("[data-qa-of]");
      if (of) of.hidden = shown === items.length;
      const empty = one<HTMLElement>("[data-qa-empty]");
      if (empty) empty.hidden = shown > 0;

      // Area counts follow the company filter, and topic counts follow the company and the area, so each count
      // matches what a click on the chip shows.
      for (const btn of all<HTMLButtonElement>('[data-qa-filter="area"]')) {
        const value = btn.dataset.value ?? "";
        if (!value) continue;
        const n = meta.filter((m, i) => m.area === value && byCompany(i)).length;
        const label = btn.querySelector("[data-qa-tag-count]");
        if (label) label.textContent = String(n);
        btn.hidden = n === 0;
      }
      for (const btn of all<HTMLButtonElement>('[data-qa-filter="tag"]')) {
        const value = btn.dataset.value ?? "";
        if (!value) continue;
        const n = meta.filter((m, i) => m.cat === value && byCompany(i) && (!f.area || m.area === f.area)).length;
        const label = btn.querySelector("[data-qa-tag-count]");
        if (label) label.textContent = String(n);
        btn.hidden = n === 0;
      }
      // Topics are listed area by area; a row with no topic left (another area is chosen) goes with them.
      for (const row of all<HTMLElement>("[data-qa-tag-row]")) {
        row.hidden = !Array.from(row.querySelectorAll<HTMLElement>("[data-qa-filter]")).some((b) => !b.hidden);
      }
      for (const btn of all<HTMLButtonElement>("[data-qa-filter]")) {
        const group = btn.dataset.qaFilter as FilterGroup;
        btn.setAttribute("aria-pressed", String((btn.dataset.value ?? "") === f[group]));
      }
      for (const btn of all<HTMLButtonElement>("[data-qa-extra]")) {
        btn.hidden = !f.allCompanies && btn.dataset.value !== f.company;
      }
      const more = one<HTMLButtonElement>("[data-qa-more]");
      if (more) more.textContent = f.allCompanies ? "Show fewer" : `Show all ${more.dataset.qaMore}`;
      syncExpand();
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const filter = target.closest<HTMLButtonElement>("[data-qa-filter]");
      if (filter && root.contains(filter)) {
        const group = filter.dataset.qaFilter as FilterGroup;
        const value = filter.dataset.value ?? "";
        f[group] = f[group] === value ? "" : value;
        // A topic belongs to one area: changing the area clears a topic that is no longer in view.
        if (group === "area") f.tag = "";
        return update();
      }
      if (target.closest("[data-qa-more]")) {
        f.allCompanies = !f.allCompanies;
        return update();
      }
      if (target.closest("[data-qa-expand]")) {
        const open = !syncExpand();
        for (const el of items) if (!el.hidden) el.open = open;
        syncExpand();
      }
    };
    const onInput = () => {
      f.query = search?.value ?? "";
      update();
    };
    // `toggle` doesn't bubble, so listen in the capture phase to keep "Expand all" in step.
    const onToggle = () => syncExpand();

    root.addEventListener("click", onClick);
    root.addEventListener("toggle", onToggle, true);
    search?.addEventListener("input", onInput);
    apply.current = update;
    update();
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("toggle", onToggle, true);
      search?.removeEventListener("input", onInput);
      apply.current = null;
    };
  }, []);

  useEffect(() => {
    fixedCompany.current = company;
    apply.current?.();
  }, [company]);

  return <span ref={marker} hidden />;
}
