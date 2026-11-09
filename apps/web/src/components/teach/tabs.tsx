import * as React from "react";
import { TabsIsland } from "./lazy.client";

// Server wrapper for <Tabs> in MDX. It takes the id prefix for tabs and panels from the server render and hands
// it to the lazy island: inside next/dynamic a client-side useId does not match between SSR and hydration.
// Usage in MDX: <Tabs title="Two ways to shard"><Tab label="By user id">…</Tab>…</Tabs>
export function Tabs({ title, children }: { title?: string; children: React.ReactNode }) {
  const idBase = React.useId();
  return (
    <TabsIsland title={title} idBase={idBase}>
      {children}
    </TabsIsland>
  );
}
