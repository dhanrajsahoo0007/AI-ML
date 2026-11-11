// The local view switch (components/local-view-switch.client.tsx): on `next dev` (APP_ENV=local) the site can be
// viewed as a paying or a non-paying reader without signing in or out. Pure and edge-safe; middleware and the
// DSA problem page both decide through localView(), so the rule that only local builds honour it lives here once.

/** Cookie set by the switch: `real`, `paid` or `unpaid`. */
export const LOCAL_VIEW_COOKIE = "tts_local_view";

export type LocalView = "paid" | "unpaid";

/**
 * The view the switch asks for: the cookie, else LOCAL_VIEW_AS from .env.local. Always null unless the build's
 * APP_ENV is `local`, whatever the cookie or env say; `real`, unset or unknown values are null too.
 */
export function localView(
  appEnv: string | undefined,
  cookie: string | undefined,
  envDefault: string | undefined
): LocalView | null {
  if (appEnv !== "local") return null;
  const view = cookie ?? envDefault;
  return view === "paid" || view === "unpaid" ? view : null;
}
