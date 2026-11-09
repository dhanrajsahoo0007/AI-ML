// The names of the generative cover motifs and palettes (plan §2): what an issue's `cover:` frontmatter may say.
// Names only, no drawing code, so the schema and content-check stay light. The renderers in this folder
// implement every name listed here (cover.test.ts checks it).

export const COVER_MOTIFS = ["harness-ring", "feedback-loop", "lattice", "layers"] as const;
export type CoverMotif = (typeof COVER_MOTIFS)[number];

export const COVER_PALETTES = ["dusk", "sage", "coral", "sand", "ink", "lagoon"] as const;
export type CoverPalette = (typeof COVER_PALETTES)[number];

export interface CoverSpec {
  motif: CoverMotif;
  palette: CoverPalette;
  /** Same seed, same drawing. */
  seed: number;
}
