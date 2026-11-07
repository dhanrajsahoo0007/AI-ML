import { asElement, COPY_OK, COPY_OK_PAGE, EDITABLE, type ProtectionEnv } from "./protection";

// The real DOM behind ProtectionEnv. Kept apart from the decisions so those stay testable without a DOM.

const isEditable = (t: EventTarget | Node | null) => !!asElement(t)?.closest(EDITABLE);

const isProtected = (t: EventTarget | Node | null) => {
  const el = asElement(t);
  return !!el?.closest("main") && !el.closest(COPY_OK) && !isEditable(el);
};

const protectedPage = () => !!document.querySelector("main") && !document.querySelector(COPY_OK_PAGE);

let toastEl: HTMLElement | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function domEnv(brand: string): ProtectionEnv {
  return {
    brand,
    isEditable,
    isProtected,
    protectedPage,
    selectionProtected() {
      const sel = getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
      const el = asElement(sel.getRangeAt(0).commonAncestorContainer);
      if (!el) return false;
      // A selection that spans <main> from outside (e.g. header to body) counts as protected on protected pages.
      return isProtected(el) || (protectedPage() && !!el.querySelector("main"));
    },
    url: () => location.href,
    toast(message) {
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "cp-toast";
        toastEl.setAttribute("role", "status");
        document.body.append(toastEl);
      }
      toastEl.textContent = message;
      toastEl.dataset.show = "";
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl && delete toastEl.dataset.show, 2400);
    },
  };
}
