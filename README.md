# @hebbian/dna

Portfolio-wide **DNA layer** (L0) and **L1 brand roots** for Hebbian web apps.

New projects get branding without re-implementing tokens, host→brand resolution, genome CSS guards, or contract checks.

## Install

```bash
# .npmrc (repo root or user)
@hebbian:registry=https://npm.pkg.github.com

npm install @hebbian/dna
```

## CSS

```css
@import "@hebbian/dna/dna.css";
@import "@hebbian/dna/brands.css";
```

- **`dna.css`** — surface scale (`--surface-void`, `--surface-raised`), neutral theme (light/dark), spacing, radii, type scale, motion.
- **`brands.css`** — L1 `--brand-*` blocks for `data-brand-root="hebbian"` and `"hs"`.

**L2 product namespace** (`--soma`, `--axon`, …) is **not** in this package — it lives in product repos (e.g. `hebbian-systems`).

## TypeScript

```ts
import {
  resolveBrandRootFromHost,
  applyBrandRootToRequest,
  genomeBrandingCssSnippet,
} from "@hebbian/dna";
```

## Checks (CLI)

```bash
hebbian-dna-check-marketing-colors --roots web/components/marketing,web/app/(marketing)
hebbian-dna-egress-audit --include web/app,web/lib --allowlist scripts/egress-allowlist.json
```

## Playwright token contract

```ts
import { defineTokenContractTest } from "@hebbian/dna/e2e/token-contract";

defineTokenContractTest({
  cssPaths: [
    require.resolve("@hebbian/dna/dna.css"),
    require.resolve("@hebbian/dna/brands.css"),
  ],
  hosts: [/* … */],
  surfaces: [/* … */],
});
```

## Versioning (semver)

| Change | Bump |
|---|---|
| DNA token value change | **minor** |
| Removed or renamed token | **major** |

## Verification discipline

Before trusting green CI on DNA extractions or template repos, read [docs/verification-discipline.md](./docs/verification-discipline.md).

Registry migration from git dependency → GitHub Packages: [docs/registry-setup.md](./docs/registry-setup.md).
