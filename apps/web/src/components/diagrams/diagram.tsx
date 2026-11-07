import { SERVICE_BY_ID } from "@/lib/cloud-catalog";
import { resolveAssetRef } from "@/lib/asset-schema";
import { findAsset } from "@/lib/assets";
import { ProPlaceholder } from "@/components/mdx/pro-placeholder";
import { AnimatedDiagram } from "./animated-diagram";
import { ANIMATED_SPECS } from "./animated-specs";

type AnimatedProps = Omit<Parameters<typeof AnimatedDiagram>[0], "spec" | "alt" | "cloudNames">;

/**
 * Server wrapper for <AnimatedDiagram> in MDX. Resolves the spec by asset ID (`spec="animated/messenger/aws"`,
 * or the older `name="messenger/aws"`) from assets/diagrams/animated, so the client component receives only
 * that one spec, plus the short names of the cloud services its nodes refer to (instead of importing the whole
 * cloud catalog) and the sidecar's alt text.
 */
export function Diagram({ name, spec: specRef, ...props }: AnimatedProps & { name?: string; spec?: string }) {
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
  const cloudNames: Record<string, string> = {};
  for (const node of spec.nodes) {
    for (const cloudRef of Object.values(node.cloud ?? {})) {
      const serviceId = typeof cloudRef === "string" ? cloudRef : cloudRef.id;
      if (serviceId && SERVICE_BY_ID[serviceId]) cloudNames[serviceId] = SERVICE_BY_ID[serviceId].short;
    }
  }
  return <AnimatedDiagram {...props} spec={spec} alt={asset?.alt} cloudNames={cloudNames} />;
}
