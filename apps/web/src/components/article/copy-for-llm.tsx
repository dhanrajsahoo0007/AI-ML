"use client";

import * as React from "react";
import { Check, ChevronDown, Copy, ExternalLink, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "copying" | "copied" | "error";

// Copies the article as Markdown via /api/markdown. Safari only allows clipboard writes inside the click
// handler, so the fetch is handed to ClipboardItem as a promise instead of being awaited first.
async function copyMarkdown(markdownUrl: string) {
  const text = () => fetch(markdownUrl).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))));
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const blob = text().then((t) => new Blob([t], { type: "text/plain" }));
    await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
  } else {
    await navigator.clipboard.writeText(await text());
  }
}

// "Copy for LLM" split button: the main part copies the page as Markdown; the menu offers viewing the
// Markdown or opening the page in Claude.
export function CopyForLlm({ pagePath }: { pagePath: string }) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const markdownUrl = `/api/markdown?path=${encodeURIComponent(pagePath)}`;

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = async () => {
    setOpen(false);
    setStatus("copying");
    try {
      await copyMarkdown(markdownUrl);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  const openInClaude = () => {
    setOpen(false);
    const prompt = `Read ${window.location.origin}${pagePath} and help me understand it. I may ask follow-up questions.`;
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, "_blank", "noopener");
  };

  const Icon = status === "copied" ? Check : Copy;
  const label =
    status === "copied" ? "Copied" : status === "error" ? "Couldn't copy" : status === "copying" ? "Copying…" : "Copy for LLM";

  return (
    <div ref={menuRef} className="relative inline-flex">
      <div className="inline-flex overflow-hidden rounded-lg border border-hairline bg-paper text-sm shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <button
          type="button"
          onClick={copy}
          disabled={status === "copying"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-ink transition-colors hover:bg-paper-2"
        >
          <Icon className={cn("size-3.5", status === "copied" && "text-[var(--dg-green)]")} />
          <span aria-live="polite">{label}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="More copy options"
          aria-expanded={open}
          aria-haspopup="menu"
          className="border-l border-hairline px-2 text-muted-foreground transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-hairline bg-paper p-1 shadow-[0_18px_40px_-20px_rgba(17,17,17,0.35)]"
        >
          <MenuItem icon={Copy} title="Copy page" hint="As Markdown, ready to paste into an LLM" onClick={copy} />
          <MenuItem
            icon={FileText}
            title="View as Markdown"
            hint="Open the plain-text version"
            onClick={() => {
              setOpen(false);
              window.open(markdownUrl, "_blank", "noopener");
            }}
          />
          <MenuItem icon={MessageSquare} title="Open in Claude" hint="Ask questions about this page" external onClick={openInClaude} />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  title,
  hint,
  external = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  external?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper-2"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-medium text-ink">
          {title}
          {external && <ExternalLink className="size-3 text-muted-foreground" />}
        </span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
