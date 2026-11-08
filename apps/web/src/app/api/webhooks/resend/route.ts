import { verifyWebhookSignature } from "@/features/email/webhook-signature";
import { serverToServerRoute } from "@/features/newsletter/http";
import { processResendEvent, RESEND_PROVIDER, resendEventSchema } from "@/features/newsletter/resend-webhook";
import { hasDatabase, NotConfiguredError, resendWebhookSecret } from "@/features/newsletter/server";
import { HttpError } from "@/server/http";
import { log } from "@/server/log";

// POST /api/webhooks/resend: Resend email events (plan §15.2 "Deliverability"; same shape as the billing webhook):
//   1. raw body (the signature covers its exact bytes), at most 256 KB
//   2. Svix signature (RESEND_WEBHOOK_SECRET) and a timestamp within 5 minutes → 401 otherwise, nothing stored
//   3. idempotent, transactional processing (features/newsletter/resend-webhook.ts): a duplicate answers 200
//   4. any processing error answers 500, so Resend retries
// Server to server and signature-checked, so the Origin check is off; no rate limit (plan §11.6). 404 while the
// newsletter section is not `on` in this build.

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

export const POST = serverToServerRoute({
  handler: async ({ request, db, requestId }) => {
    const secret = resendWebhookSecret();
    if (!hasDatabase()) throw new NotConfiguredError("the Resend webhook needs a database");

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_BODY_BYTES) throw new HttpError(413, "body_too_large", "The request body is too large");
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      throw new HttpError(413, "body_too_large", "The request body is too large");
    }

    const verified = await verifyWebhookSignature({ secret, headers: request.headers, body });
    if (!verified.ok) {
      // Counted by the alert on signature failures (plan §11.8): > 5 in 10 minutes.
      log.warn("webhook signature rejected", {
        request_id: requestId,
        provider: RESEND_PROVIDER,
        reason: verified.reason,
      });
      throw new HttpError(401, "invalid_signature", "Webhook signature verification failed");
    }

    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      throw new HttpError(400, "invalid_json", "The request body is not valid JSON");
    }
    const parsed = resendEventSchema.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, "invalid_body", "Not a Resend event");

    const status = await processResendEvent(db(), { eventId: verified.id, event: parsed.data });
    log.info("resend webhook", { request_id: requestId, event_type: parsed.data.type, result: status });
    return { received: true, status };
  },
});
