import "server-only";

import type { CatalogPath } from "./catalog";

/** Response shape for `GET /api/v1/catalog` (typed client fetches). */
export type CatalogApiResponse = { paths: CatalogPath[] };
