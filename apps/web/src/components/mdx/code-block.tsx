import * as React from "react";

type CodeProps = { className?: string; children?: React.ReactNode };
type MermaidProps = { chart: string; caption?: string };

// Mermaid fences are rendered to SVG at build time (src/lib/rehype-mermaid-svg.ts). Only `next dev` keeps
// a client-side renderer, for diagrams edited since the last `npm run mermaid`. The condition is a
// compile-time constant, so production bundles never reference mermaid.tsx or the mermaid package.
const DevMermaid: React.ComponentType<MermaidProps> | null =
  process.env.NODE_ENV === "development"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@/components/mdx/mermaid").Mermaid
    : null;

function codeText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(codeText).join("");
  return "";
}

function mermaidChart(node: React.ReactNode): string | null {
  if (!React.isValidElement<CodeProps>(node)) return null;
  const { className, children } = node.props;
  return className?.split(" ").includes("language-mermaid") ? codeText(children) : null;
}

const captionClass = "mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

// A pre-rendered diagram: the light and dark SVGs are both inline and CSS shows the one matching the
// `.dark` class, so there is no JavaScript and no flash when the theme changes.
export function MermaidSvg({
  light,
  dark,
  caption,
  minWidth = 560,
}: {
  light: string;
  dark: string;
  caption?: string;
  minWidth?: number;
}) {
  return (
    <figure className="my-8" data-mermaid="ok">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          role="img"
          aria-label={caption ?? "Architecture diagram"}
          style={{ minWidth }}
          className="flex min-h-[200px] items-center justify-center rounded-xl border border-hairline bg-paper p-4 sm:p-6 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        >
          <div className="w-full dark:hidden" dangerouslySetInnerHTML={{ __html: light }} />
          <div className="hidden w-full dark:block" dangerouslySetInnerHTML={{ __html: dark }} />
        </div>
      </div>
      {caption && <figcaption className={captionClass}>Fig. — {caption}</figcaption>}
    </figure>
  );
}

// Fenced code blocks. A ```mermaid fence only reaches here in `next dev` before it has been pre-rendered.
export function Pre({ children, ...props }: React.ComponentProps<"pre">) {
  const chart = mermaidChart(children);
  if (chart !== null && DevMermaid) return <DevMermaid chart={chart} />;
  return <pre {...props}>{children}</pre>;
}

// Wraps a figure to give it a caption. Pre-rendered diagrams get their caption from the rehype plugin.
export function Figure({ caption, children }: { caption: string; children: React.ReactNode }) {
  if (DevMermaid && React.isValidElement<{ children?: React.ReactNode }>(children)) {
    const chart = mermaidChart(children.props.children);
    if (chart !== null) return <DevMermaid chart={chart} caption={caption} />;
  }
  return (
    <figure className="my-8">
      {children}
      <figcaption className={captionClass}>Fig. — {caption}</figcaption>
    </figure>
  );
}
