import fs from "fs";
import path from "path";

const dir =
  "/home/abed/Data/03_Professional/Projects/Ibn_Al_Azhar_Docs/apps/web/src/app/api/documents";
const files = fs
  .readdirSync(dir, { recursive: true })
  .map((f) => path.join(dir, f))
  .filter((f) => f.endsWith(".ts"));

files.forEach((file) => {
  if (fs.statSync(file).isFile()) {
    let content = fs.readFileSync(file, "utf8");
    content = content.replace(
      /, isAdmin } from "@\/lib\/auth-guards";/g,
      ' } from "@/lib/auth-guards";',
    );
    fs.writeFileSync(file, content);
  }
});
