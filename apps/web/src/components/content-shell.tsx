"use client";

import * as React from "react";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { ContentSidebar } from "@/components/content-sidebar";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NavSection } from "@/lib/nav-tree";

interface ContentShellProps {
  navTree: NavSection[];
  children: React.ReactNode;
}

export function ContentShell({ navTree, children }: ContentShellProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <>
      <div className="hidden h-[calc(100vh-4rem)] md:flex">
        <DesktopShell navTree={navTree}>{children}</DesktopShell>
      </div>

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
            <ContentSidebar
              navTree={navTree}
              onNavigate={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
        {children}
      </div>
    </>
  );
}

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 280;

function DesktopShell({
  navTree,
  children,
}: {
  navTree: NavSection[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [width, setWidth] = React.useState(SIDEBAR_DEFAULT);
  const isDragging = React.useRef(false);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const newW = Math.min(
          SIDEBAR_MAX,
          Math.max(SIDEBAR_MIN, startW + (ev.clientX - startX))
        );
        setWidth(newW);
      };

      const onUp = () => {
        isDragging.current = false;
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
    [width]
  );

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div
        className="relative shrink-0 border-r border-hairline bg-paper-2/50 transition-[width] duration-200 ease-in-out"
        style={{ width: collapsed ? 0 : width, overflow: "hidden" }}
      >
        {!collapsed && (
          <div className="flex h-full flex-col" style={{ width }}>
            <div className="flex h-11 items-center justify-between border-b border-hairline px-4">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Contents
              </span>
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

      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="group relative z-10 -ml-px flex w-1.5 shrink-0 cursor-col-resize items-center justify-center"
        >
          <div className="h-full w-px bg-transparent transition-colors group-hover:bg-primary group-active:bg-primary" />
        </div>
      )}

      {/* Main content */}
      <div className="relative min-w-0 flex-1 overflow-y-auto">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="fixed left-3 top-20 z-30 rounded-full border border-hairline bg-paper p-2 text-muted-foreground transition-colors hover:border-ink hover:text-ink"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
