"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll } from "framer-motion";

// On desktop, articles scroll inside ContentShell's panel rather than the
// window, so track the nearest scrollable ancestor when there is one.
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

export function ScrollProgress() {
  const markerRef = useRef<HTMLSpanElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>();

  useEffect(() => {
    setContainer(findScrollParent(markerRef.current));
  }, []);

  return (
    <>
      <span ref={markerRef} hidden />
      {container !== undefined && <ProgressBar container={container} />}
    </>
  );
}

function ProgressBar({ container }: { container: HTMLElement | null }) {
  const containerRef = useMemo(() => ({ current: container }), [container]);
  const { scrollYProgress } = useScroll(
    container ? { container: containerRef } : undefined
  );

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-px origin-left bg-primary"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
