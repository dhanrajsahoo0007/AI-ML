"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createHandlers, copyNotice } from "./protection";
import { domEnv } from "./dom-env";
import "./content-protection.css";

// Client island for copy protection layer 1 (plan §11.10). Listens once on the document; screen readers,
// keyboard navigation, zoom and form controls are untouched.
export function ContentProtectionIsland({ brand }: { brand: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const h = createHandlers(domEnv(brand));
    const on: [string, (e: never) => void][] = [
      ["keydown", h.onKeyDown],
      ["copy", h.onCopy],
      ["cut", h.onCopy],
      ["contextmenu", h.onContextMenu],
      ["dragstart", h.onDragStart],
    ];
    for (const [type, fn] of on) document.addEventListener(type, fn as EventListener, true);
    return () => {
      for (const [type, fn] of on) document.removeEventListener(type, fn as EventListener, true);
    };
  }, [brand]);

  // The print stylesheet shows this notice in place of the content.
  useEffect(() => {
    document.body.dataset.printNotice = copyNotice(brand, location.href);
  }, [brand, pathname]);

  return null;
}
