// Shared skeleton for the System Design case-study figures (/system-design-case-studies; plan:
// SYSTEM-DESIGN/plans/case-studies-plan.md §6.3 and §7). Every hero (`<slug>/architecture`, 1200 × 740) has the same
// six zones in the same places, so a reader who has seen one case study can read the next at a glance.
//
// Sequence and layout figures use PATTERN_TONE from presets/patterns.ts (import it; never edit that file). A page
// may add presets/case-<slug>.ts for its own constants; the preset test pins it.

import type { DiagramZone, LayoutTone } from "../types";

/** The six zones of CASE-STUDY-FORMAT.md and their tones. */
export const ZONE = {
  clients: { title: "Clients", tone: "neutral" },
  edge: { title: "Edge", tone: "blue" },
  core: { title: "Core", tone: "green" },
  services: { title: "Application services", tone: "teal" },
  async: { title: "Async pipeline", tone: "orange" },
  storage: { title: "Storage", tone: "violet" },
} as const satisfies Record<string, { title: string; tone: LayoutTone }>;

export type ZoneId = keyof typeof ZONE;

/** Canvas of every hero. */
export const HERO = { width: 1200, height: 740 } as const;

/**
 * Zone rectangles of the 1200 × 740 hero (the grid of messenger/architecture): Clients and Edge are full-height
 * columns on the left, Core sits above Application services in the middle, Async beside them, Storage on the right.
 * `titles` renames a zone for this system (for example core: "Real-time messaging"); `omit` drops a zone the system
 * does not have.
 */
export function zoneFrame(titles: Partial<Record<ZoneId, string>> = {}, omit: readonly ZoneId[] = []): DiagramZone[] {
  const rects: Record<ZoneId, { x: number; y: number; w: number; h: number }> = {
    clients: { x: 20, y: 60, w: 170, h: 620 },
    edge: { x: 212, y: 60, w: 170, h: 620 },
    core: { x: 405, y: 60, w: 340, h: 230 },
    services: { x: 405, y: 330, w: 340, h: 350 },
    async: { x: 768, y: 60, w: 222, h: 440 },
    storage: { x: 1012, y: 60, w: 172, h: 620 },
  };
  return (Object.keys(ZONE) as ZoneId[])
    .filter((id) => !omit.includes(id))
    .map((id) => ({ id, title: titles[id] ?? ZONE[id].title, tone: ZONE[id].tone, ...rects[id] }));
}
