#!/usr/bin/env node
/**
 * Fail on Tailwind arbitrary hex colors in configured scan roots.
 *
 * Usage:
 *   hebbian-dna-check-marketing-colors --roots web/components/marketing,web/app/(marketing)
 *   node checks/check-marketing-arbitrary-colors.mjs --roots path1,path2
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  let roots = [];
  let cwd = process.cwd();
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--roots" && argv[i + 1]) {
      roots = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg === "--cwd" && argv[i + 1]) {
      cwd = path.resolve(argv[++i]);
    }
  }
  return { roots, cwd };
}

const { roots: scanRoots, cwd } = parseArgs(process.argv);

if (scanRoots.length === 0) {
  console.error(
    "[check-marketing-arbitrary-colors] Missing --roots (comma-separated directories relative to --cwd)"
  );
  process.exit(2);
}

const arbitraryHexRe =
  /\b(?:bg|text|border|ring|ring-offset|fill|stroke|from|to|via|decoration|outline|shadow|divide|accent|caret|placeholder)-\[#[0-9a-fA-F]{3,8}\]/g;
const bracketHexRe = /\[#[0-9a-fA-F]{3,8}\]/g;
const cssHexRe = /#[0-9a-fA-F]{3,8}\b/g;

const sourceExts = new Set([".tsx", ".ts", ".jsx", ".js"]);
const cssExts = new Set([".css"]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function rel(p) {
  return path.relative(cwd, p);
}

let failed = false;

for (const rootRel of scanRoots) {
  const root = path.join(cwd, rootRel);
  for (const file of walk(root)) {
    const ext = path.extname(file);
    const src = fs.readFileSync(file, "utf8");

    if (sourceExts.has(ext)) {
      for (const re of [arbitraryHexRe, bracketHexRe]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
          const line = src.slice(0, m.index).split("\n").length;
          console.error(
            `[check-marketing-arbitrary-colors] ${rel(file)}:${line}: arbitrary hex in class: ${m[0]}`
          );
          failed = true;
        }
      }
    }

    if (cssExts.has(ext)) {
      const stripped = stripCssComments(src);
      cssHexRe.lastIndex = 0;
      let m;
      while ((m = cssHexRe.exec(stripped)) !== null) {
        const line = stripped.slice(0, m.index).split("\n").length;
        console.error(
          `[check-marketing-arbitrary-colors] ${rel(file)}:${line}: hardcoded hex in CSS: ${m[0]}`
        );
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log("[check-marketing-arbitrary-colors] OK");
process.exit(0);
