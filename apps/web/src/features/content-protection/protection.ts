// Layer 1 of content protection (plan §11.10): browser deterrents against casual copying. The decisions are
// pure functions over a small environment, so they are unit-tested without a DOM; the client island in
// content-protection.client.tsx supplies the real DOM environment.
//
// Scope: everything inside <main> is protected, except subtrees marked `data-copy-ok` (legal pages, pricing,
// contact) and form controls. A page opts out of the keyboard and print rules with `data-copy-ok="page"`.

/** Form controls and editable regions always keep normal copy, paste and selection. */
export const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
/** Regions that stay copyable. */
export const COPY_OK = "[data-copy-ok]";
/** Marker for a whole page that is not protected (no shortcut interception, printing allowed). */
export const COPY_OK_PAGE = '[data-copy-ok="page"]';

/** Ctrl/⌘ + these keys are intercepted on protected pages: copy, cut, select all, save, print, view source. */
export const BLOCKED_KEYS = new Set(["c", "x", "a", "s", "p", "u"]);

export function copyNotice(brand: string, url: string) {
  return `Content © ${brand}. Read it at ${url}`;
}

export const TOAST_MESSAGE = "This content is protected and can't be copied.";

export interface ProtectionEnv {
  /** True when the node is inside protected content (in <main>, not editable, not in a copy-ok region). */
  isProtected(target: EventTarget | null): boolean;
  /** True when the node is a form control or editable region. */
  isEditable(target: EventTarget | null): boolean;
  /** True when the current text selection touches protected content. */
  selectionProtected(): boolean;
  /** True when the page has protected content and hasn't opted out with data-copy-ok="page". */
  protectedPage(): boolean;
  brand: string;
  url(): string;
  toast(message: string): void;
}

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
  preventDefault(): void;
}

export interface ClipboardLike {
  target: EventTarget | null;
  clipboardData: { setData(type: string, data: string): void } | null;
  preventDefault(): void;
}

export interface PointerLike {
  target: EventTarget | null;
  preventDefault(): void;
}

/** True when Ctrl/⌘ + key should be blocked. */
export function shouldBlockShortcut(e: KeyLike, env: ProtectionEnv): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return false;
  const key = e.key.toLowerCase();
  if (!BLOCKED_KEYS.has(key) || !env.protectedPage()) return false;
  // Select all, copy and cut keep working in search boxes and forms, and on selections in copy-ok regions.
  if (key === "a" || key === "c" || key === "x") {
    if (env.isEditable(e.target)) return false;
    if ((key === "c" || key === "x") && !env.selectionProtected() && !env.isProtected(e.target)) return false;
  }
  return true;
}

export function createHandlers(env: ProtectionEnv) {
  const block = (e: { preventDefault(): void }) => {
    e.preventDefault();
    env.toast(TOAST_MESSAGE);
  };

  return {
    onKeyDown(e: KeyLike) {
      if (shouldBlockShortcut(e, env)) block(e);
    },
    /** Copy and cut: the clipboard gets the notice instead of the content. */
    onCopy(e: ClipboardLike) {
      if (env.isEditable(e.target)) return;
      if (!env.isProtected(e.target) && !env.selectionProtected()) return;
      e.clipboardData?.setData("text/plain", copyNotice(env.brand, env.url()));
      block(e);
    },
    /** Right-click is disabled on protected content only; links keep their menu. */
    onContextMenu(e: PointerLike) {
      if (env.isProtected(e.target) && !isLink(e.target)) e.preventDefault();
    },
    onDragStart(e: PointerLike) {
      if (env.isProtected(e.target)) e.preventDefault();
    },
  };
}

function isLink(target: EventTarget | null) {
  const el = asElement(target);
  return !!el?.closest("a[href]");
}

/** The element for an event target (text nodes resolve to their parent). */
export function asElement(target: EventTarget | Node | null): Element | null {
  if (!target || typeof (target as Node).nodeType !== "number") return null;
  const node = target as Node;
  return node.nodeType === 1 ? (node as Element) : node.parentElement;
}
