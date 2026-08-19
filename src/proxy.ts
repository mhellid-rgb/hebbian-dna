import {
  BRAND_ROOT_HEADER,
  resolveBrandRootFromHost,
  type BrandRoot,
} from "./brand.js";

export type BrandProxyRequest = {
  headers: Headers;
  nextUrl?: { host?: string };
};

export type BrandProxyResult = {
  brandRoot: BrandRoot;
  requestHeaders: Headers;
};

/**
 * Resolve brand root from Host and attach x-brand-root for downstream layouts.
 * Composable: call from a host app's Next.js proxy before other header logic.
 */
export function applyBrandRootToRequest(request: BrandProxyRequest): BrandProxyResult {
  const hostFromUrl = request.nextUrl?.host?.trim();
  const hostHeader = request.headers.get("host")?.trim();
  const host = hostHeader || hostFromUrl || "";

  const brandRoot = resolveBrandRootFromHost(host);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(BRAND_ROOT_HEADER, brandRoot);

  return { brandRoot, requestHeaders };
}

export { BRAND_ROOT_HEADER, resolveBrandRootFromHost };
