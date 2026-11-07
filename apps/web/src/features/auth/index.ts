// Public API of the auth feature (plan §3: other code imports this index only). Client islands are imported
// by path (`@/features/auth/sign-in-form.client`): re-exporting .tsx here would pull JSX into server-only tests.
export { route, authFor } from "./route";
export { withPageSession } from "./page-session";
export { authConfig, isGoogleConfigured } from "./config";
export { ageCookie } from "./age-consent";
export { isFreshSession, revokeAllSessions, MAX_SESSIONS_PER_USER } from "./sessions";
export { safeNextPath } from "./next-path";
