"use client";

import * as React from "react";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { ContentSidebar } from "@/components/content-sidebar";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NavSection } from "@/lib/nav-tree";

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 280;

// The interactive part of ContentShell: on desktop a sticky, collapsible and resizable sidebar; on mobile
// a "Contents" button that opens the same navigation in a drawer.
export function ContentShellSidebar({ navTree }: { navTree: NavSection[] }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [width, setWidth] = React.useState(SIDEBAR_DEFAULT);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = width;
      const onMove = (ev: MouseEvent) =>
        setWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + (ev.clientX - startX))));
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
    [width],
  );

  return (
    <>
      {/* Desktop: pinned below the header, scrolls on its own; the page scrolls normally so the footer follows the content */}
      <div
        className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-hairline bg-paper-2 transition-[width] duration-200 ease-in-out md:block"
        style={{ width: collapsed ? 0 : width, overflow: "hidden" }}
      >
        {!collapsed && (
          <div className="flex h-full flex-col" style={{ width }}>
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
          className="fixed left-3 top-20 z-30 hidden rounded-full border border-hairline bg-paper p-2 text-muted-foreground transition-colors hover:border-ink hover:text-ink md:block"
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
          className="group sticky top-16 z-10 -ml-px hidden h-[calc(100vh-4rem)] w-1.5 shrink-0 cursor-col-resize items-center justify-center md:flex"
        >
          <div className="h-full w-px bg-transparent transition-colors group-hover:bg-primary group-active:bg-primary" />
        </div>
      )}

      {/* Mobile */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-[0_18px_40px_-24px_rgba(17,17,17,0.6)] transition-colors hover:bg-primary"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
            Contents
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] bg-paper-2 p-0 sm:max-w-[340px]">
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
