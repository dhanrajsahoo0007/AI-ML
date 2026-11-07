// Route labels for vitals and analytics, computed in the browser from the URL path (never the query string, which
// could carry anything). The section is the first path segment (every section and static page lives at
// `/<segment>/…`), and `/` is `home`.

const SEGMENT = /^[a-z0-9-]{1,64}$/;

/** The path without query or hash, capped in length. */
export function routeOf(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return path.length > 256 ? path.slice(0, 256) : path;
}

/** `home` for `/`, else the first path segment, or `other` when it isn't a plain lower-case slug. */
export function sectionOf(pathname: string): string {
  const first = routeOf(pathname).split("/")[1] ?? "";
  if (first === "") return "home";
  return SEGMENT.test(first) ? first : "other";
}
