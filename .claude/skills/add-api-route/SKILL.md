---
name: add-api-route
description: Use when adding or changing an HTTP endpoint under apps/web/src/app/api (any route.ts handler), or anything that reads or writes user data at request time.
---

# Add an API route

Background: `apps/web/src/server/http.ts` (the wrapper) and `apps/web/src/features/auth/AGENTS.md`.

1. **Only API routes touch the database.** If a page needs user data, the page stays static and a client island
   calls the API. Never query from a page, layout or middleware.

2. **Always wrap with `route`** from `@/features/auth` (the session-bound `createRoute()`). It gives the Origin
   check on state-changing methods, auth/role, the rate-limit hook, a strict zod body, `no-store`, a uniform error
   shape and a per-request `db()`.
   - Good:
     ```ts
     import { z } from "zod";
     import { route } from "@/features/auth";

     export const POST = route({
       auth: "user",
       body: z.object({ contentKey: contentKeySchema }),
       rateLimit: { name: "progress", by: "user" },
       handler: async ({ auth, body, db }) => {
         await setProgress(db(), auth.user.id, body.contentKey, "complete", true);
         return { ok: true };
       },
     });
     ```
   - Bad: `export async function POST(req: Request) { const body = await req.json(); ... }`

3. **Choose the auth level deliberately:** `none`, `optional`, `user` or `admin`. Admin checks happen on the server
   for every request; never trust a client flag. Sensitive actions also check `isFreshSession()`.

4. **Rate-limit every route** with a named limit (`RateLimitName` in `apps/web/src/server/http.ts`); add a new name
   there if none fits, keyed `by: "user"` when signed in, else `"ip"`.

5. **Zod for every input**: body (made strict by the wrapper), query and params. No `any`, no unchecked casts.

6. **GET never changes state.** Use POST/PUT/PATCH/DELETE for writes (link scanners and prefetchers issue GETs).

7. **Errors:** throw `HttpError(status, code, message)`; never return stack traces or echo secrets. Log through
   `apps/web/src/server/log.ts` with ids, never emails, cookies or tokens.

8. **Business logic lives in the feature**, not in the route file: the handler parses and calls a function you can test
   with `createTestDatabase()` (`apps/web/src/server/db/testing.ts`).

9. **Nothing premium leaks:** never return premium content to a non-entitled caller; entitlement comes from the
   database (or a verified `oa_ent`), never from a request parameter or checkout redirect.

10. **Tests:** a unit/integration test for the feature function and the route's auth and validation, plus an E2E
    case if a page uses it. A bug fix includes the test that would have caught it.
