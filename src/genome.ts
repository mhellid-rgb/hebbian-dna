export type BrandTokenKey =
  | "--brand-primary"
  | "--brand-primary-fg"
  | "--brand-accent"
  | "--brand-accent-fg"
  | "--brand-ring";

export const GENOME_DATA_GENOME_ID_BRANDING = "branding";

const ALLOWED_BRAND_TOKEN_KEYS = new Set<BrandTokenKey>([
  "--brand-primary",
  "--brand-primary-fg",
  "--brand-accent",
  "--brand-accent-fg",
  "--brand-ring",
]);

function assertAllowedBrandTokenKey(key: string): asserts key is BrandTokenKey {
  if (!ALLOWED_BRAND_TOKEN_KEYS.has(key as BrandTokenKey)) {
    throw new Error(`Unknown genome brand token key: ${key}`);
  }
}

export function isValidHexColor(raw: string): boolean {
  const s = raw.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s);
}

function normalizeValidatedHex(raw: string, key: string): string {
  const s = raw.trim();
  if (!isValidHexColor(s)) {
    throw new Error(`Invalid hex color for ${key}: ${raw}`);
  }
  return s.toLowerCase();
}

/** Safe CSS snippet for genome-driven brand overrides (hex-only values). */
export function genomeBrandingCssSnippet(
  tokens: Partial<Record<BrandTokenKey, string>>
): string {
  const entries = Object.entries(tokens) as Array<[string, string]>;
  const decls: string[] = [];

  for (const [key, rawValue] of entries) {
    if (!rawValue) continue;
    assertAllowedBrandTokenKey(key);
    const value = normalizeValidatedHex(rawValue, key);
    decls.push(`${key}:${value};`);
  }

  if (decls.length === 0) return "";

  return `html[data-brand-root] [data-genome="${GENOME_DATA_GENOME_ID_BRANDING}"]{${decls.join(
    ""
  )}}`;
}
