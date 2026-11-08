// Client-safe exports of the newsletter feature (no server-only code): the sign-up panel of the archive and issue
// pages. Kept out of index.ts because it is JSX and index.ts is imported by the API routes' server-only tests.
export { SignupBox } from "./signup-box";
