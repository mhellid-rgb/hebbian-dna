import { expect as pwExpect, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { genomeBrandingCssSnippet } from "../genome.js";

export type TokenContractBrand = {
  key: string;
  host: string;
  brandRoot: string;
};

export type TokenContractSurface = {
  name: string;
  route: string;
  elementSelector: string | null;
};

export type TokenContractSnapshot = {
  brandKey: string;
  surfaceName: string;
  path: string;
};

export type TokenContractOptions = {
  cssPaths: string[];
  hosts: TokenContractBrand[];
  surfaces: TokenContractSurface[];
  snapshot?: TokenContractSnapshot;
  l2TokenNames?: readonly string[];
  assertSurface?: (ctx: {
    surface: TokenContractSurface;
    computedByBrand: Record<string, ComputedTokens>;
    dnaTokenNames: string[];
    expect: typeof pwExpect;
  }) => void | Promise<void>;
  port?: string;
  baseUrl?: string;
};

export type ComputedTokens = {
  brandHost: string;
  brandRoot: string | null;
  tokensBrand: Record<string, string>;
  tokensDNA: Record<string, string>;
  l2: Record<string, string>;
};

function uniqueSorted(list: string[]) {
  return Array.from(new Set(list)).sort();
}

function normalizeValue(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export function extractTokenNamesFromCssFiles(cssPaths: string[]) {
  const cssText = cssPaths.map((p) => fs.readFileSync(p, "utf8")).join("\n");
  const brandVars = Array.from(cssText.matchAll(/--brand-[A-Za-z0-9_-]+/g)).map((m) => m[0]);
  const dnaNeutralVars = Array.from(
    cssText.matchAll(
      /--(sp|r|h|text|leading|tracking|dur|ease|bg|fg|border|muted|surface)-[A-Za-z0-9_-]+/g
    )
  ).map((m) => m[0]);
  return {
    brandVars: uniqueSorted(brandVars),
    dnaNeutralVars: uniqueSorted(dnaNeutralVars),
  };
}

async function readComputedTokens(
  page: Page,
  elementSelector: string | null,
  brandHost: string,
  brandTokenNames: string[],
  dnaTokenNames: string[],
  l2TokenNames: readonly string[]
): Promise<ComputedTokens> {
  return page.evaluate(
    ({ elementSelector, brandHost, brandTokenNames, dnaTokenNames, l2TokenNames }) => {
      const el =
        elementSelector === null
          ? document.documentElement
          : (document.querySelector(elementSelector) as Element | null);
      if (elementSelector !== null && !el) {
        throw new Error(`Missing elementSelector for computed tokens: ${elementSelector}`);
      }
      const computed = window.getComputedStyle(el!);
      const tokensBrand: Record<string, string> = {};
      const tokensDNA: Record<string, string> = {};
      const l2: Record<string, string> = {};
      for (const name of brandTokenNames) {
        tokensBrand[name] = computed.getPropertyValue(name);
      }
      for (const name of dnaTokenNames) {
        tokensDNA[name] = computed.getPropertyValue(name);
      }
      for (const name of l2TokenNames) {
        l2[name] = computed.getPropertyValue(name);
      }
      const brandRoot = document.documentElement.getAttribute("data-brand-root");
      return { brandHost, brandRoot, tokensBrand, tokensDNA, l2 };
    },
    { elementSelector, brandHost, brandTokenNames, dnaTokenNames, l2TokenNames }
  );
}

/** Run DNA + L1 brand token contract assertions (call from consumer Playwright spec). */
export async function runTokenContractTest(
  page: Page,
  options: TokenContractOptions,
  testInfo?: TestInfo,
  expectFn: typeof pwExpect = pwExpect
) {
  const l2TokenNames = options.l2TokenNames ?? [];
  const { brandVars, dnaNeutralVars } = extractTokenNamesFromCssFiles(options.cssPaths);
  const brandTokenNames = brandVars;
  const dnaTokenNames = dnaNeutralVars;

  const port = options.port ?? process.env.PLAYWRIGHT_PORT ?? "3005";
  const baseUrl = options.baseUrl ?? process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
  const base = new URL(baseUrl);
  const urlForHost = (host: string) => `http://${host}:${base.port}/`;

  for (const surface of options.surfaces) {
    const computedByBrand: Record<string, ComputedTokens> = {};

    for (const brand of options.hosts) {
      const url = urlForHost(brand.host) + surface.route.replace(/^\//, "");
      await page.goto(url);
      await expectFn(page.locator(`html[data-brand-root="${brand.brandRoot}"]`)).toHaveCount(1);

      const computed = await readComputedTokens(
        page,
        surface.elementSelector,
        brand.host,
        brandTokenNames,
        dnaTokenNames,
        l2TokenNames
      );

      computed.tokensBrand = Object.fromEntries(
        Object.entries(computed.tokensBrand).map(([k, v]) => [k, normalizeValue(v)])
      );
      computed.tokensDNA = Object.fromEntries(
        Object.entries(computed.tokensDNA).map(([k, v]) => [k, normalizeValue(v)])
      );
      computed.l2 = Object.fromEntries(
        Object.entries(computed.l2).map(([k, v]) => [k, normalizeValue(v)])
      );

      computedByBrand[brand.key] = computed;

      if (
        options.snapshot &&
        brand.key === options.snapshot.brandKey &&
        surface.name === options.snapshot.surfaceName
      ) {
        const snapshotPath = options.snapshot.path;
        const updateSnapshots = process.env.UPDATE_SNAPSHOTS === "1";
        const tokenNames = uniqueSorted([...brandTokenNames, ...dnaTokenNames]);
        const actual = {
          host: brand.host,
          brandRoot: computed.brandRoot,
          tokens: Object.fromEntries(
            tokenNames.map((n) => [n, computed.tokensBrand[n] ?? computed.tokensDNA[n]])
          ),
        };

        if (updateSnapshots || !fs.existsSync(snapshotPath)) {
          fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
          fs.writeFileSync(snapshotPath, JSON.stringify(actual, null, 2), "utf8");
          testInfo?.attach("snapshot-updated", {
            body: JSON.stringify(actual, null, 2),
            contentType: "application/json",
          });
          return;
        }

        const expected = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as typeof actual;
        expectFn(computed.brandRoot).toBe(expected.brandRoot);
        expectFn(Object.keys(actual.tokens).sort()).toEqual(Object.keys(expected.tokens).sort());
        for (const key of Object.keys(expected.tokens).sort()) {
          expectFn(actual.tokens[key]).toBe(expected.tokens[key]);
        }
      }
    }

    const brandKeys = options.hosts.map((h) => h.key);
    if (brandKeys.length >= 2) {
      const first = computedByBrand[brandKeys[0]!]!;
      const second = computedByBrand[brandKeys[1]!]!;
      for (const name of dnaTokenNames) {
        expectFn(first.tokensDNA[name]).toBe(second.tokensDNA[name]);
      }
      expectFn(first.tokensBrand).not.toEqual(second.tokensBrand);
    }

    if (options.assertSurface) {
      await options.assertSurface({
        surface,
        computedByBrand,
        dnaTokenNames,
        expect: expectFn,
      });
    }
  }

  const probeHost = options.hosts[0]?.host ?? "127.0.0.1";
  await page.goto(urlForHost(probeHost) + "login");

  const securityBefore = await page.evaluate(() => {
    const computed = window.getComputedStyle(document.body);
    const get = (name: string) => computed.getPropertyValue(name).trim().replace(/\s+/g, " ");
    return { fontDisplay: get("--font-display"), sp4: get("--sp-4") };
  });

  await page.addStyleTag({
    content:
      'html[data-brand-root] [data-genome="branding"]{--font-display:Comic Sans;--sp-4:99px}',
  });

  const securityAfter = await page.evaluate(() => {
    const computed = window.getComputedStyle(document.body);
    const get = (name: string) => computed.getPropertyValue(name).trim().replace(/\s+/g, " ");
    return { fontDisplay: get("--font-display"), sp4: get("--sp-4") };
  });

  expectFn(securityAfter.fontDisplay).not.toBe(securityBefore.fontDisplay);
  expectFn(securityAfter.sp4).not.toBe(securityBefore.sp4);

  expectFn(() =>
    genomeBrandingCssSnippet({
      "--font-display": `red; } html { display:none }`,
      "--sp-4": "#000000",
    } as unknown as Parameters<typeof genomeBrandingCssSnippet>[0])
  ).toThrow();
}
