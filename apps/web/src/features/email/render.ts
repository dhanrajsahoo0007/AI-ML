import { render, toPlainText } from "@react-email/components";
import type { ReactElement } from "react";

// Renders a React Email template to the HTML and plain-text parts of a message. Every message carries both: the
// text part is what plain-text clients, screen readers and spam filters read.

export interface RenderedEmail {
  html: string;
  text: string;
}

export async function renderEmail(template: ReactElement): Promise<RenderedEmail> {
  const html = await render(template);
  return { html, text: toPlainText(html) };
}
