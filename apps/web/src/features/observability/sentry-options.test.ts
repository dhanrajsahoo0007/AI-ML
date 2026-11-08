import { describe, expect, it } from "vitest";
import type { Event } from "@sentry/nextjs";
import { DATA_COLLECTION, isLocalHost, scrubEvent } from "./sentry-options";
import { PUBLIC_OBSERVABILITY_ENV, pinPublicObservabilityEnv } from "./public-env";

describe("scrubEvent", () => {
  it("drops events from local hosts", () => {
    for (const url of [
      "http://localhost:3001/x",
      "http://127.0.0.1:3100/",
      "http://app.localhost/",
      "http://web.test/",
    ]) {
      expect(scrubEvent({ request: { url } } as Event)).toBeNull();
    }
    expect(isLocalHost("originsai.example")).toBe(false);
  });

  it("keeps only the user ID and removes cookies, query strings, bodies and identifying headers", () => {
    const event = scrubEvent({
      user: { id: "u_1", email: "a@b.co", ip_address: "1.2.3.4", username: "jane" },
      request: {
        url: "https://originsai.example/pricing?email=a@b.co#x",
        cookies: { oa_ent: "1" },
        query_string: "email=a@b.co",
        data: { card: "4242" },
        headers: {
          Cookie: "oa_ent=1",
          Authorization: "Bearer x",
          "CF-Connecting-IP": "1.2.3.4",
          "X-Forwarded-For": "1.2.3.4",
          "User-Agent": "UA",
        },
      },
    } as Event);
    expect(event).toEqual({
      user: { id: "u_1" },
      request: { url: "https://originsai.example/pricing", headers: { "User-Agent": "UA" } },
    });
  });

  it("removes the user entirely when it has no ID", () => {
    expect(scrubEvent({ user: { email: "a@b.co" } } as Event)?.user).toEqual({});
  });
});

describe("Sentry data collection", () => {
  it("collects no user info, cookies, bodies, query strings or local variables", () => {
    expect(DATA_COLLECTION).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    });
  });
});

describe("pinPublicObservabilityEnv", () => {
  it("sets unset variables to an empty string and keeps the ones that are set", () => {
    const env: Record<string, string | undefined> = { NEXT_PUBLIC_POSTHOG_KEY: "phc_x" };
    pinPublicObservabilityEnv(env);
    for (const name of PUBLIC_OBSERVABILITY_ENV) {
      expect(env[name]).toBe(name === "NEXT_PUBLIC_POSTHOG_KEY" ? "phc_x" : "");
    }
  });
});
