import posthog from "posthog-js/dist/module.slim.no-external";
import { DEFAULT_POSTHOG_HOST } from "../observability/public-env";

// PostHog, cookieless (plan §10.5): state lives in memory only (no cookie, no localStorage, so no consent banner
// is needed for it), nothing is captured automatically (no autocapture, inputs, heatmaps or session recording),
// and the slim no-external build never loads more scripts from PostHog. Only `track()` sends events.
// Its own chunk: imported only from track.ts behind the NEXT_PUBLIC_POSTHOG_KEY check.

export function startPostHog(key: string, host: string | undefined) {
  posthog.init(key, {
    api_host: host || DEFAULT_POSTHOG_HOST,
    persistence: "memory",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_web_experiments: true,
    disable_product_tours: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    person_profiles: "identified_only",
  });
  return posthog;
}
