// The Worker entry (wrangler.jsonc `main`; an OpenNext "custom worker"). It wraps the handler that
// `opennextjs-cloudflare build` generates in .open-next/worker.js, so `npm run cf:build -w web` must run first
// (`npm run preview -w web` and the deploy workflows do). Wrangler bundles this file with that output.
//
// - fetch: OpenNext's handler; Sentry starts per request only when the SENTRY_DSN secret is set
//   (src/features/observability/sentry.worker.ts), otherwise requests go straight through.
// - queue: the transactional email consumer, handleEmailQueue (src/features/email/queue-consumer.ts), for the
//   `queues.consumers` block in wrangler.jsonc. Until that block is uncommented no queue is bound, nothing is ever
//   delivered here, and enqueueEmail() sends inline instead. Route by `batch.queue` if a second queue is added.
// - OpenNext's Durable Object classes (DOQueueHandler, DOShardedTagCache, BucketCachePurge) are not re-exported:
//   no binding uses them. Re-export them from ./.open-next/worker.js if one is ever added.
//
// Plain JavaScript on purpose: TypeScript would follow this import into the ~70 MB generated bundle (allowJs) and
// make `npm run typecheck` take a minute and gigabytes of memory after every cf:build. The typed, tested logic is in
// sentry.worker.ts; keep this file to wiring only.
import openNext from "./.open-next/worker.js";
import { handleEmailQueue } from "./src/features/email/queue-consumer.ts";
import { withWorkerSentry } from "./src/features/observability/sentry.worker.ts";

export default withWorkerSentry({
  fetch: openNext.fetch,
  queue: handleEmailQueue,
});
