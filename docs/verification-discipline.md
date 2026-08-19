# Verification discipline

Green CI is not proof. Proof is knowing **what could still be wrong** after CI passes.

During the first `@hebbian/dna` extraction, half the work was fixes; half was discovering checks that were **green by construction** — none caught by re-running the test alone. Each gap was found by reading what the verifier actually asserts (and what it silently skips).

Use this list before declaring an extraction or template "done".

## Pre-ship checklist

For every gate (CI job, Playwright spec, npm script), answer:

1. **Where does the assertion run?** (file path, working directory, registry)
2. **What does it skip?** (early return, optional branch, filter rules)
3. **What would fail if wiring broke but values stayed the same?**
4. **Did we run the gate the same way CI does?** (cwd, env, filter flags)

If any answer is "don't know" — read the script before pushing.

## Cases from DNA v0.1 extraction (2026-08-19)

| # | Symptom | Looked fine because | Found by reading |
|---|---------|---------------------|------------------|
| 1 | `playwright test e2e/foo.spec.ts` → 0 tests | `defineTokenContractTest()` registered tests under `node_modules/@hebbian/dna/...`, not the consumer spec | `playwright test --list` — tests attributed to package path |
| 2 | E2E "passed" with `UPDATE_SNAPSHOTS=1` | Snapshot write path **returns early** — cross-brand assertions and genome-injection probe never ran | Read `runTokenContractTest` after snapshot block |
| 3 | Local egress OK, CI egress **127** | Workflow `defaults.run.working-directory: web` — `npm install` in egress job never installed root `@hebbian/dna` bins | Read CI YAML job defaults vs security job override |
| 4 | `npm publish` / GH Packages **403** | Install from git tag works — masks registry scope mismatch (`@hebbian` ≠ owner `mhellid-rgb`) | Read npm error: "scope does not match" |
| 5 | `npm install` after tag bump — still old package | Lockfile pinned git ref; needed explicit reinstall of git URL | `npm ls @hebbian/dna` + lockfile resolved commit |
| 6 | Template "verified" | `gh repo view` showed `isTemplate: false` while API PATCH returned `is_template: true` | Cross-check API + clone-from-template smoke |

## Habits (binding for DNA consumers)

- **`playwright test --list`** after any shared test helper — confirm tests bind to *your* spec file.
- **Run e2e twice**: once with `UPDATE_SNAPSHOTS=1`, once without — second run must still execute full body.
- **Read CI cwd** for every job that calls npm bins from a git/root dependency.
- **Clone-from-template smoke** — not just the template repo's own CI.
- **Keep a known-green verify repo** (`hebbian-app-template-verify`) until a second real project exists.

## When adding a new check to `@hebbian/dna`

Document in the check's header comment:

- Required cwd
- Exit codes (0 / 1 / 2)
- What file types and paths are **excluded** (egress audit skips `*.test.ts`, non-`*.server.ts` lib, etc.)
- False-negative scenarios (string-built URLs, monorepo wrong root)

A check without documented blind spots will be trusted too early.
