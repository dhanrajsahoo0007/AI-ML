import { z } from "zod";
import { newsletterRoute } from "@/features/newsletter/http";
import { newsletterDeps, newsletterHref, newsletterStore } from "@/features/newsletter/server";
import { accountStatus, subscribeWithAccount, unsubscribeAccount } from "@/features/newsletter/service";

// The signed-in user's newsletter subscription (plan §15.2 step 5).
//   GET   {signedIn: false} for signed-out visitors (no database work), else {signedIn, email, status}. The
//         sign-up form asks this to offer "Subscribe with your account".
//   POST  {action: "subscribe" | "unsubscribe"}: one click, no double opt-in (Google verified the address).

export const dynamic = "force-dynamic";

export const GET = newsletterRoute({
  auth: "optional",
  handler: async ({ auth, db }) => {
    if (!auth) return { signedIn: false };
    return { signedIn: true, ...(await accountStatus(newsletterStore(db), auth.user)) };
  },
});

const body = z.object({
  action: z.enum(["subscribe", "unsubscribe"]),
  source: z.enum(["account", "archive", "issue"]).default("account"),
});

export const POST = newsletterRoute({
  auth: "user",
  body,
  rateLimit: { name: "account", by: "user" },
  handler: async ({ auth, body, db, request }) => {
    const result =
      body.action === "subscribe"
        ? await subscribeWithAccount(newsletterDeps(newsletterHref()!, db), auth.user, {
            source: body.source,
            country: request.headers.get("cf-ipcountry"),
          })
        : await unsubscribeAccount(newsletterStore(db), auth.user);
    return { signedIn: true, ...result };
  },
});
