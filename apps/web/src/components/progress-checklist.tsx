"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Module = { id: string; title: string; slug: string };

export function ProgressChecklist({
  pathSlug,
  modules,
}: {
  pathSlug: string;
  modules: Module[];
}) {
  const [state, setState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next: Record<string, boolean> = {};
      await Promise.all(
        modules.map(async (m) => {
          const res = await fetch(`/api/v1/me/progress/${m.id}`);
          if (!res.ok) return;
          const data = (await res.json()) as { completed?: boolean };
          next[m.id] = Boolean(data.completed);
        })
      );
      if (!cancelled) setState(next);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [modules]);

  async function setCompleted(moduleId: string, completed: boolean) {
    const res = await fetch(`/api/v1/me/progress/${moduleId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { completed?: boolean };
    setState((s) => ({ ...s, [moduleId]: Boolean(data.completed) }));
  }

  if (!modules.length) return null;

  return (
    <Card className="not-prose mb-10">
      <CardHeader>
        <CardTitle>Your progress</CardTitle>
        <CardDescription>
          Track modules for <span className="font-medium">{pathSlug}</span>. We
          store progress per browser with an httpOnly cookie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {modules.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-3 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium">{m.title}</div>
              <div className="text-xs text-muted-foreground">{m.slug}</div>
            </div>
            <Button
              size="sm"
              variant={state[m.id] ? "secondary" : "default"}
              onClick={() =>
                void setCompleted(m.id, state[m.id] ? false : true)
              }
            >
              {state[m.id] ? "Mark not done" : "Mark done"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
