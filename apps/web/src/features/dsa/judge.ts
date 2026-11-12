import "server-only";
import { sectionOfKind } from "../sections";
import type { RunnerCase } from "./runner/protocol";
import { loadDsaItems, readHiddenTestsForJudge, validProblems, withoutDrafts } from "./source";

// The submit judge's data (import plan, wave 3): "Submit" on a problem page fetches that problem's hidden cases
// from app/<section>/problems/<slug>/judge and runs them in the reader's browser, in the same sandboxed worker
// as "Run tests". So hidden cases are no longer server-only: they are served by that one route and by nothing
// else. They never appear in a page, its RSC payload or a client bundle (leak.test.ts), and their names stay
// behind: the route sends arguments and expected values only.
//
// The route's only caller is the route handler; nothing else may import this module (leak.test.ts checks).

const built = () => sectionOfKind("problems").state !== "off";

function problems() {
  return withoutDrafts(validProblems(loadDsaItems(sectionOfKind("problems"))));
}

/** One judge route per built problem; none where the section is off. */
export function judgeParams(): { slug: string }[] {
  return built() ? problems().map((p) => ({ slug: p.slug })) : [];
}

/** A problem's hidden cases without their names, or null for an unknown slug, a draft or an off section. */
export function judgeCases(slug: string): RunnerCase[] | null {
  if (!built()) return null;
  const problem = problems().find((p) => p.slug === slug);
  if (!problem) return null;
  return readHiddenTestsForJudge(sectionOfKind("problems"), problem).map(({ args, expected }) => ({ args, expected }));
}
