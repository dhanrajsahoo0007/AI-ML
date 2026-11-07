// Public API of the auth feature (plan §3: other code imports this index only).
export { route, authFor } from "./route";
export { withPageSession } from "./page-session";
export { authConfig, isGoogleConfigured } from "./config";
export { ageCookie, requestCountry, AGE_TEXT_VERSION } from "./age-consent";
export { isFreshSession, revokeAllSessions, REAUTH_WINDOW_MS, MAX_SESSIONS_PER_USER } from "./sessions";
export { TEST_LOGIN_HEADER } from "./test-login";
