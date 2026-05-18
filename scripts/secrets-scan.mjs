import { execSync } from "node:child_process";

const diff = execSync("git diff --cached", { encoding: "utf8" });

const patterns = [
  {
    name: "Generic sk-* token",
    regex: /sk-[0-9a-fA-F]{20,}/g,
  },
  {
    name: "Anthropic sk-ant token",
    regex: /sk-ant-[A-Za-z0-9_-]+/g,
  },
  {
    name: "ANTHROPIC_API_KEY with value",
    regex: /ANTHROPIC_API_KEY\s*=\s*["']?[^"'\s]+["']?/g,
  },
  {
    name: "ANTHROPIC_AUTH_TOKEN with value",
    regex: /ANTHROPIC_AUTH_TOKEN\s*=\s*["']?[^"'\s]+["']?/g,
  },
  {
    name: "TESTSPRITE_API_KEY with value",
    regex: /TESTSPRITE_API_KEY\s*=\s*["']?[^"'\s]+["']?/g,
  },
  {
    name: "GitHub token",
    regex: /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  },
];

let found = false;

for (const pattern of patterns) {
  const matches = diff.match(pattern.regex);
  if (!matches) continue;

  for (const match of matches) {
    // Allow intentionally empty placeholders.
    if (match.endsWith('=""') || match.endsWith("=''") || match.endsWith("=")) {
      continue;
    }

    found = true;
    console.error(`[SECRET?] ${pattern.name}: ${match}`);
  }
}

if (found) {
  console.error("Potential staged secrets found. Review git diff --cached before committing.");
  process.exit(1);
}

console.log("No obvious staged secrets");
