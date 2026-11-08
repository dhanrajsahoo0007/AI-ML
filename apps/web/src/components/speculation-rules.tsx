// Speculation Rules (plan §6 P8): Chromium browsers prefetch a likely next page when the reader hovers
// or presses a link ("moderate" eagerness), so the next article in the same section is often ready
// before the click. Other browsers ignore the script, and Next <Link> prefetching still applies.
//
// Document rules match links already in the page: same-section links (sidebar, hub cards, in-article
// links) and any rel="prev"/rel="next" link. Relative href patterns only match this origin, so external
// links are never prefetched. API, account and pricing URLs are always excluded.
//
// CSP: this is an inline, non-executable JSON script. It is allowed by `script-src 'unsafe-inline'`; a
// nonce- or hash-based policy without 'unsafe-inline' would need the 'inline-speculation-rules' keyword.

const EXCLUDED = ["/api", "/account", "/pricing"];

/** The rules for one section, e.g. "/system-design". */
function speculationRules(sectionHref: string) {
  const exclude = EXCLUDED.flatMap((p) => [{ not: { href_matches: p } }, { not: { href_matches: `${p}/*` } }]);
  return {
    prefetch: [
      {
        source: "document",
        where: {
          and: [
            {
              or: [{ href_matches: `${sectionHref}/*` }, { selector_matches: 'a[rel~="prev"], a[rel~="next"]' }],
            },
            ...exclude,
            { not: { selector_matches: '[rel~="nofollow"], [data-no-prefetch]' } },
          ],
        },
        eagerness: "moderate",
      },
    ],
  };
}

export function SpeculationRules({ sectionHref }: { sectionHref: string }) {
  // `<` is escaped so the JSON can never close the script element.
  const json = JSON.stringify(speculationRules(sectionHref)).replace(/</g, "\\u003c");
  return <script type="speculationrules" dangerouslySetInnerHTML={{ __html: json }} />;
}
