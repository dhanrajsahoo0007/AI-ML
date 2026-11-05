import { SERVICE_BY_ID } from "@/lib/cloud-catalog";
import { AnimatedDiagram } from "./animated-diagram";
import { DIAGRAMS } from "./specs";

// Server wrapper used for <AnimatedDiagram> in MDX: looks up the short names of the cloud services a spec's nodes
// refer to, so the client component gets a handful of names instead of importing the whole cloud catalog.
export function Diagram(props: Parameters<typeof AnimatedDiagram>[0]) {
  const spec = DIAGRAMS[props.name];
  const cloudNames: Record<string, string> = {};
  for (const node of spec?.nodes ?? []) {
    for (const ref of Object.values(node.cloud ?? {})) {
      const id = typeof ref === "string" ? ref : ref.id;
      if (id && SERVICE_BY_ID[id]) cloudNames[id] = SERVICE_BY_ID[id].short;
    }
  }
  return <AnimatedDiagram {...props} cloudNames={cloudNames} />;
}
