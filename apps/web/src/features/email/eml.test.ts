import { describe, expect, it } from "vitest";
import { toEml } from "./eml";
import { maskEmail, outboxFileName } from "./dev-sender";

const message = {
  to: "ada@example.com",
  from: "Brand <news@news.example>",
  subject: "Héllo",
  html: "<p>Hi</p>",
  text: "Hi\nthere",
  headers: {
    "List-Unsubscribe": "<https://x.example/u?token=t>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
  template: "welcome",
};

describe("dev outbox .eml", () => {
  const eml = toEml(message, { date: new Date("2026-11-07T10:00:00Z"), messageId: "id-1@dev.local", boundary: "B" });

  it("writes the headers, extra headers included, and encodes a non-ASCII subject", () => {
    expect(eml).toContain("From: Brand <news@news.example>\r\n");
    expect(eml).toContain("To: ada@example.com\r\n");
    expect(eml).toContain(`Subject: =?UTF-8?B?${Buffer.from("Héllo").toString("base64")}?=\r\n`);
    expect(eml).toContain("List-Unsubscribe: <https://x.example/u?token=t>\r\n");
    expect(eml).toContain("List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n");
    expect(eml).toContain("Message-ID: <id-1@dev.local>\r\n");
  });

  it("has a text part and a base64 HTML part", () => {
    expect(eml).toContain('Content-Type: multipart/alternative; boundary="B"');
    expect(eml).toContain(
      "Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\nHi\r\nthere"
    );
    expect(eml).toContain(Buffer.from("<p>Hi</p>").toString("base64"));
    expect(eml.trimEnd().endsWith("--B--")).toBe(true);
  });

  it("refuses header injection", () => {
    expect(() =>
      toEml(
        { ...message, headers: { "X-Evil": "a\r\nBcc: someone@example.com" } },
        { date: new Date(), messageId: "x" }
      )
    ).toThrow(/line break/);
  });

  it("extra headers can't override the sender's own", () => {
    const out = toEml({ ...message, headers: { From: "Evil <e@example.com>" } }, { date: new Date(), messageId: "x" });
    expect(out).not.toContain("Evil");
  });

  it("names outbox files by time, template and recipient; logs mask addresses", () => {
    expect(outboxFileName(message, new Date("2026-11-07T10:00:00.000Z"), "abcdef1234")).toBe(
      "20261107T100000000Z-welcome-ada_example_com-abcdef12.eml"
    );
    expect(maskEmail("ada@example.com")).toBe("a***@example.com");
  });
});
