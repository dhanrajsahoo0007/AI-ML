// Build-up figures: one SVG source whose layers are marked <g data-step="1">…<g data-step="n">, shown one step at a
// time (newsletter plan §1.2). Pure string functions, shared by the asset builder (a PNG per step) and the pages
// (the inline SVG of one step). No DOM, so they run in plain Node and in Workers alike.
//
// Any element may carry data-step, not only <g>: SVGO's collapseGroups moves a lone child's group attributes onto
// the child, so an optimised file can have <path data-step="2" … />.

const STEP_TAG_RE = /<([A-Za-z][\w:-]*)\b([^>]*?)\sdata-step=(["'])(\d+)\3([^>]*?)(\/?)>/g;

/** Opacity of the layers before the current step: still visible, clearly in the background. */
export const PAST_STEP_OPACITY = 0.35;

/** Step numbers that are used, sorted, without duplicates. */
export function stepsUsed(svg: string): number[] {
  return [...new Set([...svg.matchAll(STEP_TAG_RE)].map((m) => Number(m[4])))].sort((a, b) => a - b);
}

/** Highest data-step in the SVG; 0 when it has no steps. */
export function stepCount(svg: string): number {
  return stepsUsed(svg).at(-1) ?? 0;
}

/**
 * The SVG as it looks at `step`: layers after it are hidden, layers before it are faded, the current one is drawn
 * as is and marked `data-step-current` (pages may style it). Unmarked content is always shown.
 */
export function svgAtStep(svg: string, step: number): string {
  return svg.replace(
    STEP_TAG_RE,
    (_m, tag: string, before: string, q: string, n: string, after: string, selfClose: string) => {
      const k = Number(n);
      const extra =
        k > step ? ` display="none"` : k < step ? ` opacity="${PAST_STEP_OPACITY}"` : ` data-step-current="true"`;
      return `<${tag}${before} data-step=${q}${n}${q}${after}${extra}${selfClose}>`;
    }
  );
}
