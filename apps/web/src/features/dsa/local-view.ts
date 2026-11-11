import "server-only";
import { LOCAL_VIEW_COOKIE, localView } from "@/server/edge/local-view";

// Local editorial review: on `next dev` (APP_ENV=local) with the local view switch on "Paid" (or LOCAL_VIEW_AS=paid
// in .env.local), a premium problem page shows its editorial, so the owner can read it before Pro delivery exists.
//
// Every other build is unaffected: APP_ENV is inlined at build, so there this is `return false`, the request
// cookies are never read, the page stays static and the editorial is never compiled for it (local-view.test.ts;
// leak.test.ts checks the built pages).

export async function showsPremiumEditorialLocally(): Promise<boolean> {
  if (process.env.APP_ENV !== "local") return false;
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).get(LOCAL_VIEW_COOKIE)?.value;
  return localView(process.env.APP_ENV, cookie, process.env.LOCAL_VIEW_AS) === "paid";
}
