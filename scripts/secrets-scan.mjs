import { execFileSync } from "node:child_process";

const patterns = [
  /sk-[0-9a-fA-F]{20,}/,
  /sk-ant-[A-Za-z0-9_-]+/,
  /ANTHROPIC_API_KEY\s*=\s*[^ \t\r\n"']+/,
  /ANTHROPIC_AUTH_TOKEN\s*=\s*[^ \t\r\n"']+/,
  /TESTSPRITE_API_KEY\s*=\s*[^ \t\r\n"']+/,
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
    diff = execFileSync("git", ["diff", "--cached", "--", file], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
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
      if (pattern.test(line)) {
        found = true;
        console.error(`Potential secret found in ${file} near added diff line ${index + 1}`);
      }
    }
  }
}

if (found) {
  process.exit(1);
}

console.log("No obvious staged secrets");
