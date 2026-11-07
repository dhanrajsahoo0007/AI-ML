import styles from "@/components/motion/motion.module.css";

// Thin reading-progress bar along the top of the window, driven by a CSS scroll timeline (no JavaScript).
// Browsers without scroll-driven animations simply don't show it.
export function ScrollProgress() {
  return <div aria-hidden className={styles.progress} />;
}
