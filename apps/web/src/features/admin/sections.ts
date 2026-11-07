import "server-only";
import { allSections, resolveAppEnv } from "@/features/sections/registry";
import { loadSection } from "@/features/sections/kinds";
import { APP_ENVS, type AppEnv, type ReleaseState } from "@/features/sections/schema";

// /admin/sections: every registry entry with its release state in each environment and its item counts, read
// through the same registry and kind contracts as the rest of the site (no section names in this file).
//
// Runs at request time and reads content/ from disk. That works under `next start` (local, CI, preview); on
// Workers there is no request-time file system, so the page shows the load error instead (see the stream R
// hand-over note: the build should emit a snapshot for it).

export interface SectionRow {
  key: string;
  label: string;
  kind: string;
  href: string;
  owner: string | null;
  release: Record<AppEnv, ReleaseState>;
  current: ReleaseState;
  counts: { written: number; outline: number } | null;
  countError: string | null;
}

export async function loadSectionStates(): Promise<{ env: AppEnv; envs: readonly AppEnv[]; rows: SectionRow[] }> {
  const env = resolveAppEnv();
  const rows = await Promise.all(
    allSections().map(async (section): Promise<SectionRow> => {
      let counts: SectionRow["counts"] = null;
      let countError: string | null = null;
      try {
        const loaded = await loadSection(section);
        counts = loaded.kind.counts(loaded.items);
      } catch (err) {
        countError = err instanceof Error ? err.message.split("\n")[0]!.slice(0, 200) : "could not load";
      }
      return {
        key: section.key,
        label: section.label,
        kind: section.kind,
        href: section.href,
        owner: section.owner ?? null,
        release: section.release,
        current: section.state,
        counts,
        countError,
      };
    })
  );
  return { env, envs: APP_ENVS, rows };
}
