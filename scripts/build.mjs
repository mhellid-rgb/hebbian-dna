import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

execSync("npx tsc -p tsconfig.json", { cwd: root, stdio: "inherit" });

for (const css of ["dna.css", "brands.css"]) {
  fs.copyFileSync(
    path.join(root, "src/css", css),
    path.join(root, "dist", css)
  );
}

console.log("[@hebbian/dna] build OK");
