import { healthHandler } from "@/server/edge/health";

// GET /api/health → {status, version, env, region}; the deploy smoke test reads `version` (plan §7.8).
export const dynamic = "force-dynamic";
export const GET = healthHandler;
