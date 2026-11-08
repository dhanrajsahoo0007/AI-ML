// Public API of the content-protection feature (plan §11.10): the root-layout component. It is a server component
// (.tsx), so server-only tests must not import this index; they import protection.ts and dom-env.ts by path.
export { ContentProtection } from "./content-protection";
