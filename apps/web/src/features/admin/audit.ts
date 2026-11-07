// Audit-log queries for /admin/audit, re-exported so app/ goes through the admin feature (plan §3).
export { auditSpan, recentAudit } from "@/server/db/admin-queries";
