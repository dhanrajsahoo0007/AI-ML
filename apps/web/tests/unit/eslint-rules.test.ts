import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";
import { afterAll, describe, it } from "vitest";
import apiRouteWrapper, { apiRouteOf } from "../../eslint-rules/api-route-wrapper.mjs";
import noServerOnlyInClient from "../../eslint-rules/no-server-only-in-client.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: { parser: tsParser, ecmaVersion: "latest", sourceType: "module" },
});

// ── tts/api-route-wrapper ─────────────────────────────────────────────────────────────────────────────────

describe("apiRouteOf", () => {
  it("maps route files to their URL and ignores everything else", ({ expect }) => {
    expect(apiRouteOf("/r/apps/web/src/app/api/progress/route.ts")).toBe("/api/progress");
    expect(apiRouteOf("/r/apps/web/src/app/api/auth/[...all]/route.ts")).toBe("/api/auth/[...all]");
    expect(apiRouteOf("/r/apps/web/src/app/api/(internal)/health/route.ts")).toBe("/api/health");
    expect(apiRouteOf("/r/apps/web/src/app/api/progress/helpers.ts")).toBeNull();
    expect(apiRouteOf("/r/apps/web/src/app/newsletter/rss.xml/route.ts")).toBeNull();
    expect(apiRouteOf("/r/apps/web/tests/app/api/x/route.ts")).toBeNull();
  });
});

const ROUTE_FILE = "/repo/apps/web/src/app/api/things/route.ts";
const IMPORT_ROUTE = `import { route } from "@/features/auth";\n`;

tester.run("tts/api-route-wrapper", apiRouteWrapper, {
  valid: [
    { filename: ROUTE_FILE, code: `${IMPORT_ROUTE}export const POST = route({ handler: () => ({ ok: true }) });` },
    {
      name: "a module-level const built by route(), exported under two methods",
      filename: ROUTE_FILE,
      code: `${IMPORT_ROUTE}const handler = route({ handler: () => null });\nexport const GET = handler;\nexport const POST = handler;`,
    },
    {
      name: "export specifiers",
      filename: ROUTE_FILE,
      code: `${IMPORT_ROUTE}const handler = route({ handler: () => null });\nexport { handler as GET, handler as DELETE };`,
    },
    {
      name: "a build-time ternary between route() and the configured 404 handler",
      filename: ROUTE_FILE,
      code: `${IMPORT_ROUTE}import { notFoundRoute } from "@/server/http";
export const POST = process.env.APP_ENV === "production" ? notFoundRoute : route({ handler: () => null });`,
    },
    {
      name: "TypeScript wrappers around the call",
      filename: ROUTE_FILE,
      code: `${IMPORT_ROUTE}export const GET = route({ handler: () => null }) satisfies unknown;`,
    },
    {
      name: "non-method exports are not checked",
      filename: ROUTE_FILE,
      code: `export const dynamic = "force-dynamic";\nexport async function helper() {}\nexport const runtime = "edge";`,
    },
    {
      name: "files that aren't API routes are not checked",
      filename: "/repo/apps/web/src/app/newsletter/rss.xml/route.ts",
      code: `export async function GET() { return new Response("") }`,
    },
    {
      name: "allow-listed route",
      filename: "/repo/apps/web/src/app/api/health/route.ts",
      options: [{ allow: [{ route: "/api/health", reason: "Edge probe, no body, no session, no DB." }] }],
      code: `import { healthHandler } from "@/server/edge/health";\nexport const GET = healthHandler;`,
    },
    {
      name: "a configured wrapper from another module",
      filename: ROUTE_FILE,
      options: [{ wrappers: [{ name: "adminRoute", from: ["@/features/admin"] }] }],
      code: `import { adminRoute } from "@/features/admin";\nexport const GET = adminRoute({ handler: () => null });`,
    },
    {
      name: "an aliased import of the wrapper",
      filename: ROUTE_FILE,
      code: `import { route as wrap } from "@/features/auth";\nexport const GET = wrap({ handler: () => null });`,
    },
  ],
  invalid: [
    {
      name: "a plain async function",
      filename: ROUTE_FILE,
      code: `export async function POST(request: Request) { return new Response(null); }`,
      errors: [{ messageId: "functionExport", data: { method: "POST", route: "/api/things" } }],
    },
    {
      name: "a plain arrow function",
      filename: ROUTE_FILE,
      code: `export const GET = async () => new Response(null);`,
      errors: [{ messageId: "notWrapped" }],
    },
    {
      name: "a call of a function named route that isn't the wrapper",
      filename: ROUTE_FILE,
      code: `const route = (o: unknown) => async () => new Response(null);\nexport const GET = route({});`,
      errors: [{ messageId: "notWrapped" }],
    },
    {
      name: "route imported from the wrong module",
      filename: ROUTE_FILE,
      code: `import { route } from "./my-route";\nexport const GET = route({ handler: () => null });`,
      errors: [{ messageId: "notWrapped" }],
    },
    {
      name: "an imported handler that isn't allow-listed",
      filename: ROUTE_FILE,
      code: `import { healthHandler } from "@/server/edge/health";\nexport const GET = healthHandler;`,
      errors: [{ messageId: "notWrapped" }],
    },
    {
      name: "a ternary with one unwrapped branch",
      filename: ROUTE_FILE,
      code: `${IMPORT_ROUTE}export const POST = process.env.X ? async () => new Response(null) : route({ handler: () => null });`,
      errors: [{ messageId: "notWrapped" }],
    },
    {
      name: "an export specifier of an unwrapped local",
      filename: ROUTE_FILE,
      code: `async function handler() { return new Response(null); }\nexport { handler as PUT };`,
      errors: [{ messageId: "notWrapped", data: { method: "PUT", route: "/api/things" } }],
    },
    {
      name: "a re-export from another module",
      filename: ROUTE_FILE,
      code: `export { GET } from "./elsewhere";`,
      errors: [{ messageId: "reexport" }],
    },
    {
      name: "export * can hide handlers",
      filename: ROUTE_FILE,
      code: `export * from "./elsewhere";`,
      errors: [{ messageId: "reexport" }],
    },
    {
      name: "an allow-list entry only covers its own route",
      filename: ROUTE_FILE,
      options: [{ allow: [{ route: "/api/health", reason: "Edge probe, no body, no session, no DB." }] }],
      code: `export async function GET() { return new Response(null); }`,
      errors: [{ messageId: "functionExport" }],
    },
    {
      name: "a mutable binding isn't followed",
      filename: ROUTE_FILE,
      code: `${IMPORT_ROUTE}let handler = route({ handler: () => null });\nhandler = async () => new Response(null);\nexport const PATCH = handler;`,
      errors: [{ messageId: "notWrapped" }],
    },
  ],
});

