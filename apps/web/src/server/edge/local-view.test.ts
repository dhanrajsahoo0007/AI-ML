import { describe, expect, it } from "vitest";
import { APP_ENVS } from "@/features/sections/schema";
import { localView } from "./local-view";

// The local view switch takes effect in local builds only (middleware and the DSA problem page decide through it).

describe("localView", () => {
  it("follows the cookie, then LOCAL_VIEW_AS, in a local build", () => {
    expect(localView("local", "paid", undefined)).toBe("paid");
    expect(localView("local", "unpaid", "paid")).toBe("unpaid");
    expect(localView("local", undefined, "paid")).toBe("paid");
    expect(localView("local", "real", "paid")).toBeNull();
    expect(localView("local", "admin", undefined)).toBeNull();
    expect(localView("local", undefined, undefined)).toBeNull();
  });
  it.each(APP_ENVS.filter((e) => e !== "local"))("is always null in a %s build", (env) => {
    for (const cookie of ["paid", "unpaid", "real", undefined])
      for (const envDefault of ["paid", "unpaid", undefined]) expect(localView(env, cookie, envDefault)).toBeNull();
  });
  it("is null when APP_ENV is missing or unknown", () => {
    expect(localView(undefined, "paid", "paid")).toBeNull();
    expect(localView("Local", "paid", "paid")).toBeNull();
  });
});
