import { toEml } from "./eml";
import type { EmailMessage, EmailSender, SentEmail } from "./sender";

// Development and test sender: never delivers anything. It logs one line per message and writes the full message
// as an .eml file to the dev outbox (DEV_MAIL_DIR, default apps/web/.build/mail, which is gitignored), where the
// E2E tests and you can open it. Where there is no file system (a Worker), it only logs.

export const DEFAULT_DEV_MAIL_DIR = ".build/mail";

/** a***@example.com: enough to tell messages apart in a log without writing the address down. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain ?? ""}`;
}

/** File name for a message: sortable by time, findable by recipient. */
export function outboxFileName(message: Pick<EmailMessage, "to" | "template">, date: Date, id: string): string {
  const stamp = date.toISOString().replace(/[-:.]/g, "");
  const to = message.to.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `${stamp}-${message.template}-${to}-${id.slice(0, 8)}.eml`;
}

export class DevEmailSender implements EmailSender {
  constructor(private readonly dir: string = process.env.DEV_MAIL_DIR ?? DEFAULT_DEV_MAIL_DIR) {}

  async send(message: EmailMessage): Promise<SentEmail> {
    const id = crypto.randomUUID();
    const date = new Date();
    let where = "not written (no file system)";
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const dir = path.resolve(this.dir);
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, outboxFileName(message, date, id));
      await fs.writeFile(file, toEml(message, { date, messageId: `${id}@dev.local` }), "utf8");
      where = file;
    } catch {
      // No writable file system: logging is enough for a dev sender.
    }
    console.info(`[email:dev] ${message.template} to ${maskEmail(message.to)}: "${message.subject}" → ${where}`);
    return { id };
  }
}
