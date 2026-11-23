import {
  Activity,
  Bell,
  Database,
  Globe,
  HardDrive,
  Layers,
  MessagesSquare,
  Network,
  Server,
  Smartphone,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Plain module (no "use client"), so the spec lint can resolve icon names the way the renderers do.

/** Lucide fallbacks for icon names that have no drawn glyph. */
export const DIAGRAM_ICONS: Record<string, LucideIcon> = {
  phone: Smartphone,
  "load-balancer": Network,
  chat: MessagesSquare,
  database: Database,
  cache: Zap,
  bell: Bell,
  blob: HardDrive,
  socket: Activity,
  queue: Layers,
  users: Users,
  server: Server,
  globe: Globe,
  workers: Workflow,
};
