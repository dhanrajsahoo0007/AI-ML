"use client";

import { useEffect, useId, useRef, useState } from "react";

// Ported from dhanraj-portfolio/components/Mermaid.tsx so diagrams share the editorial theme.

// Shared styling for every flowchart: mark key nodes with `:::accent`.
const ACCENT =
  "\nclassDef accent fill:#1e3a8a,stroke:#1e3a8a,color:#faf9f6,font-weight:500";

let initialized = false;
// Mermaid's render() keeps shared state and hangs when called concurrently, so renders run one at a time.
let queue: Promise<unknown> = Promise.resolve();

function renderQueued(id: string, source: string) {
  const job = queue.then(async () => (await getMermaid()).render(id, source));
  queue = job.catch(() => undefined);
  return job;
}

async function getMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      themeVariables: {
        fontSize: "14px",
        background: "#faf9f6",
        primaryColor: "#faf9f6",
        primaryTextColor: "#111111",
        primaryBorderColor: "#bdb9b0",
        secondaryColor: "#e8ecf6",
        tertiaryColor: "#f2f0eb",
        lineColor: "#8a8780",
        textColor: "#2b2b2b",
        clusterBkg: "#f2f0eb",
        clusterBorder: "#dcd9d2",
        edgeLabelBackground: "#faf9f6",
        actorBkg: "#faf9f6",
        actorBorder: "#bdb9b0",
        signalColor: "#6b6b6b",
        noteBkgColor: "#e8ecf6",
        noteBorderColor: "#1e3a8a",
      },
      flowchart: { curve: "basis", padding: 14, nodeSpacing: 36, rankSpacing: 48 },
      sequence: { mirrorActors: false, actorMargin: 40 },
    });
    initialized = true;
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
    const trimmed = chart.trim();
    const source = /^(flowchart|graph)\b/.test(trimmed) ? trimmed + ACCENT : trimmed;
    renderQueued(id, source)
      .then(({ svg }) => !cancelled && setSvg(svg))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [visible, chart, id]);

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
