// Client components (`"use client"` or `*.client.ts(x)`) must not import server-only code: the `server-only`
// package itself, or a local module that imports it (everything in src/server/, feature server files). Next.js
// fails the build when this happens; the lint rule reports it at the import, before a build.
//
// Checked: the imported file itself and the files it re-exports (barrels). Not checked: plain imports inside the
// imported file (a.ts imports a server-only b.ts); the build still catches those. Type-only imports are erased at
// compile time and are allowed.

import fs from "node:fs";
import path from "node:path";

const SERVER_ONLY_RE = /^\s*import\s+["']server-only["']/m;
const EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx"];
const CLIENT_FILE_RE = /\.client\.(ts|tsx|js|mjs)$/;

const REEXPORT_RE = /^\s*export\s+(?!type\b)[^;]*?\bfrom\s+["']([^"']+)["']/gm;
const MAX_REEXPORT_DEPTH = 4;

/** path → whether that file is server-only; lives for one lint run */
const cache = new Map();

// A file is server-only when it imports "server-only" or re-exports (`export … from`) a server-only file, so a
// feature's index.ts barrel counts when one of the modules it re-exports is server-only.
function importsServerOnly(file, srcDir, depth = 0) {
  if (cache.has(file)) return cache.get(file);
  cache.set(file, false); // breaks re-export cycles
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    // unreadable: treat as not server-only
  }
  let result = SERVER_ONLY_RE.test(text);
  if (!result && depth < MAX_REEXPORT_DEPTH) {
    for (const [, source] of text.matchAll(REEXPORT_RE)) {
      const target = resolveLocal(source, file, srcDir);
      if (target && importsServerOnly(target, srcDir, depth + 1)) {
        result = true;
        break;
      }
    }
  }
  cache.set(file, result);
  return result;
}

function resolveLocal(source, fromFile, srcDir) {
  let base;
  if (source.startsWith("@/")) base = path.join(srcDir, source.slice(2));
  else if (source.startsWith(".")) base = path.resolve(path.dirname(fromFile), source);
  else return null;
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // try the next extension
    }
  }
  return null;
}

function isUseClient(program) {
  for (const stmt of program.body) {
    if (stmt.type !== "ExpressionStatement" || stmt.expression.type !== "Literal") return false;
    if (stmt.expression.value === "use client") return true;
  }
  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "Client components must not import server-only modules" },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: { srcDir: { type: "string" } },
      },
    ],
    messages: {
      serverOnlyPackage: "A client component must not import 'server-only'.",
      serverOnlyModule:
        "'{{source}}' is server-only (it, or a module it re-exports, imports 'server-only'), so a client component can't import it. Pass the data in as props, or move the shared part into a client-safe module.",
    },
  },
  create(context) {
    const srcDir = path.resolve(context.cwd, context.options[0]?.srcDir ?? "src");
    let client = CLIENT_FILE_RE.test(context.filename);

    function check(node, source, typeOnly) {
      if (!client || typeOnly || typeof source !== "string") return;
      if (source === "server-only") {
        context.report({ node, messageId: "serverOnlyPackage" });
        return;
      }
      const file = resolveLocal(source, context.filename, srcDir);
      if (file && importsServerOnly(file, srcDir))
        context.report({ node, messageId: "serverOnlyModule", data: { source } });
    }

    const allTypeSpecifiers = (node) =>
      node.specifiers.length > 0 && node.specifiers.every((s) => s.importKind === "type" || s.exportKind === "type");

    return {
      Program(node) {
        client ||= isUseClient(node);
      },
      ImportDeclaration(node) {
        check(node.source, node.source.value, node.importKind === "type" || allTypeSpecifiers(node));
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node.source, node.source.value, node.exportKind === "type" || allTypeSpecifiers(node));
      },
      ExportAllDeclaration(node) {
        check(node.source, node.source.value, node.exportKind === "type");
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") check(node.source, node.source.value, false);
      },
      "CallExpression[callee.name='require']"(node) {
        const arg = node.arguments[0];
        if (arg?.type === "Literal") check(arg, arg.value, false);
      },
    };
  },
};

export default rule;
