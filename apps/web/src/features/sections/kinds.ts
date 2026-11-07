import type { SectionDef, SectionKind } from "./kind";
import type { SectionKindName } from "./schema";
import { docsKind } from "../docs/kind";
import { questionBankKind } from "./kinds/question-bank";
import { directoryKind, aggregateCompanyRefs } from "./kinds/directory";
import { problemsKind } from "../dsa/kind";
import { newsletterKind } from "../newsletter/kind";
import { getSection } from "./registry";

// Maps each kind name to its module. Shared code goes registry entry → kindOf(entry) → contract.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KINDS: Record<SectionKindName, SectionKind<any>> = {
  docs: docsKind,
  "question-bank": questionBankKind,
  directory: directoryKind,
  problems: problemsKind,
  newsletter: newsletterKind,
};

export function kindOf<Item = unknown>(section: SectionDef): SectionKind<Item> {
  return KINDS[section.kind];
}

/** Loads a section's items through its kind. */
export async function loadSection(section: SectionDef) {
  const kind = kindOf(section);
  return { section, kind, items: await kind.load(section) };
}

/** Company refs for a directory section, from the `on` sections it aggregates. */
export function directoryRefs(directory: SectionDef) {
  const aggregated = (directory.aggregates ?? []).flatMap((key) => {
    const section = getSection(key);
    return section ? [{ section, kind: kindOf(section) }] : [];
  });
  return aggregateCompanyRefs(aggregated);
}
