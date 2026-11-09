import { useId } from "react";
import { SERVICE_BY_ID } from "@/lib/cloud-catalog";
import { resolveAssetRef } from "@/lib/asset-schema";
import { findAsset } from "@/lib/assets";
import { ProPlaceholder } from "@/components/mdx/pro-placeholder";
import type { AnimatedDiagramProps } from "./animated-diagram";
// The renderers load lazily, only on pages that render one (see ./lazy.client.tsx). They are still server-rendered.
import { AnimatedDiagram, LayoutDiagram, SequenceDiagram } from "./lazy.client";
import { unknownEmphasisIds } from "./build-view";
import { ANIMATED_SPECS } from "./animated-specs";
import type { DiagramSpec } from "./types";

type DiagramProps = Omit<AnimatedDiagramProps, "spec" | "alt" | "cloudNames" | "idBase"> & {
  /** Asset ID, with or without the diagrams/animated prefix: "animated/messenger/aws". */
  spec?: string;
  /** Older form of `spec`: "messenger/aws". */
  name?: string;
};

/**
 * Server wrapper for <AnimatedDiagram> in MDX. Resolves the spec by asset ID (`spec="animated/messenger/aws"`,
 * or the older `name="messenger/aws"`) from assets/diagrams/animated and dispatches on its `kind`: architecture
 * specs go to AnimatedDiagram (with the short names of the cloud services its nodes refer to, instead of the
 * whole cloud catalog), sequence and layout specs to their lazily loaded renderers. All kinds get the sidecar's
 * alt text; premium assets render a Pro placeholder.
 */
export function Diagram({ name, spec: specRef, highlight, path, ...props }: DiagramProps) {
  // SVG def ids come from this server render and travel in the RSC payload, so they match on hydration (a useId
  // inside the lazily loaded renderer would not).
  const idBase = useId();
  const ref = specRef ?? name;
  const id = ref ? resolveAssetRef("AnimatedDiagram", ref) : "";
  const spec = ANIMATED_SPECS[id];
  if (!spec) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`<AnimatedDiagram>: unknown diagram "${ref}" (looked for ${id}; see assets/diagrams/animated)`);
    }
    return <p className="text-sm text-muted-foreground">Unknown diagram: {ref}</p>;
  }
  const asset = findAsset(id);
  if (asset?.access === "premium") {
    // Premium assets are never sent until the gated asset route exists (plan §5.6 step 6).
    return <ProPlaceholder label={asset.title ?? spec.title} />;
  }
  const alt = asset?.alt;
  if (spec.kind === "sequence") return <SequenceDiagram {...props} spec={spec} alt={alt} idBase={idBase} />;
  if (spec.kind === "layout") return <LayoutDiagram {...props} spec={spec} alt={alt} idBase={idBase} />;
  const unknown = unknownEmphasisIds(spec, highlight, path);
  if (unknown.length > 0) {
    const message = `<AnimatedDiagram>: highlight/path name unknown node ids in ${id}: ${unknown.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }
  return (
    <AnimatedDiagram
      {...props}
      spec={spec}
      alt={alt}
      highlight={highlight}
      path={path}
      cloudNames={cloudNamesFor(spec)}
      idBase={idBase}
    />
  );
}

// Short names for the catalog ids a spec's nodes refer to, so the client gets a few strings, not the catalog.
function cloudNamesFor(spec: DiagramSpec) {
  const cloudNames: Record<string, string> = {};
  for (const node of spec.nodes) {
    for (const cloudRef of Object.values(node.cloud ?? {})) {
      const serviceId = typeof cloudRef === "string" ? cloudRef : cloudRef.id;
      if (serviceId && SERVICE_BY_ID[serviceId]) cloudNames[serviceId] = SERVICE_BY_ID[serviceId].short;
    }
  }
  return cloudNames;
}
