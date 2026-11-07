import { describe, expect, it } from "vitest";
import { sendBlocker } from "./send/plan";

describe("send rules", () => {
  it("never sends an issue twice", () => {
    expect(sendBlocker({ slug: "x", status: "sent" }, "test")).toMatch(/already sent/);
    expect(sendBlocker({ slug: "x", status: "sent" }, "broadcast")).toMatch(/already sent/);
  });
  it("the real send needs status: scheduled; the test send doesn't", () => {
    expect(sendBlocker({ slug: "x", status: "draft" }, "broadcast")).toMatch(/scheduled/);
    expect(sendBlocker({ slug: "x", status: "draft" }, "test")).toBeNull();
    expect(sendBlocker({ slug: "x", status: "scheduled" }, "broadcast")).toBeNull();
  });
});
