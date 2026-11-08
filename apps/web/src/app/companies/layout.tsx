import { ContentShell } from "@/components/content-shell";
import { getSectionNav } from "@/lib/nav-tree";
import { routeMetadata, routeSection } from "@/features/sections";

// The directory section's routes; the sidebar gets only this section's nav.

export function generateMetadata() {
  return routeMetadata("directory");
}

export default async function CompaniesLayout({ children }: { children: React.ReactNode }) {
  const section = routeSection("directory");
  const nav = await getSectionNav(section.key);
  return <ContentShell navTree={[nav]}>{children}</ContentShell>;
}
