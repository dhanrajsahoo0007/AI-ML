import { describe, expect, it } from "vitest";
import { business } from "../../config/business";
import { confirmationEmail, welcomeEmail } from "../newsletter/emails";
import { emailCarriesBody, renderIssueEmail } from "../newsletter/email-issue";
import { RESEND_UNSUBSCRIBE_PLACEHOLDER } from "../newsletter/send/plan";
import type { Issue } from "../newsletter/source";
import { postalAddress } from "./templates/layout";

const links = {
  confirmUrl: "https://site.example/n/confirm?token=c.c",
  unsubscribeUrl: "https://site.example/n/unsubscribe?token=u.u",
  oneClickUrl: "https://site.example/api/n/unsubscribe?token=u.u",
  archiveUrl: "https://site.example/n",
};

function expectFooter(html: string, text: string, unsubscribeUrl: string) {
  const escaped = (s: string) => s.replace(/&/g, "&amp;");
  expect(html).toContain(`href="${escaped(unsubscribeUrl)}"`);
  expect(html).toContain("/legal/privacy");
  expect(text).toContain(business.FOUNDER_EMAIL);
  expect(text).toContain(postalAddress());
  expect(postalAddress()).toContain(business.SELLER_ADDRESS);
}

const issue = (over: Partial<Issue> = {}): Issue => ({
  slug: "digest",
  year: "2026",
  href: "/n/digest",
  file: "/dev/null",
  data: {},
  body: "Intro with a [link](/system-design/databases/b-trees).\n\n## Theme\n\nPremium-only paragraph.\n",
  title: "Digest",
  date: "2026-11-07",
  summary: "The summary.",
  access: "free",
  status: "scheduled",
  audience: "all",
  number: 1,
  format: "digest",
  tags: [],
  readingTime: 1,
  takeaways: [],
  related: [],
  hook: "The summary.",
  ...over,
});

describe("email templates", () => {
  it("confirmation: link, 48-hour note, footer, no images", async () => {
    const m = await confirmationEmail("a@example.com", links);
    expect(m.html).toContain(`href="${links.confirmUrl}"`);
    expect(m.text).toContain("48 hours");
    expectFooter(m.html, m.text, links.unsubscribeUrl);
    expect(m.html).not.toMatch(/<img\b/);
  });

  it("welcome: archive link, footer and RFC 8058 headers, no images", async () => {
    const m = await welcomeEmail("a@example.com", links);
    expect(m.html).toContain(`href="${links.archiveUrl}"`);
    expectFooter(m.html, m.text, links.unsubscribeUrl);
    expect(m.headers).toEqual({
      "List-Unsubscribe": `<${links.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(m.html).not.toMatch(/<img\b/);
  });

  it("issue: MDX to HTML and text with absolute links and the broadcast unsubscribe placeholder", async () => {
    const { html, text } = await renderIssueEmail(issue(), { unsubscribeUrl: RESEND_UNSUBSCRIBE_PLACEHOLDER });
    expect(html).toMatch(/href="https?:\/\/[^"]+\/system-design\/databases\/b-trees"/);
    expect(html).toContain("<h2");
    expect(text).toContain("Premium-only paragraph.");
    expectFooter(html, text, RESEND_UNSUBSCRIBE_PLACEHOLDER);
  });

  it("a premium issue sent to everyone carries the summary only", async () => {
    const premium = issue({ access: "premium", audience: "all" });
    expect(emailCarriesBody(premium)).toBe(false);
    const { text } = await renderIssueEmail(premium, { unsubscribeUrl: "https://site.example/u" });
    expect(text).toContain("The summary.");
    expect(text).not.toContain("Premium-only paragraph.");
    expect(emailCarriesBody({ access: "premium", audience: "pro" })).toBe(true);
  });

  it("issue callouts become labelled boxes; plain quotes stay quotes", async () => {
    const body = "> [!TIP]\n> Name the weakest part.\n\n> Just a quote.\n";
    const { html, text } = await renderIssueEmail(issue({ body }), { unsubscribeUrl: "https://site.example/u" });
    expect(html).toContain("TRY IT");
    expect(html).toContain("Name the weakest part.");
    expect(html).not.toContain("[!TIP]");
    expect(text).toContain("Just a quote.");
  });

  it("issue tables and code blocks can't widen the email", async () => {
    const body = "| A | B |\n| --- | --- |\n| one | two |\n\n```text\n" + "x".repeat(200) + "\n```\n";
    const { html } = await renderIssueEmail(issue({ body }), { unsubscribeUrl: "https://site.example/u" });
    expect(html).toMatch(/<table[^>]*style="[^"]*table-layout:fixed[^"]*width:100%/);
    expect(html).toMatch(/<pre[^>]*style="[^"]*white-space:pre-wrap/);
  });

  it("issue images must be PNG", async () => {
    await expect(
      renderIssueEmail(issue({ body: "![d](/a/diagram.svg)\n" }), { unsubscribeUrl: "https://site.example/u" })
    ).rejects.toThrow(/PNG/);
    const { html } = await renderIssueEmail(issue({ body: "![d](/a/diagram.png)\n" }), {
      unsubscribeUrl: "https://site.example/u",
    });
    expect(html).toMatch(/<img[^>]+src="https?:\/\/[^"]+\/a\/diagram\.png"/);
  });
});
