import { describe, expect, it, vi } from "vitest";
import {
  BLOCKED_KEYS,
  copyNotice,
  createHandlers,
  shouldBlockShortcut,
  TOAST_MESSAGE,
  type KeyLike,
  type ProtectionEnv,
} from "./protection";

// Targets are plain tokens; the fake environment decides what each one is.
const ARTICLE = { kind: "article" } as unknown as EventTarget;
const INPUT = { kind: "input" } as unknown as EventTarget;
const COPY_OK = { kind: "copy-ok" } as unknown as EventTarget;

function env(over: Partial<ProtectionEnv> = {}): ProtectionEnv {
  return {
    brand: "Origins AI Learn",
    isProtected: (t) => t === ARTICLE,
    isEditable: (t) => t === INPUT,
    selectionProtected: () => false,
    protectedPage: () => true,
    url: () => "https://example.test/system-design/caching",
    toast: vi.fn(),
    ...over,
  };
}

function key(k: string, over: Partial<KeyLike> = {}): KeyLike {
  return {
    key: k,
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: ARTICLE,
    preventDefault: vi.fn(),
    ...over,
  };
}

function clipboardEvent(target: EventTarget) {
  const setData = vi.fn();
  return { target, clipboardData: { setData }, preventDefault: vi.fn(), setData };
}

describe("copyNotice", () => {
  it("names the brand and the page URL", () => {
    expect(copyNotice("Origins AI Learn", "https://x.test/a")).toBe(
      "Content © Origins AI Learn. Read it at https://x.test/a"
    );
  });
});

describe("shouldBlockShortcut", () => {
  it.each([...BLOCKED_KEYS])("blocks Ctrl+%s on protected content", (k) => {
    expect(shouldBlockShortcut(key(k), env())).toBe(true);
  });

  it("blocks ⌘ shortcuts on macOS and upper-case keys", () => {
    expect(shouldBlockShortcut(key("P", { ctrlKey: false, metaKey: true }), env())).toBe(true);
  });

  it("ignores other keys and plain key presses", () => {
    expect(shouldBlockShortcut(key("f"), env())).toBe(false);
    expect(shouldBlockShortcut(key("c", { ctrlKey: false }), env())).toBe(false);
  });

  it("leaves Shift and Alt combinations alone (e.g. developer tools)", () => {
    expect(shouldBlockShortcut(key("c", { shiftKey: true }), env())).toBe(false);
    expect(shouldBlockShortcut(key("s", { altKey: true }), env())).toBe(false);
  });

  it("does nothing on pages that opted out", () => {
    expect(shouldBlockShortcut(key("p"), env({ protectedPage: () => false }))).toBe(false);
  });

  it("keeps select all, copy and cut working in form fields", () => {
    for (const k of ["a", "c", "x"]) expect(shouldBlockShortcut(key(k, { target: INPUT }), env())).toBe(false);
  });

  it("still blocks save, print and view source from a form field", () => {
    for (const k of ["s", "p", "u"]) expect(shouldBlockShortcut(key(k, { target: INPUT }), env())).toBe(true);
  });

  it("allows copy from a copy-ok region with no protected selection", () => {
    expect(shouldBlockShortcut(key("c", { target: COPY_OK }), env())).toBe(false);
  });

  it("blocks copy when the selection touches protected content", () => {
    expect(shouldBlockShortcut(key("c", { target: COPY_OK }), env({ selectionProtected: () => true }))).toBe(true);
  });
});

describe("createHandlers", () => {
  it("onKeyDown cancels a blocked shortcut and shows the toast", () => {
    const e = env();
    const ev = key("s");
    createHandlers(e).onKeyDown(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(e.toast).toHaveBeenCalledWith(TOAST_MESSAGE);
  });

  it("onKeyDown lets other keys through", () => {
    const e = env();
    const ev = key("f");
    createHandlers(e).onKeyDown(ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(e.toast).not.toHaveBeenCalled();
  });

  it("onCopy on protected content puts the notice on the clipboard", () => {
    const e = env();
    const ev = clipboardEvent(ARTICLE);
    createHandlers(e).onCopy(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(ev.setData).toHaveBeenCalledWith(
      "text/plain",
      "Content © Origins AI Learn. Read it at https://example.test/system-design/caching"
    );
    expect(e.toast).toHaveBeenCalled();
  });

  it("onCopy replaces a selection that reaches protected content from outside", () => {
    const ev = clipboardEvent(COPY_OK);
    createHandlers(env({ selectionProtected: () => true })).onCopy(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it("onCopy leaves form fields and copy-ok regions alone", () => {
    for (const target of [INPUT, COPY_OK]) {
      const ev = clipboardEvent(target);
      createHandlers(env()).onCopy(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
      expect(ev.setData).not.toHaveBeenCalled();
    }
  });

  it("onCopy still cancels when the browser gives no clipboardData", () => {
    const ev = { target: ARTICLE, clipboardData: null, preventDefault: vi.fn() };
    createHandlers(env()).onCopy(ev);
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it("onContextMenu and onDragStart block only protected content", () => {
    const h = createHandlers(env());
    for (const fn of [h.onContextMenu, h.onDragStart]) {
      const inside = { target: ARTICLE, preventDefault: vi.fn() };
      const outside = { target: COPY_OK, preventDefault: vi.fn() };
      fn(inside);
      fn(outside);
      expect(inside.preventDefault).toHaveBeenCalled();
      expect(outside.preventDefault).not.toHaveBeenCalled();
    }
  });
});
