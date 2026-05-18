import { execFileSync } from "node:child_process";

const patterns = [
  { name: "Generic sk-* token", regex: /sk-[0-9a-fA-F]{20,}/ },
  { name: "Anthropic sk-ant token", regex: /sk-ant-[A-Za-z0-9_-]+/ },
  { name: "ANTHROPIC_API_KEY", regex: /ANTHROPIC_API_KEY\s*=\s*[^ \t\r\n"']+/ },
  { name: "ANTHROPIC_AUTH_TOKEN", regex: /ANTHROPIC_AUTH_TOKEN\s*=\s*[^ \t\r\n"']+/ },
  { name: "TESTSPRITE_API_KEY", regex: /TESTSPRITE_API_KEY\s*=\s*[^ \t\r\n"']+/ },
  { name: "GitHub token", regex: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
];

const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (stagedFiles.length === 0) {
  console.log("No staged files to scan");
  process.exit(0);
}

let found = false;

for (const file of stagedFiles) {
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

  const addedLines = diff
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"));

  for (const [index, line] of addedLines.entries()) {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        found = true;
        console.error(
          `Potential secret found in ${file} near added diff line ${index + 1}: ${pattern.name}`,
        );
      }
    }
  }
}

if (found) {
  process.exit(1);
}

console.log("No obvious staged secrets");
