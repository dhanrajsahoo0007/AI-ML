// Keyboard handling for a roving-tabindex tablist (WAI-ARIA tabs pattern). Pure, so the client island stays tiny.

/** Index to move to for an arrow/Home/End key, or null for any other key. Wraps at both ends. */
export function nextTabIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
