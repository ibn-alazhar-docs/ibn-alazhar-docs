import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

// Tier 1 rules run on every tracked file: vendor key formats, connection
// strings with literal credentials, and paths that must never be committed.
const PREFIXED_SECRETS = [
  { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}/ },
  { name: "GitHub fine-grained token", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { name: "HuggingFace token", regex: /\bhf_[A-Za-z0-9]{30,}/ },
  { name: "GitLab personal token", regex: /\bglpat-[A-Za-z0-9_-]{20}/ },
  { name: "OpenAI-style key", regex: /\bsk-(?:ant-)?[A-Za-z0-9_-]{20}/ },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{35}/ },
  { name: "AWS access key id", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "npm token", regex: /\bnpm_[A-Za-z0-9]{30,}/ },
  { name: "Stripe key", regex: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{20,}/ },
  { name: "JWT", regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  {
    name: "Private key block",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[A-Za-z0-9+/\s]{40}/,
  },
];

const URL_CREDENTIALS = /\b[a-z][a-z0-9+.-]*:\/\/([^/\s:@"']*):([^/\s@"']{2,})@([^\s/"']+)/i;

// Prose form (`sudo password = 2262022`) has no SCREAMING key, so it needs its
// own rule. A standalone credential word followed by a literal value.
const PROSE_CREDENTIAL =
  /(?:(?<=^)|(?<=[^A-Za-z0-9_$-]))(password|passwd|pwd|secret|api[ _-]?key)\s*[:=]\s*(\S+)/i;

const FORBIDDEN_PATHS = [
  { name: "Real .env file", regex: /(^|\/)\.env(\..*)?$/, allow: /example$/i },
  { name: "Agent session summary", regex: /(^|\/)[^/]*session-summary\.md$/i },
  { name: "Private key file", regex: /\.(?:pem|p12|pfx|key)$|(^|\/)id_(?:rsa|ed25519|ecdsa)$/i },
];

// Tier 2 rules run only on production paths. Assignments to a credential-ish
// name with a value that is not an obvious template.
const KEYED_ASSIGNMENT =
  /(?:(?<=^)|(?<=[^A-Za-z0-9_$]))([A-Za-z0-9_.-]*(?:PASSWORD|PASSWD|PWD|SECRET|TOKEN|APIKEY|API_KEY|ACCESS_KEY|PRIVATE_KEY|CREDENTIAL|SESSION_KEY|AUTH_KEY)[A-Za-z0-9_.-]*)\s*([=:])\s*(\S+)/i;

const LOCAL_HOSTS = /^(?:localhost|127\.0\.0\.1|::1|0\.0\.0\.0|host\.docker\.internal|.*\.local)$/i;

// Words that only ever appear in templates, docs and CI fixtures.
const PLACEHOLDER_MARK =
  /REPLACE[_-]?ME|CHANGE[_-]?ME|CHANGEME|YOUR[_-]|_FOR_|FOR_DEVELOPMENT|DUMMY|MOCK|FAKE|EXAMPLE|PLACEHOLDER|REDACTED|INSERT[_-]|GENERATE|xxx/i;

const TEMPLATE_CONTEXT =
  /\$\{[^}]*\}|\$[A-Z_]{3,}|process\.env|import\.meta\.env|os\.environ|getenv|dotenv|secrets\.[A-Za-z_]+|env\.[A-Za-z_]+/i;

const PLACEHOLDER_VALUE =
  /^(?:[\s<>\[\]{}()*'"`]|x{3,}|change[_-]?me|replace[_-]?(?:with|me)|your[_-]|example|placeholder|redacted|removed|deleted|todo|fixme|dummy|sample|insert[_-]|generate[_-]|none|null|nil|undefined|false|true|skip)/i;

// `redis_password`, `AUTH_SECRET` echoed back, `my_token` — a value that is
// only the credential word with a lowercase prefix is a template, not a secret.
const GENERIC_DESCRIPTOR = /^[a-z][a-z]*_(?:password|passwd|pwd|secret|token|key|api_?key)$/i;

// Fetch/enum/CSS keywords and TypeScript type names that share credential keys.
const KNOWN_SAFE_LITERAL =
  /^(?:username|user|admin|password|passwd|pwd|secret|token|apikey|api_key|key|postgres|include|omit|same-origin|inherit|auto|never|always|required|optional|ignore|allow|cors|no-cors|string|number|boolean|buffer|unknown|any|never)$/i;

// A string that actually looks like a secret: mixed letters and digits, a long
// numeric run, or long enough that a human would not write it as prose.
function looksSecret(value) {
  if (KNOWN_SAFE_LITERAL.test(value) || GENERIC_DESCRIPTOR.test(value)) return false;
  if (/^\d{6,}$/.test(value)) return true;
  if (/\d/.test(value) && /[A-Za-z]/.test(value)) return true;
  return value.length >= 12 && !/^[a-z][a-z0-9_.-]*(?:\.[a-z][a-z0-9_-]*)+$/.test(value);
}

// In source files a credential has to be a quoted literal; `secretKey: string`
// and `const leaseToken = token` are type annotations and variable reads.
// READMEs and runbooks quote env samples constantly; the prose rule above is
// the one that matters for them.
const ASSIGNMENT_EXCLUDED = /\.md$/i;

const QUOTED_LITERAL_REQUIRED = /\.(?:ts|tsx|js|jsx|mjs|cjs|py|java|kt|go|rs)$/i;

// Prose is where an operator writes a password down: notes, configs, scripts.
const PROSE_FILE =
  /\.(?:md|txt|rst|adoc|sh|bash|ya?ml|json|toml|ini|cfg|conf|properties|example|env)$/i;
const QUOTED_VALUE = /^\s*["'`]/;

// Test, fixture and documentation trees assign fake credentials constantly;
// scanning them produces noise that gets the check switched off.
const NON_PRODUCTION_PATH =
  /(^|\/)(tests?|__tests__|spec|specs|e2e|cypress|fixtures?|mocks?|stubs?|examples?|samples?|demos?|evals?|playwright|load|bench|docs?|website|\.github)(\/|$)|\.(?:test|spec)\.[a-z]+(?:x)?$/i;

const ALLOW_COMMENT = /allowlist:\s*secret|pragma:\s*allowlist\s*secret|gitleaks:allow/i;

const SKIP_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp4",
  ".webm",
  ".pdf",
  ".zip",
  ".gz",
  ".br",
  ".so",
  ".node",
  ".wasm",
  ".avif",
]);

const SKIP_PATHS = /(^|\/)(node_modules|dist|build|\.next|\.venv|venv|coverage|__snapshots__)\//;
const LOCKFILES = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?)/;

