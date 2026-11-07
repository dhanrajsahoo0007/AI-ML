import React, { type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "@/components/motion/motion.module.css";

interface StaggerChildrenProps {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  /** Seconds between one child's entry and the next. */
  staggerDelay?: number;
}

// Children enter one after another (CSS only, see motion.module.css). The delay is capped so long lists
// don't keep the last items waiting.
export function StaggerChildren({ children, className, itemClassName, staggerDelay = 0.06 }: StaggerChildrenProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <div
          className={cn(styles.enter, itemClassName)}
          style={{ "--motion-delay": `${Math.min(i, 8) * staggerDelay}s` } as CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
