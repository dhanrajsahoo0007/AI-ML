// Public API of the admin feature: the page gate, the data loaders and the server-rendered building blocks of the
// /admin pages. ui.tsx is JSX, so server-only tests must not import this index (they import the files by path);
// the copy button island is imported by path (`@/features/admin/copy-snippet.client`).
export { adminPage } from "./access";
export { assetSnippet, filterAssets, isUnused, parseAssetQuery, tagCounts } from "./asset-filter";
export { loadAssetManifest } from "./assets";
export { auditSpan, recentAudit } from "./audit";
export { loadKpis, loadWebhooks } from "./dashboard";
export { formatAge, formatBytes, formatDateTime, formatPercent, formatUsdMinor } from "./format";
export { DISPUTE_RATE_ALERT, REFUND_RATE_TARGET, type Breakdown } from "./kpi";
export { loadSectionStates } from "./sections";
export { AdminShell, Panel, Sparkline, Stat, StatGrid, Table, type Column } from "./ui";
