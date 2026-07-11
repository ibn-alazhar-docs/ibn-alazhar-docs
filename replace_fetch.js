const fs = require("fs");
const path = require("path");

const filesToPatch = [
  "apps/web/src/app/[locale]/(dashboard)/bookmarks/bookmarks-content.tsx",
  "apps/web/src/app/[locale]/(dashboard)/settings/settings-content.tsx",
  "apps/web/src/app/[locale]/(dashboard)/tags/page.tsx",
  "apps/web/src/app/[locale]/(dashboard)/users/page.tsx",
  "apps/web/src/state/use-file-upload.ts",
  "apps/web/src/state/use-files-manager.ts",
  "apps/web/src/ui/folders/use-folders.ts",
  "apps/web/src/ui/folders/move-dialog.tsx",
  "apps/web/src/ui/tags/tag-filter-sidebar.tsx",
  "apps/web/src/ui/tags/tag-picker.tsx",
  "apps/web/src/ui/auth/forgot-password-form.tsx",
  "apps/web/src/ui/auth/register-form.tsx",
  "apps/web/src/ui/auth/reset-password-form.tsx",
];

for (const relPath of filesToPatch) {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, "utf8");

  if (content.includes("apiFetch")) continue; // already patched

  // Only replace fetch if it's hitting /api
  let modified = content.replace(/fetch\("?\/api\//g, 'apiFetch("/api/');

  if (modified !== content) {
    // Add import
    const importStatement = `import { apiFetch } from "@/shared/api";\n`;

    // Insert after the last import, or at top
    const lastImportIndex = modified.lastIndexOf("import ");
    if (lastImportIndex !== -1) {
      const endOfLine = modified.indexOf("\n", lastImportIndex);
      modified = modified.slice(0, endOfLine + 1) + importStatement + modified.slice(endOfLine + 1);
    } else {
      modified = importStatement + modified;
    }

    fs.writeFileSync(filePath, modified, "utf8");
    console.log(`Patched ${relPath}`);
  }
}
