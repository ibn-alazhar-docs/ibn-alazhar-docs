const fs = require("fs");
const path = require("path");

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.tsx?$/.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const replacements = {
  "text-[var(--text-primary)]": "text-primary-color",
  "text-[var(--text-secondary)]": "text-secondary-color",
  "text-[var(--text-tertiary)]": "text-muted-color",
  "text-[var(--text-muted)]": "text-muted-color",
  "text-[var(--success)]": "text-success",
  "text-[var(--danger)]": "text-danger",
  "text-[var(--info)]": "text-info",
  "text-[var(--warning)]": "text-warning-500",
  "text-[var(--btn-primary-text)]": "text-btn-primary-text",
  "text-[var(--text-inverse)]": "text-inverse",

  "bg-[var(--success-bg)]": "bg-success-bg",
  "bg-[var(--danger-bg)]": "bg-danger-bg",
  "bg-[var(--info-bg)]": "bg-info-bg",
  "bg-[var(--badge-bg)]": "bg-badge",
  "bg-[var(--input-bg)]": "bg-input",
  "bg-[var(--success)]": "bg-success",
  "bg-[var(--danger)]": "bg-danger",
  "bg-[var(--info)]": "bg-info",
  "bg-[var(--warning)]": "bg-warning-500",

  "border-[var(--border-line)]": "border-line",
  "border-[var(--success-border)]": "border-success-border",
  "border-[var(--danger-border)]": "border-danger-border",
  "border-[var(--danger)]": "border-danger",
  "border-[var(--success)]": "border-success",
  "border-[var(--info)]": "border-info",

  "ring-[var(--input-focus)]": "ring-input-focus",
  "ring-[var(--success)]": "ring-success",
  "ring-[var(--danger)]": "ring-danger",

  "hover:text-[var(--success)]": "hover:text-success",
  "hover:text-[var(--danger)]": "hover:text-danger",
  "hover:text-[var(--info)]": "hover:text-info",
  "hover:text-[var(--warning)]": "hover:text-warning-500",
  "hover:bg-[var(--danger-bg)]": "hover:bg-danger-bg",
  "hover:bg-[var(--danger)]": "hover:bg-danger",

  "group-hover:text-[var(--success)]": "group-hover:text-success",
  "group-hover:text-[var(--danger)]": "group-hover:text-danger",
  "group-hover:text-[var(--info)]": "group-hover:text-info",
};

const srcDir = path.join(__dirname, "apps/web/src");
const files = getAllFiles(srcDir);
let patchedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let newContent = content;

  for (const [key, value] of Object.entries(replacements)) {
    // Escape brackets for regex
    const escapedKey = key.replace(/[\[\]\(\)\-]/g, "\\$&");
    const regex = new RegExp(escapedKey, "g");
    newContent = newContent.replace(regex, value);
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, "utf8");
    console.log(`Patched ${file.replace(__dirname, "")}`);
    patchedFiles++;
  }
}
console.log(`Patched ${patchedFiles} files.`);
