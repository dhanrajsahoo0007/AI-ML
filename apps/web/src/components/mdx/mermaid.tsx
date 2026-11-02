"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useIsDark } from "@/components/theme";

// Ported from dhanraj-portfolio/components/Mermaid.tsx so diagrams share the editorial theme.

type Mode = "light" | "dark";

const PALETTES = {
  light: {
    accent: { fill: "#1e3a8a", text: "#faf9f6" },
    vars: {
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
  },
  dark: {
    accent: { fill: "#93b1f5", text: "#141413" },
    vars: {
      background: "#141413",
      primaryColor: "#1d1c1a",
      primaryTextColor: "#f2f0eb",
      primaryBorderColor: "#4a4843",
      secondaryColor: "#1b2440",
      tertiaryColor: "#1d1c1a",
      lineColor: "#8a8780",
      textColor: "#d4d1ca",
      clusterBkg: "#1a1918",
      clusterBorder: "#3a3935",
      edgeLabelBackground: "#141413",
      actorBkg: "#1d1c1a",
      actorBorder: "#4a4843",
      signalColor: "#b5b2ab",
      noteBkgColor: "#1b2440",
      noteBorderColor: "#93b1f5",
    },
  },
} as const;

// Shared styling for every flowchart: mark key nodes with `:::accent`.
function accentClass(mode: Mode) {
  const { fill, text } = PALETTES[mode].accent;
  return `\nclassDef accent fill:${fill},stroke:${fill},color:${text},font-weight:500`;
}

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
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      themeVariables: { fontSize: "14px", darkMode: mode === "dark", ...PALETTES[mode].vars },
      flowchart: { curve: "basis", padding: 14, nodeSpacing: 36, rankSpacing: 48 },
      sequence: { mirrorActors: false, actorMargin: 40 },
    });
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
    const trimmed = chart.trim();
    const source = /^(flowchart|graph)\b/.test(trimmed) ? trimmed + accentClass(mode) : trimmed;
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
