// Plan §11.6: every API route handler goes through the `route()` wrapper (zod body, auth/role, Origin check,
// rate-limit hook, `no-store`, uniform errors). This rule checks every HTTP-method export of an
// `src/app/api/**/route.ts` file and accepts only:
//   - a call of a wrapper imported from the configured module (`export const POST = route({...})`)
//   - a module-level const that holds such a call (`const handler = route(...); export const GET = handler`)
//   - a configured pre-built handler (`notFoundRoute`), or a ternary whose branches are all of the above
// Routes that legitimately can't use the wrapper go in the `allow` option, each with a reason.

import path from "node:path";

const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

/** `src/app/api/(group)/foo/[id]/route.ts` → `/api/foo/[id]`; null when the file isn't an API route. */
export function apiRouteOf(filename) {
  const parts = path.normalize(filename).split(path.sep);
  const appAt = parts.lastIndexOf("app");
  if (appAt < 1 || parts[appAt - 1] !== "src" || parts[appAt + 1] !== "api") return null;
  if (!/^route\.(ts|tsx|js|mjs)$/.test(parts[parts.length - 1])) return null;
  const segments = parts.slice(appAt + 1, -1).filter((s) => !/^\(.*\)$/.test(s));
  return `/${segments.join("/")}`;
}

function unwrap(node) {
  let n = node;
  while (
    n &&
    (n.type === "TSAsExpression" ||
      n.type === "TSSatisfiesExpression" ||
      n.type === "TSNonNullExpression" ||
      n.type === "TSTypeAssertion" ||
      n.type === "ParenthesizedExpression")
  ) {
    n = n.expression;
  }
  return n;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "API route handlers must be built with the route() wrapper (plan §11.6)" },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          wrappers: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "from"],
              properties: { name: { type: "string" }, from: { type: "array", items: { type: "string" } } },
            },
          },
          handlers: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "from"],
              properties: { name: { type: "string" }, from: { type: "array", items: { type: "string" } } },
            },
          },
          allow: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["route", "reason"],
              properties: { route: { type: "string" }, reason: { type: "string", minLength: 10 } },
            },
          },
        },
      },
    ],
    messages: {
      functionExport:
        "{{method}} in {{route}} is a plain function. Export `const {{method}} = route({...})` from @/features/auth (plan §11.6).",
      notWrapped:
        "{{method}} in {{route}} isn't built by route(). Use `route({...})` from @/features/auth, or add the route to the commented allow-list in eslint.config.mjs (plan §11.6).",
      reexport:
        "{{method}} in {{route}} is re-exported from another module, so the wrapper can't be checked. Define it here with route().",
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const wrappers = options.wrappers ?? [{ name: "route", from: ["@/features/auth"] }];
    const handlers = options.handlers ?? [{ name: "notFoundRoute", from: ["@/server/http"] }];
    const route = apiRouteOf(context.filename);
    if (!route) return {};
    if ((options.allow ?? []).some((a) => a.route === route)) return {};

    /** local name → import source, for named imports */
    const imports = new Map();
    /** module-level `const x = <init>` */
    const consts = new Map();

    const importedAs = (local, allowed) => {
      const info = imports.get(local);
      return !!info && allowed.some((a) => a.name === info.imported && a.from.includes(info.source));
    };

    function isWrapped(node, seen = new Set()) {
      const n = unwrap(node);
      if (!n) return false;
      if (n.type === "CallExpression" && n.callee.type === "Identifier") return importedAs(n.callee.name, wrappers);
      if (n.type === "ConditionalExpression") return isWrapped(n.consequent, seen) && isWrapped(n.alternate, seen);
      if (n.type === "Identifier") {
        if (importedAs(n.name, handlers)) return true;
        if (seen.has(n.name) || !consts.has(n.name)) return false;
        seen.add(n.name);
        return isWrapped(consts.get(n.name), seen);
      }
      return false;
    }
    const checks = [];

    return {
      ImportDeclaration(node) {
        for (const s of node.specifiers) {
          if (s.type !== "ImportSpecifier") continue;
          const imported = s.imported.type === "Identifier" ? s.imported.name : s.imported.value;
          imports.set(s.local.name, { imported, source: node.source.value });
        }
      },
      "Program > VariableDeclaration[kind='const'] > VariableDeclarator"(node) {
        if (node.id.type === "Identifier" && node.init) consts.set(node.id.name, node.init);
      },
      "Program > ExportNamedDeclaration > VariableDeclaration[kind='const'] > VariableDeclarator"(node) {
        if (node.id.type === "Identifier" && node.init) consts.set(node.id.name, node.init);
      },
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (decl?.type === "FunctionDeclaration" && decl.id && HTTP_METHODS.has(decl.id.name)) {
          context.report({ node: decl.id, messageId: "functionExport", data: { method: decl.id.name, route } });
        }
        if (decl?.type === "VariableDeclaration") {
          for (const d of decl.declarations) {
            if (d.id.type === "Identifier" && HTTP_METHODS.has(d.id.name)) {
              checks.push({ node: d.id, method: d.id.name, value: d.init });
            }
          }
        }
        for (const s of node.specifiers ?? []) {
          const exported = s.exported.type === "Identifier" ? s.exported.name : s.exported.value;
          if (!HTTP_METHODS.has(exported)) continue;
          if (node.source) {
            context.report({ node: s, messageId: "reexport", data: { method: exported, route } });
          } else {
            checks.push({ node: s, method: exported, value: s.local });
          }
        }
      },
      ExportAllDeclaration(node) {
        context.report({ node, messageId: "reexport", data: { method: "export *", route } });
      },
      "Program:exit"() {
        for (const c of checks) {
          if (!isWrapped(c.value)) {
            context.report({ node: c.node, messageId: "notWrapped", data: { method: c.method, route } });
          }
        }
      },
    };
  },
};

export default rule;
