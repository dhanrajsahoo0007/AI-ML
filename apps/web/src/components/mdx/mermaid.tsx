"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useIsDark } from "@/components/theme";
import { mermaidConfig, prepareSource } from "@/lib/mermaid-theme.mjs";

// Dev-only fallback: production diagrams are pre-rendered to SVG at build time (scripts/render-mermaid.mjs
// and src/lib/rehype-mermaid-svg.ts). `next dev` uses this for diagrams edited since the last
// `npm run mermaid`; code-block.tsx only imports it when NODE_ENV is "development".

type Mode = "light" | "dark";

let initializedFor: Mode | null = null;
// Mermaid's render() keeps shared state and hangs when called concurrently, so renders run one at a time.
let queue: Promise<unknown> = Promise.resolve();

function renderQueued(id: string, source: string, mode: Mode) {
  const job = queue.then(async () => (await getMermaid(mode)).render(id, source));
  queue = job.catch(() => undefined);
  return job;
}

async function getMermaid(mode: Mode) {
  const mermaid = (await import("mermaid")).default;
  if (initializedFor !== mode) {
    mermaid.initialize(mermaidConfig(mode) as Parameters<typeof mermaid.initialize>[0]);
    initializedFor = mode;
  }
  return mermaid;
}

export function Mermaid({
  chart,
  caption,
  minWidth = 560,
}: {
  chart: string;
  caption?: string;
  minWidth?: number;
}) {
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mode: Mode = useIsDark() ? "dark" : "light";

  // Only load and render Mermaid once the figure is near the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const source = prepareSource(chart, mode);
    renderQueued(`${id}${mode}`, source, mode)
      .then(({ svg }) => !cancelled && setSvg(svg))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [visible, chart, id, mode]);

  return (
    <figure className="my-8" data-mermaid={svg ? "ok" : error ? "error" : "pending"}>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          ref={ref}
          role="img"
          aria-label={caption ?? "Architecture diagram"}
          style={{ minWidth }}
          className="flex min-h-[200px] items-center justify-center rounded-xl border border-hairline bg-paper p-4 sm:p-6 [&_svg]:h-auto [&_svg]:max-w-full"
        >
          {svg ? (
            <div
              className="w-full [&>svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : error ? (
            <pre className="w-full overflow-auto font-mono text-xs text-muted-foreground">
              {chart.trim()}
            </pre>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Rendering diagram…
            </span>
          )}
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Fig. — {caption}
        </figcaption>
      )}
    </figure>
  );
}
