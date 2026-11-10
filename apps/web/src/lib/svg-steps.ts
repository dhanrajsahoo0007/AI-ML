// Build-up figures: one SVG source whose layers are marked <g data-step="1">…<g data-step="n">, shown one step at a
// time (newsletter plan §1.2). Pure string functions, shared by the asset builder (a PNG per step) and the pages
// (the inline SVG of one step). No DOM, so they run in plain Node and in Workers alike.
//
//   data-step="k"       shown from step k on: drawn as is at step k, faded after it, hidden before it
//   data-step-only="k"  shown at step k only (a caption that changes with each step)
//
// Any element may carry them, not only <g>: SVGO's collapseGroups moves a lone child's group attributes onto the
// child, so an optimised file can have <path data-step="2" … />. Don't put opacity or display on a stepped element
// yourself; wrap it in a <g> instead.

const STEP_TAG_RE = /<([A-Za-z][\w:-]*)\b([^>]*?)\sdata-step(-only)?=(["'])(\d+)\4([^>]*?)(\/?)>/g;

/** Opacity of the layers before the current step: still visible, clearly in the background. */
export const PAST_STEP_OPACITY = 0.35;

/** Step numbers that are used, sorted, without duplicates. */
export function stepsUsed(svg: string): number[] {
  return [...new Set([...svg.matchAll(STEP_TAG_RE)].map((m) => Number(m[5])))].sort((a, b) => a - b);
}

/** Highest step in the SVG; 0 when it has no steps. */
export function stepCount(svg: string): number {
  return stepsUsed(svg).at(-1) ?? 0;
}

/**
 * The SVG as it looks at `step`: layers after it are hidden, layers before it are faded, the current one is drawn
 * as is and marked `data-step-current` (pages may style it). Unmarked content is always shown.
 */
export function svgAtStep(svg: string, step: number, opts: { fadePast?: boolean } = {}): string {
  const fade = opts.fadePast ?? true;
  return svg.replace(
    STEP_TAG_RE,
    (_m, tag: string, before: string, only: string | undefined, q: string, n: string, after: string, end: string) => {
      const k = Number(n);
      let extra: string;
      if (only) extra = k === step ? "" : ` display="none"`;
      else
        extra =
          k > step
            ? ` display="none"`
            : k < step
              ? fade
                ? ` opacity="${PAST_STEP_OPACITY}"`
                : ""
              : ` data-step-current="true"`;
      return `<${tag}${before} data-step${only ?? ""}=${q}${n}${q}${after}${extra}${end}>`;
    }
  );
}

/**
 * The whole build-up figure at once, nothing faded: every step drawn as is, with the last step's caption. What
 * email, the LinkedIn carousel and any other single image of a `#steps` figure show.
 */
export function svgComplete(svg: string): string {
  const last = stepCount(svg);
  return last ? svgAtStep(svg, last, { fadePast: false }) : svg;
}