// ── tts/no-server-only-in-client ──────────────────────────────────────────────────────────────────────────

// A throwaway src/ tree: the rule reads the files it imports to see whether they're server-only.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "no-server-only-in-client-"));
const write = (file: string, text: string) => {
  const p = path.join(root, "src", file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};
write("server/db.ts", `import "server-only";\nexport const db = 1;\n`);
write("lib/format.ts", `export const format = (s: string) => s;\n`);
write("features/auth/session.ts", `import "server-only";\nexport const session = 1;\n`);
write("features/auth/index.ts", `export { session } from "./session";\n`);
write("features/progress/local.ts", `export const local = 1;\n`);
write("features/progress/index.ts", `export { local } from "./local";\nexport type { Db } from "../../server/db";\n`);
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const options = [{ srcDir: path.join(root, "src") }];
const clientFile = path.join(root, "src/components/widget.tsx");
const islandFile = path.join(root, "src/features/progress/badge.client.tsx");
const serverFile = path.join(root, "src/components/server-widget.tsx");

tester.run("tts/no-server-only-in-client", noServerOnlyInClient, {
  valid: [
    { filename: clientFile, options, code: `"use client";\nimport { format } from "@/lib/format";` },
    {
      name: "server components may import server-only modules",
      filename: serverFile,
      options,
      code: `import "server-only";\nimport { db } from "@/server/db";`,
    },
    {
      name: "type-only imports are erased",
      filename: clientFile,
      options,
      code: `"use client";\nimport type { Db } from "@/server/db";\nimport { type Session } from "@/features/auth";`,
    },
    {
      name: "a barrel whose only server re-export is type-only",
      filename: islandFile,
      options,
      code: `import { local } from "../progress";`,
    },
    {
      name: "a 'use client' string that isn't in the directive prologue",
      filename: serverFile,
      options,
      code: `import { db } from "@/server/db";\nconst s = "use client";`,
    },
    { name: "npm packages", filename: clientFile, options, code: `"use client";\nimport { useState } from "react";` },
  ],
  invalid: [
    {
      filename: clientFile,
      options,
      code: `"use client";\nimport "server-only";`,
      errors: [{ messageId: "serverOnlyPackage" }],
    },
    {
      name: "a server-only module through the @/ alias",
      filename: clientFile,
      options,
      code: `"use client";\nimport { db } from "@/server/db";`,
      errors: [{ messageId: "serverOnlyModule", data: { source: "@/server/db" } }],
    },
    {
      name: "a *.client.tsx island without the directive, relative import",
      filename: islandFile,
      options,
      code: `import { db } from "../../server/db";`,
      errors: [{ messageId: "serverOnlyModule" }],
    },
    {
      name: "a barrel that re-exports a server-only module",
      filename: clientFile,
      options,
      code: `'use client';\nimport { session } from "@/features/auth";`,
      errors: [{ messageId: "serverOnlyModule", data: { source: "@/features/auth" } }],
    },
    {
      name: "re-exports, dynamic import() and require()",
      filename: clientFile,
      options,
      code: `"use client";\nexport { db } from "@/server/db";\nconst a = import("@/server/db");\nconst b = require("@/server/db");`,
      errors: [{ messageId: "serverOnlyModule" }, { messageId: "serverOnlyModule" }, { messageId: "serverOnlyModule" }],
    },
  ],
});
