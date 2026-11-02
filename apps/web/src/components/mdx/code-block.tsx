import * as React from "react";
import { Mermaid } from "@/components/mdx/mermaid";

type CodeProps = { className?: string; children?: React.ReactNode };

function codeText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(codeText).join("");
  return "";
}

// Fenced ```mermaid blocks render as diagrams; every other fence stays a <pre>.
export function Pre({ children, ...props }: React.ComponentProps<"pre">) {
  if (React.isValidElement<CodeProps>(children)) {
    const { className, children: code } = children.props;
    if (className?.split(" ").includes("language-mermaid")) {
      return <Mermaid chart={codeText(code)} />;
    }
  }
  return <pre {...props}>{children}</pre>;
}

// Wraps a single fenced diagram to give it a caption.
export function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    const inner = children.props.children;
    if (React.isValidElement<CodeProps>(inner)) {
      const { className, children: code } = inner.props;
      if (className?.split(" ").includes("language-mermaid")) {
        return <Mermaid chart={codeText(code)} caption={caption} />;
      }
    }
  }
  return (
    <figure className="my-8">
      {children}
      <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Fig. — {caption}
      </figcaption>
    </figure>
  );
}
