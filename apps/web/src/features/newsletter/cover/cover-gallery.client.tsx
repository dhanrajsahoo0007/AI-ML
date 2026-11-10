"use client";

import { useMemo, useState } from "react";
import { COVER_MOTIFS, COVER_PALETTES, type CoverMotif } from "./catalog";
import { renderCover, type CoverVariant } from "./render";

// The cover gallery (plan §2): every motif × palette at one seed, drawn in the browser with the same renderer the
// build uses. Step the seed until a cover fits the issue, then put the `cover:` line in its frontmatter.

const VARIANTS: CoverVariant[] = ["card", "hero", "og", "portrait", "square", "email"];

export function CoverGallery({ initialSeed = 7 }: { initialSeed?: number }) {
  const [seed, setSeed] = useState(initialSeed);
  const [variant, setVariant] = useState<CoverVariant>("card");
  const [motif, setMotif] = useState<CoverMotif | "all">("all");
  const [grain, setGrain] = useState(true);
  const tiles = useMemo(
    () =>
      (motif === "all" ? COVER_MOTIFS : [motif]).flatMap((m) =>
        COVER_PALETTES.map((palette) => ({
          key: `${m}-${palette}`,
          spec: { motif: m, palette, seed },
          svg: renderCover({ motif: m, palette, seed }, variant, {
            idPrefix: `g-${m}-${palette}-${seed}-${variant}`,
            grain,
            scrim: variant === "og" || variant === "portrait" || variant === "square",
          }),
        }))
      ),
    [motif, seed, variant, grain]
  );
  const control = "rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm text-ink";

  return (
    <div>
      <div className="sticky top-16 z-10 mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-paper/95 p-3 backdrop-blur">
        <div className="flex items-center gap-1">
          <button type="button" className={control} onClick={() => setSeed((s) => Math.max(0, s - 1))}>
            ←
          </button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Seed
            <input
              type="number"
              min={0}
              value={seed}
              onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))}
              className={`${control} w-24`}
            />
          </label>
          <button type="button" className={control} onClick={() => setSeed((s) => s + 1)}>
            →
          </button>
        </div>
        <select
          aria-label="Variant"
          value={variant}
          onChange={(e) => setVariant(e.target.value as CoverVariant)}
          className={control}
        >
          {VARIANTS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label="Motif"
          value={motif}
          onChange={(e) => setMotif(e.target.value as CoverMotif | "all")}
          className={control}
        >
          <option value="all">all motifs</option>
          {COVER_MOTIFS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={grain} onChange={(e) => setGrain(e.target.checked)} />
          Grain
        </label>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.key}>
            <div
              className="overflow-hidden rounded-2xl border border-hairline [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: t.svg }}
            />
            <code data-copy-ok className="mt-2 block text-xs text-muted-foreground">
              cover: {`{ motif: ${t.spec.motif}, palette: ${t.spec.palette}, seed: ${t.spec.seed} }`}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}
