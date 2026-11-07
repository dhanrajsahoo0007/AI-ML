import { ContentShellSidebar } from "@/components/content-shell-sidebar";
import { SiteFooter } from "@/components/site-footer";
import type { NavSection } from "@/lib/nav-tree";

interface ContentShellProps {
  navTree: NavSection[];
  children: React.ReactNode;
}

// Section layout: sidebar on the left, page on the right. The page is rendered once and laid out with
// responsive CSS; only the sidebar (collapse, resize and the mobile drawer) is a client island.
export function ContentShell({ navTree, children }: ContentShellProps) {
  return (
    <div data-content-shell className="flex w-full items-start">
      <ContentShellSidebar navTree={navTree} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        {/* On desktop the footer sits in the content column, next to the sticky sidebar; the root footer
            is hidden there by globals.css. */}
        <div className="hidden md:block">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
