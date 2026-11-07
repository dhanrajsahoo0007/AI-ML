/** A same-site path to continue to after sign-in; anything else (absolute, protocol-relative) becomes `fallback`. */
export function safeNextPath(raw: string | string[] | undefined, fallback = "/account"): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/") || value.startsWith("/sign-in")) return fallback;
  return value.slice(0, 512);
}
