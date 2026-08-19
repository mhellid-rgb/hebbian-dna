import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveBrandRootFromHost,
  resolveBrandRootFromHeader,
  BRAND_BY_HOST,
} from "../dist/brand.js";
import { genomeBrandingCssSnippet, isValidHexColor } from "../dist/genome.js";

test("resolveBrandRootFromHost maps known hosts", () => {
  assert.equal(resolveBrandRootFromHost("hebbian.systems"), "hs");
  assert.equal(resolveBrandRootFromHost("hebbian.org"), "hebbian");
  assert.equal(resolveBrandRootFromHost("unknown.example"), "hebbian");
});

test("resolveBrandRootFromHeader validates and falls back", () => {
  assert.equal(resolveBrandRootFromHeader("hs"), "hs");
  assert.equal(resolveBrandRootFromHeader("invalid"), "hebbian");
  assert.equal(resolveBrandRootFromHeader(null), "hebbian");
});

test("genomeBrandingCssSnippet rejects invalid keys and hex", () => {
  assert.throws(() => genomeBrandingCssSnippet({ "--font-display": "#000" }));
  assert.throws(() => genomeBrandingCssSnippet({ "--brand-primary": "red" }));
  const css = genomeBrandingCssSnippet({ "--brand-primary": "#F3C623" });
  assert.match(css, /--brand-primary:#f3c623/);
});

test("isValidHexColor", () => {
  assert.ok(isValidHexColor("#abc"));
  assert.ok(isValidHexColor("#f3c623"));
  assert.ok(!isValidHexColor("f3c623"));
});

test("BRAND_BY_HOST has hs and hebbian entries", () => {
  assert.ok(BRAND_BY_HOST["hebbian.systems"]);
  assert.ok(BRAND_BY_HOST["hebbian.org"]);
});
