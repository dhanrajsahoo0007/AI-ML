// Pure helpers for <LearningPath>.

/** Sum of the steps' minutes; steps without one count as 0. */
export function totalMinutes(steps: readonly { minutes?: number }[]): number {
  return steps.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
}

/** 45 → "45 min", 60 → "1 h", 90 → "1 h 30 min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
