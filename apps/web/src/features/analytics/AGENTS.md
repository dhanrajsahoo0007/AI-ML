# features/analytics: product events (PostHog, cookieless) and the Cloudflare beacon

Product funnels (paywall views, checkout starts, sign-ups) through PostHog in cookieless mode, plus the Cloudflare
Web Analytics beacon for Core Web Vitals by page and country. Both are off until their key exists.

## Public API (`index.ts`)

- `track(name, props)`: sends a catalogue event; a no-op when `NEXT_PUBLIC_POSTHOG_KEY` was unset at build.
- `loadAnalytics()`: starts PostHog once (called by the observability island after first interaction or idle) and
  flushes the queue.
- `events.ts`: the event catalogue (`AnalyticsEvents`), the only list of event names and properties.
- `cloudflare-beacon.tsx`: `<CloudflareBeacon />`, rendered by `apps/web/src/features/observability/observability.tsx`
  only with `NEXT_PUBLIC_CF_BEACON_TOKEN`.
- `posthog.client.ts`: `startPostHog()`, its own chunk, imported only from `track.ts` behind the key check.

## Data flow

UI code → `track("event", props)` → in-memory queue → `loadAnalytics()` imports PostHog lazily → events sent. No
server-side capture yet.

## Invariants and gotchas

- **Every event is in `events.ts`**; a typo or stray property is a type error. Properties are low-cardinality labels
  and counts: never an email, a name, free text, or anything from article content.
- PostHog runs cookieless (memory persistence, no `localStorage`), with autocapture, session recording and heatmaps
  off, so no consent banner is needed. Adding any non-essential cookie would require a geo-targeted banner (plan
  §9.7); don't.
- With no key at build, both functions are empty and webpack builds no PostHog chunk (see `pinPublicObservabilityEnv`
  in `apps/web/src/features/observability/AGENTS.md`). Keep the env check literal.
- Country comes from the edge (`cf-ipcountry`), never asked of the user.
- If Web Analytics is switched on with Cloudflare's automatic setup instead, leave the token unset but add the
  `cloudflareinsights.com` hosts to `apps/web/src/features/observability/csp-hosts.ts`.

## Extend it

Add the event and its props to `events.ts`, call `track()` where it happens, add it to the PostHog dashboard it
belongs to, and cover any new prop shape in `track.test.ts`.

## Tests

`track.test.ts` (sets the key per test and imports a fresh module, because Vitest doesn't inline `NEXT_PUBLIC_*`);
E2E `apps/web/tests/e2e/observability.spec.ts` asserts nothing loads when keys are unset.
