# GitHub Packages — `@hebbian` org setup

Today consumers pin:

```json
"@hebbian/dna": "github:mhellid-rgb/hebbian-dna#v0.1.3"
```

That works but ties every project to a **personal account URL**. HEBBIAN AB should own the chain.

## Target state

```json
"@hebbian/dna": "^0.1.3"
```

```ini
# .npmrc (repo root)
@hebbian:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Steps (human — org creation cannot be automated with current token)

### 1. Create GitHub org

1. Open [Create organization](https://github.com/organizations/plan) (Free plan is enough).
2. Name: **`hebbian`** (org namespace; distinct from the unrelated user account `@hebbian`).
3. Owner: HEBBIAN AB billing contact / Magnus.

**Verify:** `gh api orgs/hebbian -q .login` → `hebbian`

### 2. Transfer `hebbian-dna`

1. Settings → Transfer repository → `mhellid-rgb/hebbian-dna` → `hebbian/hebbian-dna`.
2. Confirm `@hebbian/dna` package name still matches org scope.

**Verify:** `gh repo view hebbian/hebbian-dna`

### 3. Publish to GitHub Packages

In `hebbian-dna` after transfer:

```bash
npm run build
npm publish
```

Requires `GITHUB_TOKEN` with `write:packages` and `read:packages`.

**Verify (read what failed before):**

```bash
npm view @hebbian/dna version --registry=https://npm.pkg.github.com
```

Expect version string, not 403/404.

### 4. Update consumers

Replace git URL in:

- `hebbian-systems` (root + `web/`)
- `hebbian-app-template`
- `hebbian-app-template-verify`
- `hebbian.org` (when DNA pass lands)

Run **`npm ci`** in each — not `npm install` alone.

**Verify per repo:**

```bash
npm ls @hebbian/dna
npm run build   # or release:check
```

### 5. CI token

GitHub Actions needs `packages: read` on `GITHUB_TOKEN` (default for same-org repos) or a PAT in org secrets for cross-org forks.

**Verify:** CI install step resolves `@hebbian/dna` from registry without git URL in lockfile.

## Rollback

Keep git tags on `hebbian/hebbian-dna` — consumers can revert to:

```json
"github:hebbian/hebbian-dna#v0.1.3"
```

until registry is stable.

## Related

- [verification-discipline.md](./verification-discipline.md) — case #4 (403 scope mismatch)
