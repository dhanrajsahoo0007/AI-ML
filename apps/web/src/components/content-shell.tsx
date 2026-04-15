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
            className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/90 shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[320px]">
            <SheetHeader className="border-b border-border/40 px-4 py-3">
              <SheetTitle>Navigate</SheetTitle>
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
        className="relative shrink-0 border-r border-border/40 bg-muted/20 transition-[width] duration-200 ease-in-out"
        style={{ width: collapsed ? 0 : width, overflow: "hidden" }}
      >
        {!collapsed && (
          <div className="flex h-full flex-col" style={{ width }}>
            <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navigate
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          className="group relative z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20"
        >
          <div className="h-8 w-0.5 rounded-full bg-border transition-colors group-hover:bg-primary/40 group-active:bg-primary/60" />
        </div>
      )}

      {/* Main content */}
      <div className="relative min-w-0 flex-1 overflow-y-auto">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="fixed left-2 top-16 z-30 rounded-md border border-border/60 bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
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
