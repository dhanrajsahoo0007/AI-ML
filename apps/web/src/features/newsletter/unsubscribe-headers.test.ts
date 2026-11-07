import { describe, expect, it } from "vitest";
import { isOneClick, listUnsubscribeHeaders, ONE_CLICK_BODY, oneClickUnsubscribeUrl } from "./unsubscribe-headers";

describe("RFC 8058 one-click unsubscribe", () => {
  const url = oneClickUnsubscribeUrl("https://site.example/api/x/unsubscribe", "a.b");

  it("builds List-Unsubscribe and List-Unsubscribe-Post exactly as RFC 8058 §3.1 shows", () => {
    expect(listUnsubscribeHeaders(url)).toEqual({
      "List-Unsubscribe": "<https://site.example/api/x/unsubscribe?token=a.b>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("refuses a non-https URL", () => {
    expect(() => listUnsubscribeHeaders("http://site.example/u")).toThrow(/https/);
    expect(() => listUnsubscribeHeaders("mailto:u@site.example")).toThrow(/https/);
  });

  it("recognises the one-click POST body, urlencoded or multipart", () => {
    expect(isOneClick(new URLSearchParams(ONE_CLICK_BODY))).toBe(true);
    const form = new FormData();
    form.set("List-Unsubscribe", "One-Click");
    expect(isOneClick(form)).toBe(true);
    expect(isOneClick(new URLSearchParams("List-Unsubscribe=Other"))).toBe(false);
    expect(isOneClick(new URLSearchParams(""))).toBe(false);
  });
});
