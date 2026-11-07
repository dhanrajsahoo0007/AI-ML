"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TURNSTILE_ACTION, TURNSTILE_SCRIPT } from "./turnstile-config";

// Cloudflare Turnstile on the sign-up form, only when NEXT_PUBLIC_TURNSTILE_SITE_KEY was set at build. The script
// is loaded on the first interaction with the form (focus or pointer), never on page load, so the page stays
// light and visitors who don't sign up never contact Cloudflare's challenge host.
//
// CSP (plan §11.4) needs: script-src and frame-src https://challenges.cloudflare.com.

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** The widget's state for one form. `activate` loads and renders it; `token` is "" until the check passes. */
export function useTurnstile(siteKey: string | undefined) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  const activate = useCallback(() => {
    if (!siteKey || widgetId.current || !container.current) return;
    widgetId.current = "loading";
    loadScript()
      .then((api) => {
        if (!container.current) return;
        widgetId.current = api.render(container.current, {
          sitekey: siteKey,
          action: TURNSTILE_ACTION,
          size: "flexible",
          callback: (t: string) => {
            setFailed(false);
            setToken(t);
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setFailed(true);
          },
        });
      })
      .catch(() => {
        widgetId.current = null;
        setFailed(true);
      });
  }, [siteKey]);

  /** Tokens are single use: reset after every submit. */
  const reset = useCallback(() => {
    setToken("");
    const id = widgetId.current;
    if (id && id !== "loading") window.turnstile?.reset(id);
  }, []);

  useEffect(
    () => () => {
      const id = widgetId.current;
      if (id && id !== "loading") window.turnstile?.remove(id);
    },
    []
  );

  return { enabled: !!siteKey, container, token, failed, activate, reset };
}
