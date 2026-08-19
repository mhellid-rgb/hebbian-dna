#!/usr/bin/env node
/**
 * Egress audit (fail-closed): scan runtime paths for hardcoded https:// literals.
 *
 * Usage:
 *   hebbian-dna-egress-audit --include web/app,web/lib --allowlist checks/egress-allowlist.json
 *
 * Allowlist JSON: string[] of allowed URL prefixes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  let includeDirs = [];
  let allowlistPath = path.join(__dirname, "egress-allowlist.default.json");
  let cwd = process.cwd();
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--include" && argv[i + 1]) {
      includeDirs = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg === "--allowlist" && argv[i + 1]) {
      allowlistPath = path.resolve(argv[++i]);
    } else if (arg === "--cwd" && argv[i + 1]) {
      cwd = path.resolve(argv[++i]);
    }
  }
  return { includeDirs, allowlistPath, cwd };
}

const { includeDirs, allowlistPath, cwd } = parseArgs(process.argv);

if (includeDirs.length === 0) {
  console.error("[egress-audit] Missing --include (comma-separated directories relative to --cwd)");
  process.exit(2);
}

if (!fs.existsSync(allowlistPath)) {
  console.error(`[egress-audit] Allowlist not found: ${allowlistPath}`);
  process.exit(2);
}

const ALLOWED_HTTPS_PREFIXES = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));

const EXCLUDE_DIR_NAMES = new Set(["node_modules", ".next", "public"]);
const INCLUDE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(e.name)) continue;
      walk(path.join(dir, e.name), out);
      continue;
    }
    const ext = path.extname(e.name);
    if (!INCLUDE_EXT.has(ext)) continue;
    out.push(path.join(dir, e.name));
  }
  return out;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function findHttpsLiterals(text) {
  const source = stripComments(text);
  const hits = [];
  const re = /https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?[^\s"'`)\]]*/gi;
  let m;
  while ((m = re.exec(source))) {
    hits.push(m[0]);
  }
  return hits;
}

function isAllowed(url) {
  return ALLOWED_HTTPS_PREFIXES.some((p) => url.startsWith(p));
}

function rel(p) {
  return path.relative(cwd, p);
}

function isRuntimeScanTarget(filePath, webRoot) {
  const relFromWeb = path.relative(webRoot, filePath).replace(/\\/g, "/");
  if (relFromWeb.includes("/__tests__/")) return false;
  if (/\.test\.[a-z]+$/i.test(relFromWeb) || /\.spec\.[a-z]+$/i.test(relFromWeb)) return false;
  if (/^app\/.*\/api\/.+\.[a-z]+$/i.test(relFromWeb)) return true;
  if (/^lib\/.+\.server\.[a-z]+$/i.test(relFromWeb)) return true;
  return false;
}

const files = includeDirs
  .map((d) => path.join(cwd, d))
  .flatMap((d) => (fs.existsSync(d) ? walk(d) : []))
  .filter((f) => {
    const webRoot = path.join(cwd, includeDirs[0].split("/")[0] ?? ".");
    return isRuntimeScanTarget(f, webRoot);
  });

const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const hits = findHttpsLiterals(text);
  for (const url of hits) {
    if (!isAllowed(url)) {
      findings.push({ file: rel(file), url });
    }
  }
}

if (findings.length) {
  console.error("Egress audit FAILED. Found disallowed hardcoded https endpoints:\n");
  for (const f of findings) {
    console.error(`- ${f.url}\n  in ${f.file}`);
  }
  console.error(
    "\nIf intentional, extend the allowlist JSON and document why."
  );
  process.exit(1);
}

console.log("Egress audit OK (no disallowed hardcoded https endpoints in runtime code).");
