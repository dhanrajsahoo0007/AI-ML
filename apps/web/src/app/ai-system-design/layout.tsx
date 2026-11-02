import { getNavTree } from "@/lib/nav-tree";
import { ContentShell } from "@/components/content-shell";

export default async function AiSystemDesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navTree = await getNavTree();
  return <ContentShell navTree={navTree}>{children}</ContentShell>;
}
