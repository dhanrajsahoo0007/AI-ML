import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// isDev is read once at import, so each case loads a fresh copy of the module under the stubbed NODE_ENV.
async function load(env: string) {
  vi.stubEnv("NODE_ENV", env);
  vi.resetModules();
  return import("./props");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("InvalidProps", () => {
  it("fails a production render (and so the build) instead of silently rendering nothing", async () => {
    const { InvalidProps } = await load("production");
    expect(() => renderToStaticMarkup(<InvalidProps message="<NinesCalculator>: nines: bad" />)).toThrow(
      "<NinesCalculator>: nines: bad"
    );
  });

  it("shows and logs the message in dev", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { InvalidProps } = await load("development");
    expect(renderToStaticMarkup(<InvalidProps message="<Compare>: rows: Required" />)).toContain(
      "&lt;Compare&gt;: rows: Required"
    );
    expect(error).toHaveBeenCalledWith("<Compare>: rows: Required");
  });
});
