import type { EmailMessage } from "./sender";

// Serialises an EmailMessage as an RFC 5322 message (multipart/alternative: text, then HTML), so the dev outbox
// can be opened in any mail client and the E2E test can read the links out of it.

/** RFC 2047 encoded-word for a header value that is not plain ASCII. */
function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function base64Lines(text: string): string {
  return (
    Buffer.from(text, "utf8")
      .toString("base64")
      .match(/.{1,76}/g) ?? []
  ).join("\r\n");
}

/** Header names that the sender controls; extra headers may not override them. */
const RESERVED = new Set(["from", "to", "subject", "date", "message-id", "mime-version", "content-type", "reply-to"]);

export function toEml(message: EmailMessage, opts: { date: Date; messageId: string; boundary?: string }): string {
  const boundary = opts.boundary ?? `=_${opts.messageId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const headers: [string, string][] = [
    ["From", message.from],
    ["To", message.to],
    ...(message.replyTo ? ([["Reply-To", message.replyTo]] as [string, string][]) : []),
    ["Subject", encodeHeader(message.subject)],
    ["Date", opts.date.toUTCString().replace("GMT", "+0000")],
    ["Message-ID", `<${opts.messageId}>`],
    ["MIME-Version", "1.0"],
    ...Object.entries(message.headers ?? {}).filter(([name]) => !RESERVED.has(name.toLowerCase())),
    ["Content-Type", `multipart/alternative; boundary="${boundary}"`],
  ];
  for (const [name, value] of headers) {
    if (/[\r\n]/.test(name) || /[\r\n]/.test(value)) throw new Error(`header ${name} contains a line break`);
  }
  return [
    ...headers.map(([name, value]) => `${name}: ${value}`),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.text.replace(/\r?\n/g, "\r\n"),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(message.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}
