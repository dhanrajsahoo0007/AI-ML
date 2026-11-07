import { serializeJsonLd, type JsonLdDocument } from "./json-ld";

/**
 * Renders a JSON-LD document. The only dangerouslySetInnerHTML in this feature: the content is built from
 * build-time data by the json-ld builders and escaped by serializeJsonLd, so it cannot break out of the
 * script element. `type="application/ld+json"` is data, not script, so CSP does not apply to it.
 */
export function JsonLd({ data }: { data: JsonLdDocument }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
