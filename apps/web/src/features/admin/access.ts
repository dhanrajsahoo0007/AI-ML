import "server-only";
import { notFound, redirect } from "next/navigation";
import { isFreshSession, withPageSession } from "@/features/auth";
import type { Db } from "@/server/db/client";
import { writeAudit } from "@/server/db/admin-queries";
import type { RequestSessionInfo } from "@/server/http";

// Access to /admin (plan §10.5, §11.1, §11.2). Every admin page calls adminPage() itself: layouts are not
// re-rendered on client navigation between sibling pages, so a check in the layout alone would not cover them.
//
// - signed out, or signed in without role=admin → 404 (the dashboard's existence is not revealed)
// - admin whose sign-in is older than 10 minutes → sign in again (the same re-auth flow as /account/data)
// - every admin view, and every refused attempt by a signed-in user, is written to audit_log

export type AdminGate = "ok" | "not_found" | "reauth";

export function adminGate(auth: RequestSessionInfo | null, now = Date.now()): AdminGate {
  if (!auth || auth.user.role !== "admin") return "not_found";
  return isFreshSession(auth.session.createdAt, now) ? "ok" : "reauth";
}

export const AUDIT_ACTIONS = {
  view: "admin.view",
  denied: "admin.denied",
  reauth: "admin.reauth_required",
} as const;

export interface AdminViewer {
  id: string;
  email: string;
  sessionId: string;
}

export function reauthUrl(path: string): string {
  return `/sign-in?reauth=1&callbackURL=${encodeURIComponent(path)}`;
}

/**
 * Checks access for an admin page at `path`, records the view, then runs `load` with the request's database
 * handle. Throws Next's notFound()/redirect() for everyone else, so the caller only ever sees an admin.
 */
export async function adminPage<T>(
  path: string,
  load: (db: Db, viewer: AdminViewer) => Promise<T>,
  meta?: Record<string, unknown>
): Promise<{ viewer: AdminViewer; data: T }> {
  type Outcome = { gate: "not_found" | "reauth" } | { gate: "ok"; viewer: AdminViewer; data: T };
  const outcome = await withPageSession(async (auth, db): Promise<Outcome> => {
    const gate = adminGate(auth);
    if (gate !== "ok") {
      await writeAudit(db, {
        actor: auth.user.id,
        action: gate === "reauth" ? AUDIT_ACTIONS.reauth : AUDIT_ACTIONS.denied,
        target: path,
      });
      return { gate };
    }
    const viewer: AdminViewer = { id: auth.user.id, email: auth.user.email, sessionId: auth.session.id };
    await writeAudit(db, {
      actor: viewer.id,
      action: AUDIT_ACTIONS.view,
      target: path,
      meta: { session: viewer.sessionId, ...meta },
    });
    return { gate, viewer, data: await load(db, viewer) };
  });
  if (!outcome || outcome.gate === "not_found") notFound();
  if (outcome.gate !== "ok") redirect(reauthUrl(path));
  return { viewer: outcome.viewer, data: outcome.data };
}
