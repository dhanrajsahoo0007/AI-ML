import type { Difficulty } from "./constants";

/** Text colour per difficulty, light and dark. Client-safe. */
export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: "text-emerald-700 dark:text-emerald-400",
  medium: "text-amber-700 dark:text-amber-400",
  hard: "text-rose-700 dark:text-rose-400",
};
