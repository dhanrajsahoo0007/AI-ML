import { describe, expect, it, vi } from "vitest";
import { DATA_COLLECTION, TRACES_SAMPLE_RATE, scrubEvent } from "./sentry-options";
import { sentryWorkerOptions, withWorkerSentry, type WorkerHandler } from "./sentry.worker";

// Sentry on the Worker entry (plan §10.1): per request, only with SENTRY_DSN; without it the SDK isn't loaded.

type Ctx = Parameters<NonNullable<WorkerHandler["fetch"]>>[2];
const ctx: Ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
const request = () => new Request("https://example.com/");

function fakeSentry() {
  const optionsSeen: object[] = [];
  const withSentry = vi.fn((options: (env: CloudflareEnv) => object | undefined, handler: WorkerHandler) => ({
    fetch: async (req: Request, env: CloudflareEnv, c: Ctx) => {
      optionsSeen.push(options(env)!);
      const res = await handler.fetch!(req, env, c);
      return new Response(await res.text(), { headers: { "x-sentry": "1" } });
    },
  }));
  return { load: vi.fn(async () => ({ withSentry })), withSentry, optionsSeen };
}

const openNext: WorkerHandler = { fetch: async () => new Response("page") };

describe("withWorkerSentry", () => {
  it("passes requests straight through and never loads the SDK without SENTRY_DSN", async () => {
    const sentry = fakeSentry();
    const worker = withWorkerSentry(openNext, sentry.load);
    for (const env of [{}, { SENTRY_DSN: "" }, { APP_ENV: "production" as const }]) {
      const res = await worker.fetch!(request(), env, ctx);
      expect(await res.text()).toBe("page");
      expect(res.headers.get("x-sentry")).toBeNull();
    }
    expect(sentry.load).not.toHaveBeenCalled();
  });

  it("starts Sentry per request with SENTRY_DSN, loading the SDK once per isolate", async () => {
    const sentry = fakeSentry();
    const worker = withWorkerSentry(openNext, sentry.load);
    const env = { SENTRY_DSN: "https://k@o0.ingest.sentry.io/1", APP_ENV: "staging" as const, SENTRY_RELEASE: "abc" };
    for (let i = 0; i < 3; i++) {
      const res = await worker.fetch!(request(), env, ctx);
      expect(res.headers.get("x-sentry")).toBe("1");
      expect(await res.text()).toBe("page");
    }
    expect(sentry.load).toHaveBeenCalledTimes(1);
    expect(sentry.withSentry).toHaveBeenCalledTimes(1);
    expect(sentry.optionsSeen).toHaveLength(3);
    expect(sentry.optionsSeen[0]).toMatchObject({ dsn: env.SENTRY_DSN, environment: "staging", release: "abc" });
    // withSentry gets a copy, so it can't patch the handler the DSN-less path uses.
    expect(sentry.withSentry.mock.calls[0]![1]).not.toBe(openNext);
  });

  it("keeps serving without Sentry if the SDK fails to load", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const worker = withWorkerSentry(openNext, async () => {
      throw new Error("no module");
    });
    const res = await worker.fetch!(request(), { SENTRY_DSN: "https://k@o0.ingest.sentry.io/1" }, ctx);
    expect(await res.text()).toBe("page");
    expect(errors.mock.calls.flat().join("\n")).toContain("sentry_worker_load_failed");
    errors.mockRestore();
  });

  it("wraps only the handlers the entry has (room for a queue consumer)", async () => {
    const queue = vi.fn(async () => {});
    const worker = withWorkerSentry({ ...openNext, queue }, fakeSentry().load);
    expect(Object.keys(worker).sort()).toEqual(["fetch", "queue"]);
    await worker.queue!({ messages: [] }, {}, ctx);
    expect(queue).toHaveBeenCalledWith({ messages: [] }, {}, ctx);
    expect(Object.keys(withWorkerSentry(openNext, fakeSentry().load))).toEqual(["fetch"]);
  });
});

describe("sentryWorkerOptions", () => {
  it("uses the same privacy settings as the browser and next start", () => {
    const options = sentryWorkerOptions({ SENTRY_DSN: "https://k@o0.ingest.sentry.io/1", APP_ENV: "production" });
    expect(options).toMatchObject({
      dataCollection: DATA_COLLECTION,
      tracesSampleRate: TRACES_SAMPLE_RATE,
      beforeSend: scrubEvent,
      beforeSendTransaction: scrubEvent,
      traceLifecycle: "static",
      environment: "production",
      release: undefined,
    });
  });
});
