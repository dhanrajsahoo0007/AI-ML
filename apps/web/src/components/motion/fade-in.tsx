import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "@/components/motion/motion.module.css";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  /** Seconds before the entry effect starts (load effect only). */
  delay?: number;
  duration?: number;
  /** Distance in px the content rises from. */
  y?: number;
  /**
   * Fade in when scrolled into view instead of on load. Use it for content below the fold; content above
   * the fold should use the default load effect, which never hides it.
   */
  inView?: boolean;
}

// CSS-only entry effect (see motion.module.css): a server component, visible without JavaScript and
// switched off for reduced motion.
export function FadeIn({ children, className, delay = 0, duration = 0.6, y, inView = false }: FadeInProps) {
  const style = {
    "--motion-delay": `${delay}s`,
    "--motion-duration": `${duration}s`,
    ...(y !== undefined && { "--motion-y": `${y}px` }),
  } as CSSProperties;
  return (
    <div className={cn(inView ? styles.reveal : styles.enter, className)} style={style}>
      {children}
    </div>
  );
}
