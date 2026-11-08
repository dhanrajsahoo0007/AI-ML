import { route } from "@/features/auth";
import { processBillingEvent, providerFor, WebhookVerificationError } from "@/features/billing";
import { writeAnalytics } from "@/server/edge/analytics";
import { serverEnv } from "@/server/env";
import { log } from "@/server/log";
import { HttpError, notFound } from "@/server/http";

// Payment-provider webhooks (plan §9.3), one URL per provider: /api/billing/webhook/dodo.
//   1. raw body (the signature covers its exact bytes), at most 256 KB
//   2. signature + timestamp within 5 minutes (Standard Webhooks for Dodo) → 401 otherwise, nothing stored
//   3. idempotent and transactional processing (features/billing/apply.ts): a duplicate answers 200
//   4. any processing error is stored on the webhook_event row and answers 500, so the provider retries
// Server to server and signature-checked, so the Origin check is off; no rate limit (plan §11.6).
// Every delivery to a known provider is one `billing_webhook` Analytics Engine point: event type, outcome
// (`processed`, `duplicate` or the error code) and the handling time.

const MAX_BODY_BYTES = 256 * 1024;

export const POST = route({
  origin: false,
  handler: async ({ request, params, requestId, db }) => {
    const provider = providerFor(String(params.provider), serverEnv());
    if (!provider) throw notFound();
    const started = Date.now();
    let type = "unknown";
    const metric = (outcome: string) =>
      writeAnalytics({
        event: "billing_webhook",
        provider: provider.id,
        type,
        outcome,
        durationMs: Date.now() - started,
      });
    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        throw new HttpError(413, "body_too_large", "The request body is too large");
      }
      let eventId: string;
      try {
        ({ eventId } = await provider.verifyWebhook({ headers: request.headers, body }));
      } catch (err) {
        if (err instanceof WebhookVerificationError) {
          log.warn("billing webhook rejected", { request_id: requestId, provider: provider.id, reason: err.message });
          throw new HttpError(401, "invalid_signature", "Webhook signature verification failed");
        }
        throw err;
      }
      // An authentic body we can't parse is our bug: 500, so the provider retries after the fix.
      const event = provider.parseEvent(body, eventId);
      type = `${event.kind}.${event.type}`;
      const status = await processBillingEvent(db(), provider.id, event);
      log.info("billing webhook", { request_id: requestId, provider: provider.id, event_type: type, result: status });
      metric(status);
      return { received: true, status };
    } catch (err) {
      metric(err instanceof HttpError ? err.code : "error");
      throw err;
    }
  },
});