const MAX_BYTES = 2 * 1024 * 1024;

const stagedMode = process.argv.includes("--staged");

let files;
if (stagedMode) {
  files = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
} else {
  files = execFileSync("git", ["ls-files", "--exclude-standard"], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

if (files.length === 0) {
  console.log(stagedMode ? "No staged files to scan" : "No tracked files to scan");
  process.exit(0);
}

const shouldSkip = (file) =>
  SKIP_EXTENSIONS.has(extname(file).toLowerCase()) || SKIP_PATHS.test(file) || LOCKFILES.test(file);

function isTemplateValue(value) {
  const bare = value.replace(/^["'`]+|["'`;,\s*#)]+$/g, "");
  // A value that opens a shell/compose expansion can never be a literal.
  if (
    /^\$\{?\(/.test(bare) ||
    /^\$\{/.test(bare) ||
    /^\$[A-Za-z_]/.test(bare) ||
    /^[-+?!:=#%]/.test(bare)
  )
    return true;
  if (bare.length < 4) return true;
  if (TEMPLATE_CONTEXT.test(bare) || PLACEHOLDER_MARK.test(bare)) return true;
  if (PLACEHOLDER_VALUE.test(bare)) return true;
  return !looksSecret(bare);
}

const findings = [];

function scanLine(file, lineNo, text) {
  if (ALLOW_COMMENT.test(text)) return;

  const url = text.match(URL_CREDENTIALS);
  if (url && !LOCAL_HOSTS.test(url[3]) && !isTemplateValue(url[2])) {
    findings.push({ file, lineNo, rule: "Credentials embedded in connection URL" });
  }

  for (const { name, regex } of PREFIXED_SECRETS) {
    if (!regex.test(text)) continue;
    if (PLACEHOLDER_MARK.test(text) || TEMPLATE_CONTEXT.test(text)) continue;
    findings.push({ file, lineNo, rule: name });
  }

  if (PROSE_FILE.test(file) && !NON_PRODUCTION_PATH.test(file)) {
    const prose = text.match(PROSE_CREDENTIAL);
    if (prose && !isTemplateValue(prose[2])) {
      findings.push({ file, lineNo, rule: `Plaintext credential written next to "${prose[1]}"` });
    }
  }

  if (NON_PRODUCTION_PATH.test(file)) return;

  if (ASSIGNMENT_EXCLUDED.test(file)) return;

  const keyed = text.match(KEYED_ASSIGNMENT);
  if (!keyed || isTemplateValue(keyed[3])) return;
  if (QUOTED_LITERAL_REQUIRED.test(file) && !QUOTED_VALUE.test(keyed[3])) return;
  findings.push({ file, lineNo, rule: `Hardcoded credential assigned to ${keyed[1]}` });
}

for (const file of files) {
  if (shouldSkip(file) || /(^|\/)secrets-scan\.mjs$/.test(file)) continue;

  const forbidden = FORBIDDEN_PATHS.find(
    (rule) => rule.regex.test(file) && !(rule.allow && rule.allow.test(file)),
  );
  if (forbidden) {
    findings.push({ file, lineNo: 0, rule: `Must never be tracked: ${forbidden.name}` });
    continue;
  }

  let lines;
  if (stagedMode) {
    let diff = "";
    try {
      diff = execFileSync("git", ["diff", "--cached", "--unified=0", "--", file], {
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      });
    } catch (error) {
      console.error(`Failed to scan staged diff for ${file}`);
      if (error?.message) console.error(error.message);
      process.exit(1);
    }
    lines = diff
      .split(/\r?\n/)
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1));
  } else {
    let content = "";
    try {
      if (statSync(file).size > MAX_BYTES) continue;
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    lines = content.split(/\r?\n/);
  }

  lines.forEach((text, index) => scanLine(file, index + 1, text));
}

if (findings.length > 0) {
  for (const f of findings) {
    const where = f.lineNo ? ` at line ${f.lineNo}` : "";
    console.error(`Potential secret found in ${f.file}${where}: ${f.rule}`);
  }
  console.error(
    `\n${findings.length} potential secret(s). Move the value into an environment variable, or end the line with "allowlist: secret" if it is a known-safe placeholder.`,
  );
  process.exit(1);
}

console.log(stagedMode ? "No obvious staged secrets" : "No obvious secrets found in repository");
