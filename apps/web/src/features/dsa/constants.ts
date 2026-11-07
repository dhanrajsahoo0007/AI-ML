// Client-safe constants of the DSA section (no zod, no Node): shared by the schemas, the problem list and
// the in-browser runner.

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** Languages the in-browser runner supports (Stage B). Java and C++ come with the Stage C judge. */
export const LANGUAGES = ["javascript", "python"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = { javascript: "JavaScript", python: "Python" };

/** How a solution is called: a plain function, or a class driven by a list of operations (LRU Cache). */
export const HARNESS_MODES = ["function", "class"] as const;
export type HarnessMode = (typeof HARNESS_MODES)[number];
