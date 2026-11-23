import { describe, expect, it } from "vitest";
import { parseHubMarkup } from "./hub-markup";

const hub = `
<ModelCategory title="Data" icon="database" subtitle="Keep data correct.">
  <ModelGrid>
    <ModelCard tier="advanced" title="Outbox" href="/x/patterns/outbox" icon="database" status="outline" description="No lost events." />
    <ModelCard title="Caching" icon="zap" description="Cache-aside." href="/x/patterns/caching" />
  </ModelGrid>
</ModelCategory>`;

describe("parseHubMarkup", () => {
  const [cat] = parseHubMarkup(hub);

  it("reads tier on a card and puts it after status, matching the nav index key order", () => {
    expect(cat.cards[0]).toEqual({
      title: "Outbox",
      href: "/x/patterns/outbox",
      icon: "database",
      description: "No lost events.",
      status: "outline",
      tier: "advanced",
    });
    expect(Object.keys(cat.cards[0])).toEqual(["title", "href", "icon", "description", "status", "tier"]);
  });

  it("leaves tier out of a card that has none", () => {
    expect(cat.cards[1]).not.toHaveProperty("tier");
    expect(Object.keys(cat.cards[1])).toEqual(["title", "href", "icon", "description"]);
  });

  it("reads logo on a card and puts it after tier", () => {
    const [c] = parseHubMarkup(
      `<ModelCategory title="Chat"><ModelGrid><ModelCard logo="systems/messenger" title="Design Messenger" href="/x/messenger" icon="bot" tier="advanced" status="outline" /></ModelGrid></ModelCategory>`
    );
    expect(Object.keys(c.cards[0])).toEqual(["title", "href", "icon", "status", "tier", "logo"]);
    expect(c.cards[0].logo).toBe("systems/messenger");
  });
});
