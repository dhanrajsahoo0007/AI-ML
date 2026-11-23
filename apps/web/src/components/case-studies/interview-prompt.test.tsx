import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InterviewPrompt } from "./interview-prompt";
import { SystemLogo } from "./system-logo";

const base = {
  prompt: "Design a ticket booking system for concerts with a seat map.",
  level: "Senior" as const,
  minutes: 45,
  tests: ["Contention on one seat", "Surviving a spike"],
  clarify: [
    { q: "Assigned seats or general admission?", a: "Assigned seats on a seat map." },
    { q: "How long is a seat held?", a: "Ten minutes." },
  ],
  outOfScope: ["Resale"],
};

describe("InterviewPrompt", () => {
  it("renders the prompt, the chips, the clarify list and the out-of-scope list", () => {
    const html = renderToStaticMarkup(<InterviewPrompt {...base} />);
    expect(html).toContain("The interviewer says");
    expect(html).toContain("Design a ticket booking system for concerts with a seat map.");
    expect(html).toContain("45-minute round");
    expect(html).toContain("<dt");
    expect(html).toContain("Assigned seats on a seat map.");
    expect(html).toContain("Resale");
    expect(html).not.toContain("Reported at");
  });

  it("shows the bank question's companies with a bankId", () => {
    const html = renderToStaticMarkup(<InterviewPrompt {...base} bankId="design-ticket-booking" />);
    expect(html).toContain("Reported at");
    expect(html).toContain("Amazon");
  });

  it("reports an unknown bankId and bad props instead of rendering", () => {
    expect(renderToStaticMarkup(<InterviewPrompt {...base} bankId="no-such-question" />)).toContain("no bank question");
    expect(renderToStaticMarkup(<InterviewPrompt {...base} tests={["one"]} />)).toContain("tests");
  });
});

describe("SystemLogo", () => {
  it("falls back to a monogram for an unknown id", () => {
    const html = renderToStaticMarkup(<SystemLogo id="systems/no-such-logo" />);
    expect(html).toContain('data-system-logo="systems/no-such-logo"');
    expect(html).toContain(">NS<");
  });
});
