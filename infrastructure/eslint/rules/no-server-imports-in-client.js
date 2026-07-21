"use strict";

/**
 * no-server-imports-in-client
 * ---------------------------------------------------------------------------
 * Forbids importing server-only modules (Node.js builtins and packages that
 * require a Node runtime) from Client Components ("use client").
 *
 * This is the first-line guard against the recurring HuggingFace build failure
 * where a Node builtin (http/https/crypto/path/fs/os) or a server package
 * (bullmq / google-auth-library / pg / ioredis / minio) leaks into the
 * browser bundle and webpack aborts with "Can't resolve 'node:...'".
 *
 * It only catches DIRECT imports inside a client file. Transitive leaks (a
 * client component importing a server module that itself pulls a builtin) are
 * caught by the local HuggingFace build check (`pnpm build:hf-check`), which
 * runs the real `next build --webpack` and fails exactly the way HF would.
 */

const SERVER_ONLY_PACKAGES = [
  "bullmq",
  "google-auth-library",
  "googleapis",
  "@google-cloud/storage",
  "ioredis",
  "redis",
  "pg",
  "pg-promise",
  "minio",
  "@ibn-al-azhar-docs/pipeline",
  "@ibn-al-azhar-docs/shared/health-server",
  "@ibn-al-azhar-docs/database/encryption",
];

function isClientComponent(node) {
  return (
    node.type === "ExpressionStatement" &&
    node.expression.type === "Literal" &&
    node.expression.value === "use client"
  );
}

function isForbidden(spec) {
  if (spec === "node" || spec.startsWith("node:")) return true;
  return SERVER_ONLY_PACKAGES.some((pkg) => spec === pkg || spec.startsWith(`${pkg}/`));
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing server-only modules (Node builtins / Node-runtime packages) from Client Components",
    },
    schema: [],
    messages: {
      forbidden:
        "This Client Component imports '{{spec}}', which is server-only (a Node builtin or a Node-runtime package). It will break the browser build. Move the logic to a Server Component, a Route Handler, or pass the data in as props.",
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    const client = sourceCode.ast.body.some(isClientComponent);
    if (!client) return {};

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") return;
        const spec = node.source.value;
        if (typeof spec === "string" && isForbidden(spec)) {
          context.report({ node, messageId: "forbidden", data: { spec } });
        }
      },
    };
  },
};
