// Sends one newsletter issue through Resend. Run by .github/workflows/newsletter-send.yml (plan §15.2):
//
//   npx tsx src/features/newsletter/send/send-issue.ts <slug> --mode test       # to the founder only
//   npx tsx src/features/newsletter/send/send-issue.ts <slug> --mode broadcast  # Resend Broadcast to the segment
//   npx tsx src/features/newsletter/send/send-issue.ts <slug> --dry-run         # render to .build/mail/issue-<slug>.eml
//
// The issue's MDX is rendered to HTML and text here (build time), the issue is validated by the newsletter kind
// first, and a broadcast needs status: scheduled. Env: RESEND_API_KEY, RESEND_SEGMENT_ID (everyone),
// RESEND_PRO_SEGMENT_ID (audience: pro). Marking the issue `sent` is a follow-up PR (the workflow can't push).

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { business, SITE_URL } from "../../../config/business";
import { sectionOfKind } from "../../sections/registry";
import { DEFAULT_DEV_MAIL_DIR, toEml } from "../../email";
import { renderIssueEmail } from "../email-issue";
import { NEWSLETTER_FROM, NEWSLETTER_REPLY_TO } from "../emails";
import { NEWSLETTER_KIND, newsletterKind } from "../kind";
import { loadIssues } from "../source";
import { broadcastName, RESEND_UNSUBSCRIBE_PLACEHOLDER, sendBlocker, testSubject, type SendMode } from "./plan";

const RESEND = "https://api.resend.com";

function fail(message: string): never {
  console.error(`::error::${message}`);
  process.exit(1);
}

async function resend(apiKey: string, route: string, body: unknown): Promise<{ id: string }> {
  const res = await fetch(`${RESEND}${route}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) fail(`Resend ${route} responded ${res.status}: ${text.slice(0, 300)}`);
  return z.object({ id: z.string() }).parse(JSON.parse(text));
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { mode: { type: "string" }, "dry-run": { type: "boolean", default: false } },
  });
  const slug = positionals[0] ?? "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`invalid issue slug "${slug}"`);
  const dryRun = values["dry-run"] ?? false;
  const mode = z.enum(["test", "broadcast"]).optional().parse(values.mode) as SendMode | undefined;
  if (!dryRun && !mode) fail("pass --mode test, --mode broadcast or --dry-run");

  const section = sectionOfKind(NEWSLETTER_KIND);
  const issues = loadIssues(section);
  const issue = issues.find((i) => i.slug === slug) ?? fail(`no issue ${slug} in content/${section.key}/`);
  const problems = (await newsletterKind.validate(section, [issue])).filter((p) => p.level === "error");
  if (problems.length > 0)
    fail(`issue ${slug} is invalid:\n${problems.map((p) => `${p.file}:${p.line}: ${p.message}`).join("\n")}`);

  if (mode === "broadcast" && section.state !== "on") {
    fail(
      `the ${section.key} section is ${section.state} in ${process.env.APP_ENV ?? "this environment"}: its web pages would 404`
    );
  }
  if (mode === "broadcast" && new URL(SITE_URL).hostname.endsWith(".example")) {
    fail(`the site URL is still the placeholder ${SITE_URL}: set the NEXT_PUBLIC_SITE_URL variable first`);
  }
  const blocker = mode ? sendBlocker(issue, mode) : null;
  if (blocker) fail(blocker);

  const unsubscribeUrl =
    mode === "broadcast" ? RESEND_UNSUBSCRIBE_PLACEHOLDER : `${SITE_URL}${section.href}/unsubscribe`;
  const { html, text } = await renderIssueEmail(issue, { unsubscribeUrl });

  if (dryRun) {
    // Same .eml format as the dev outbox (Prettier and git ignore it there).
    const out = path.resolve(process.env.DEV_MAIL_DIR ?? DEFAULT_DEV_MAIL_DIR);
    fs.mkdirSync(out, { recursive: true });
    const file = path.join(out, `issue-${slug}.eml`);
    const message = {
      to: business.FOUNDER_EMAIL,
      from: NEWSLETTER_FROM,
      subject: issue.title,
      html,
      text,
      template: "issue",
    };
    fs.writeFileSync(file, toEml(message, { date: new Date(), messageId: `issue-${slug}@dev.local` }));
    console.log(`rendered ${slug} → ${path.relative(process.cwd(), file)}`);
    return;
  }

  const env = z
    .object({
      RESEND_API_KEY: z.string().min(1),
      RESEND_SEGMENT_ID: z.string().min(1).optional(),
      RESEND_PRO_SEGMENT_ID: z.string().min(1).optional(),
    })
    .safeParse(process.env);
  if (!env.success) fail("RESEND_API_KEY is not set");
  const { RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_PRO_SEGMENT_ID } = env.data;

  if (mode === "test") {
    const sent = await resend(RESEND_API_KEY, "/emails", {
      from: NEWSLETTER_FROM,
      to: [business.FOUNDER_EMAIL],
      reply_to: NEWSLETTER_REPLY_TO,
      subject: testSubject(issue),
      html,
      text,
    });
    console.log(`test email for ${slug} sent to the founder (Resend id ${sent.id})`);
    return;
  }

  const segment = issue.audience === "pro" ? RESEND_PRO_SEGMENT_ID : RESEND_SEGMENT_ID;
  if (!segment) fail(issue.audience === "pro" ? "RESEND_PRO_SEGMENT_ID is not set" : "RESEND_SEGMENT_ID is not set");
  // Resend Broadcasts: create, then send. The segment field name is re-verified in the Resend spike (plan §19).
  const broadcast = await resend(RESEND_API_KEY, "/broadcasts", {
    segment_id: segment,
    from: NEWSLETTER_FROM,
    reply_to: NEWSLETTER_REPLY_TO,
    subject: issue.title,
    html,
    text,
    name: broadcastName(issue),
  });
  await resend(RESEND_API_KEY, `/broadcasts/${broadcast.id}/send`, {});
  console.log(`broadcast ${broadcast.id} for ${slug} sent to the ${issue.audience} segment`);
  console.log(`::notice::Now set status: sent for ${slug} in a PR.`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
