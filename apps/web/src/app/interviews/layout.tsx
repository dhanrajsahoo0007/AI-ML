import { ContentShell } from "@/components/content-shell";
import { getSectionNav } from "@/lib/nav-tree";
import { routeMetadata, routeSection } from "@/features/sections";

// The question-bank section's routes; the sidebar gets only this section's nav.

export function generateMetadata() {
  return routeMetadata("question-bank");
}

export default async function InterviewsLayout({ children }: { children: React.ReactNode }) {
  const section = routeSection("question-bank");
  const nav = await getSectionNav(section.key);
  return <ContentShell navTree={[nav]}>{children}</ContentShell>;
}
