"use client";

import * as React from "react";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { ContentSidebar } from "@/components/content-sidebar";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NavSection } from "@/lib/nav-tree";

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 280;
const SIDEBAR_MAX_VIEWPORT_RATIO = 0.35;

function clampSidebarWidth(target: number) {
  const viewportCap =
    typeof window !== "undefined"
      ? Math.max(SIDEBAR_MIN, Math.floor(window.innerWidth * SIDEBAR_MAX_VIEWPORT_RATIO))
      : SIDEBAR_MAX;
  return Math.min(SIDEBAR_MAX, viewportCap, Math.max(SIDEBAR_MIN, target));
}

// The interactive part of ContentShell: from lg (1024px) up, a sticky, collapsible and resizable sidebar;
// below lg (phones and portrait tablets) a "Contents" button that opens the same navigation in a drawer.
export function ContentShellSidebar({ navTree }: { navTree: NavSection[] }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [customWidth, setCustomWidth] = React.useState<number | null>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onResize = () => setCustomWidth((w) => (w === null ? null : clampSidebarWidth(w)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = customWidth ?? sidebarRef.current?.offsetWidth ?? SIDEBAR_DEFAULT;
      const onMove = (ev: MouseEvent) => setCustomWidth(clampSidebarWidth(startW + (ev.clientX - startX)));
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [customWidth]
  );

  const sidebarWidth = collapsed ? 0 : (customWidth ?? "var(--sidebar-w)");

  return (
    <>
      {/* Desktop: pinned below the header, scrolls on its own; the page scrolls normally so the footer follows the content */}
      <div
        ref={sidebarRef}
        className="sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 border-r border-hairline bg-paper-2 transition-[width] duration-200 ease-in-out [--sidebar-w:280px] lg:block min-[1440px]:[--sidebar-w:340px] min-[1600px]:[--sidebar-w:380px] min-[1920px]:[--sidebar-w:430px]"
        style={{ width: sidebarWidth, overflow: "hidden" }}
      >
        {!collapsed && (
          <div className="flex h-full flex-col" style={{ width: sidebarWidth }}>
            <div className="flex h-11 items-center justify-between border-b border-hairline px-4">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Contents</span>
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-paper hover:text-ink"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <ContentSidebar navTree={navTree} />
          </div>
        )}
      </div>

      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed left-3 top-20 z-30 hidden rounded-full border border-hairline bg-paper p-2 text-muted-foreground transition-colors hover:border-ink hover:text-ink lg:block"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      ) : (
        <div
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="group sticky top-16 z-10 -ml-px hidden h-[calc(100dvh-4rem)] w-1.5 shrink-0 cursor-col-resize items-center justify-center lg:flex"
        >
          <div className="h-full w-px bg-transparent transition-colors group-hover:bg-tint group-active:bg-tint" />
        </div>
      )}

      {/* Mobile & tablet (< lg) */}
      <div className="lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-[0_18px_40px_-24px_rgba(17,17,17,0.6)] transition-colors hover:bg-primary"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
            Contents
          </SheetTrigger>
          {/* The drawer renders outside the shell (a portal), so it carries the section's tint itself. */}
          <SheetContent
            side="left"
            data-tone={navTree.length === 1 ? navTree[0].tone : undefined}
            className="w-[300px] bg-paper-2 p-0 sm:max-w-[340px]"
          >
            <SheetHeader className="border-b border-hairline px-4 py-3">
              <SheetTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Contents
              </SheetTitle>
            </SheetHeader>
            <ContentSidebar navTree={navTree} onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
