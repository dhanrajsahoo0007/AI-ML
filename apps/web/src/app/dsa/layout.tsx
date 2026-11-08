import { ContentShell } from "@/components/content-shell";
import { getSectionNav } from "@/lib/nav-tree";
import { routeMetadata, routeSection } from "@/features/sections";

// The problems section's routes (DSA, plan §15.1); the sidebar gets only this section's nav. A section that
// is `off` renders 404 for every page here.

export function generateMetadata() {
  return routeMetadata("problems");
}

export default async function ProblemsSectionLayout({ children }: { children: React.ReactNode }) {
  const section = routeSection("problems");
  const nav = await getSectionNav(section.key);
  return <ContentShell navTree={[nav]}>{children}</ContentShell>;
}
