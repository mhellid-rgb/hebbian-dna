/** L1 brand root identifiers (portfolio-wide). */
export type BrandRoot = "hebbian" | "hs";

export const BRAND_ROOT_HEADER = "x-brand-root";

/** Default host → brand-root map. Extend in consuming apps if needed. */
export const BRAND_BY_HOST: Readonly<Record<string, BrandRoot>> = {
  "hebbian.systems": "hs",
  "hs.localhost": "hs",
  "hebbian.org": "hebbian",
  "hebbian.localhost": "hebbian",
};

export function resolveBrandRootFromHost(rawHost: string): BrandRoot {
  const hostNoPort = rawHost.trim().toLowerCase().split(":")[0] ?? "";
  if (!hostNoPort) return "hebbian";
  return BRAND_BY_HOST[hostNoPort] ?? "hebbian";
}

/** Read x-brand-root from incoming request headers; fallback "hebbian". */
export function resolveBrandRootFromHeader(rawHeader: string | null | undefined): BrandRoot {
  const v = rawHeader?.trim().toLowerCase();
  if (v === "hs") return "hs";
  if (v === "hebbian") return "hebbian";
  return "hebbian";
}

export function isBrandRoot(value: string): value is BrandRoot {
  return value === "hebbian" || value === "hs";
}
