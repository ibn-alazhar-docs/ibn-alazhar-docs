import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "apps/web/src/app");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let transformed = 0;
let importsAdded = 0;
let skipped = 0;

const re =
  /const\s+(\w+)\s*=\s*await\s+request\.json\(\);\s*const\s+(\w+)\s*=\s*([\s\S]+?)\.safeParse\((\w+)\);\s*if\s*\(\s*!\2\.success\s*\)\s*\{[\s\S]*?return\s+NextResponse\.json\(\s*\{\s*error:\s*\{\s*code:\s*"VALIDATION_ERROR"[\s\S]*?\}\s*,\s*\{\s*status:\s*400\s*\},?\s*\);\s*\}/g;

for (const file of files) {
  let src = readFileSync(file, "utf8");
  if (!src.includes("safeParse(body)") && !src.includes("parseValidatedBody")) continue;

  let didTransform = false;
  src = src.replace(re, (_m, _jsonVar, resultVar, schemaExpr) => {
    didTransform = true;
    return `const ${resultVar} = await parseValidatedBody(request, ${schemaExpr.trim()});`;
  });

  if (didTransform) {
    src = src.replace(/\bvalidation\.data\b/g, "validation");
    src = src.replace(/\bparsed\.data\b/g, "parsed");
    transformed++;
  }

  // Ensure the import exists whenever parseValidatedBody is referenced.
  let importAdded = false;
  if (src.includes("parseValidatedBody") && !src.includes('"@/shared/validation"')) {
    src = src.replace(
      /^(import .*;\n)/,
      '$1import { parseValidatedBody } from "@/shared/validation";\n',
    );
    importAdded = true;
    importsAdded++;
  }

  if (didTransform || importAdded) {
    writeFileSync(file, src);
  } else {
    skipped++;
  }
}

console.log({ transformed, importsAdded, skipped });
